/**
 * Firebase Firestore Configuration & Wishes Service
 * Real-time guestbook sync for Ankush & Yamini's Wedding
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  limit
} from 'firebase/firestore';

// Default / fallback configuration (can be updated via environment variables or directly)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "REPLACE_WITH_YOUR_FIREBASE_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ankush-yamini.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ankush-yamini",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ankush-yamini.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:000000000000"
};

// Check if Firebase has been configured with real credentials
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('REPLACE_WITH') &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes('REPLACE_WITH')
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
 * Real-time listener for wishes
 * @param {Function} onUpdate Callback when wishes change: (wishesArray) => void
 * @param {Function} onError Callback on failure
 * @returns {Function} Unsubscribe function
 */
export function subscribeToWishes(onUpdate, onError) {
  if (!isFirebaseConfigured || !db) {
    // Local / Offline fallback mode
    const stored = getLocalWishes();
    onUpdate(stored);
    const handler = (e) => {
      if (e.key === 'ay_wedding_wishes') {
        onUpdate(getLocalWishes());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  const wishesRef = collection(db, 'wishes');
  const q = query(wishesRef, orderBy('createdAt', 'desc'), limit(200));

  return onSnapshot(
    q,
    (snapshot) => {
      const wishes = snapshot.docs.map((d) => {
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
          time: timeStr,
          timestamp: data.createdAt ? data.createdAt.toMillis?.() || Date.now() : Date.now()
        };
      });
      onUpdate(wishes);
    },
    (err) => {
      console.warn('[Firebase] Firestore listen error:', err);
      if (onError) onError(err);
      // Graceful fallback to local
      onUpdate(getLocalWishes());
    }
  );
}

/**
 * Submit a new wish
 * @param {Object} param0 { author: string, message: string }
 */
export async function submitWish({ author, message }) {
  const cleanAuthor = String(author || '').trim();
  const cleanMessage = String(message || '').trim();

  if (!cleanAuthor || !cleanMessage) {
    throw new Error('Please provide both your name and wish.');
  }

  if (isFirebaseConfigured && db) {
    const wishesRef = collection(db, 'wishes');
    const docRef = await addDoc(wishesRef, {
      author: cleanAuthor,
      message: cleanMessage,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, author: cleanAuthor, message: cleanMessage };
  } else {
    // Save to local storage
    const current = getLocalWishes();
    const newWish = {
      id: 'local_' + Date.now(),
      author: cleanAuthor,
      message: cleanMessage,
      time: 'Just now',
      timestamp: Date.now()
    };
    current.unshift(newWish);
    saveLocalWishes(current);
    return newWish;
  }
}

/**
 * Delete a wish by ID (Admin / Console)
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

/* ---------------- Helper functions ---------------- */
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
