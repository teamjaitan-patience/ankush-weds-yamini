/**
 * Firebase Firestore Configuration & Wishes Service
 * Real-time guestbook sync with Approval Moderation & Email Notifications
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  doc,
  limit
} from 'firebase/firestore';

// Production Firebase configuration for Ankush & Yamini
const firebaseConfig = {
  apiKey: "AIzaSyCrMUSxzwf1zqbBVtZc4Elzh6IM-gjC18I",
  authDomain: "ankush-weds-yamini.firebaseapp.com",
  projectId: "ankush-weds-yamini",
  storageBucket: "ankush-weds-yamini.firebasestorage.app",
  messagingSenderId: "427375918403",
  appId: "1:427375918403:web:5889cc23220628f25ac3f6",
  measurementId: "G-R3V0PGGWXK"
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('REPLACE_WITH') &&
  firebaseConfig.projectId
);

let db = null;
if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
  } catch (err) {
    console.warn('[Firebase] Initialization error, falling back to local mode:', err);
  }
}

/**
 * Public listener: Only receives APPROVED wishes
 * @param {Function} onUpdate Callback (approvedWishesArray) => void
 * @param {Function} onError Callback on failure
 */
export function subscribeToWishes(onUpdate, onError) {
  if (!isFirebaseConfigured || !db) {
    const stored = getLocalWishes().filter((w) => w.status === 'approved');
    onUpdate(stored);
    return () => {};
  }

  const wishesRef = collection(db, 'wishes');
  // Only fetch wishes approved by the couple!
  const q = query(
    wishesRef,
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
    limit(200)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const wishes = snapshot.docs.map((d) => mapDocToWish(d));
      onUpdate(wishes);
    },
    (err) => {
      console.warn('[Firebase] Firestore public listener error:', err);
      if (onError) onError(err);
      onUpdate([]);
    }
  );
}

/**
 * Admin listener: Receives PENDING wishes awaiting review
 * @param {Function} onUpdate Callback (pendingWishesArray) => void
 * @param {Function} onError Callback on failure
 */
export function subscribeToPendingWishes(onUpdate, onError) {
  if (!isFirebaseConfigured || !db) {
    const stored = getLocalWishes().filter((w) => w.status === 'pending');
    onUpdate(stored);
    return () => {};
  }

  const wishesRef = collection(db, 'wishes');
  const q = query(
    wishesRef,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const wishes = snapshot.docs.map((d) => mapDocToWish(d));
      onUpdate(wishes);
    },
    (err) => {
      console.warn('[Firebase] Firestore pending listener error:', err);
      if (onError) onError(err);
      onUpdate([]);
    }
  );
}

/**
 * Admin listener: Receives already APPROVED wishes for unpublishing/moderation
 * @param {Function} onUpdate Callback (approvedWishesArray) => void
 */
export function subscribeToApprovedWishes(onUpdate, onError) {
  return subscribeToWishes(onUpdate, onError);
}

/**
 * Submit a new wish (enters 'pending' state awaiting couple's approval)
 * @param {Object} param0 { author: string, message: string }
 */
export async function submitWish({ author, message }) {
  const cleanAuthor = String(author || '').trim();
  const cleanMessage = String(message || '').trim();

  if (!cleanAuthor || !cleanMessage) {
    throw new Error('Please provide both your name and wish.');
  }

  let newDocId = 'local_' + Date.now();

  if (isFirebaseConfigured && db) {
    const wishesRef = collection(db, 'wishes');
    const docRef = await addDoc(wishesRef, {
      author: cleanAuthor,
      message: cleanMessage,
      status: 'pending', // Requires review before appearing publicly
      createdAt: serverTimestamp()
    });
    newDocId = docRef.id;
  } else {
    const current = getLocalWishes();
    current.unshift({
      id: newDocId,
      author: cleanAuthor,
      message: cleanMessage,
      status: 'pending',
      time: 'Just now',
      timestamp: Date.now()
    });
    saveLocalWishes(current);
  }

  // Trigger non-blocking email notification to admin
  sendAdminEmailNotification({
    author: cleanAuthor,
    message: cleanMessage,
    id: newDocId
  }).catch((err) => console.warn('Email notification skipped:', err));

  return { id: newDocId, author: cleanAuthor, message: cleanMessage, status: 'pending' };
}

/**
 * Approve a wish (makes it live on the public website)
 * @param {string} wishId
 */
export async function approveWish(wishId) {
  if (isFirebaseConfigured && db && !wishId.startsWith('local_')) {
    await updateDoc(doc(db, 'wishes', wishId), {
      status: 'approved',
      approvedAt: serverTimestamp()
    });
  } else {
    const current = getLocalWishes();
    const target = current.find((w) => w.id === wishId);
    if (target) target.status = 'approved';
    saveLocalWishes(current);
  }
}

/**
 * Reject or permanently delete a wish
 * @param {string} wishId
 */
export async function deleteWish(wishId) {
  if (isFirebaseConfigured && db && !wishId.startsWith('local_')) {
    await deleteDoc(doc(db, 'wishes', wishId));
  } else {
    const current = getLocalWishes().filter((w) => w.id !== wishId);
    saveLocalWishes(current);
  }
}

/**
 * Sends an email notification to the couple with 1-click review link
 */
async function sendAdminEmailNotification({ author, message, id }) {
  const reviewUrl = 'https://ankush-weds-yamini.web.app/?review=true';
  const payload = {
    _subject: `💌 New Wedding Blessing from ${author} awaiting your review!`,
    Guest_Name: author,
    Heartfelt_Message: message,
    Status: 'Pending Review',
    Review_and_Approve_Link: reviewUrl,
    _replyto: 'noreply@ankush-weds-yamini.web.app'
  };

  try {
    // Send via FormSubmit service directly to teamjaitan@gmail.com
    await fetch('https://formsubmit.co/ajax/teamjaitan@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('FormSubmit notification error (non-fatal):', err);
  }
}

/* ---------------- Helper functions ---------------- */
function mapDocToWish(d) {
  const data = d.data();
  let timeStr = 'Just now';
  if (data.createdAt && typeof data.createdAt.toDate === 'function') {
    const date = data.createdAt.toDate();
    timeStr = formatWishTime(date);
  } else if (data.time) {
    timeStr = data.time;
  }

  return {
    id: d.id,
    author: data.author || 'Well-wisher',
    message: data.message || '',
    status: data.status || 'pending',
    time: timeStr,
    timestamp: data.createdAt ? data.createdAt.toMillis?.() || Date.now() : Date.now()
  };
}

function getLocalWishes() {
  try {
    const stored = localStorage.getItem('ay_wedding_wishes');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalWishes(wishes) {
  try {
    localStorage.setItem('ay_wedding_wishes', JSON.stringify(wishes));
  } catch (e) {}
}

function formatWishTime(date) {
  try {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 2) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  } catch (e) {
    return 'Recently';
  }
}
