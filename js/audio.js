/**
 * Wedding Background Music Controller
 * Song: "Ranjheya Ve" by Zain Zohaib
 */
import audioUrl from '../assets/ranjheya-ve.mp3';

class WeddingSongAudio {
  constructor(audioSrc) {
    this.src = audioSrc;
    this.audio = new Audio(this.src);
    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.targetVolume = 0.7;
    this.audio.volume = this.targetVolume;
    this.isPlaying = false;
    this.userExplicitlyPaused = false;
    this.fadeInterval = null;
    this._gestureHandler = null;

    // Synchronize UI on native media events
    this.audio.addEventListener('play', () => {
      if (!this.userExplicitlyPaused) {
        this.isPlaying = true;
        this.updateUI(true);
      }
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updateUI(false);
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.updateUI(false);
    });

    // Fallback if URL encoding differs
    this.audio.addEventListener('error', () => {
      if (this.audio.src.includes('ranjheya-ve.mp3')) {
        this.audio.src = 'assets/Ranjheya Ve Zain Zohaib Yratta media.mp3';
        this.audio.load();
        if (this.isPlaying && !this.userExplicitlyPaused) {
          this.audio.play().catch(() => {});
        }
      }
    });
  }

  updateUI(playing) {
    const musicBtn = document.getElementById('music-toggle-btn');
    if (!musicBtn) return;
    musicBtn.setAttribute('aria-pressed', String(playing));
    musicBtn.innerHTML = playing ? '<span>⏸</span>' : '<span>▶</span>';
    musicBtn.setAttribute('aria-label', playing ? 'Pause background music' : 'Play background music');
    if (playing) {
      musicBtn.classList.add('is-playing');
    } else {
      musicBtn.classList.remove('is-playing');
    }
  }

  cleanupGestureListeners() {
    if (this._gestureHandler) {
      window.removeEventListener('click', this._gestureHandler, true);
      window.removeEventListener('touchend', this._gestureHandler, true);
      this._gestureHandler = null;
    }
  }

  attachGestureListener() {
    this.cleanupGestureListeners();
    this._gestureHandler = (e) => {
      // Don't auto-resume if the user interacted directly with the music toggle button
      if (e?.target && e.target.closest && e.target.closest('#music-toggle-btn')) {
        return;
      }
      this.cleanupGestureListeners();
      if (!this.userExplicitlyPaused) {
        this.play();
      }
    };
    window.addEventListener('click', this._gestureHandler, { once: true, capture: true });
    window.addEventListener('touchend', this._gestureHandler, { once: true, capture: true });
  }

  play() {
    this.userExplicitlyPaused = false;
    this.cleanupGestureListeners();
    this.isPlaying = true;
    this.updateUI(true);

    try {
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (this.userExplicitlyPaused) {
              // User pressed pause while play promise was resolving
              this.audio.pause();
              this.isPlaying = false;
              this.updateUI(false);
            } else {
              this.isPlaying = true;
              this.updateUI(true);
            }
          })
          .catch((err) => {
            // If user paused or paused during resolution, AbortError is normal
            if (err?.name === 'AbortError' || this.userExplicitlyPaused) {
              this.isPlaying = false;
              this.updateUI(false);
              return;
            }

            console.warn('Audio playback deferred/blocked by browser policy:', err?.message || err);
            this.isPlaying = false;
            this.updateUI(false);

            // Only retry on next user gesture if user did NOT explicitly pause
            if (!this.userExplicitlyPaused) {
              this.attachGestureListener();
            }
          });
      }
    } catch (err) {
      console.warn('Synchronous error on audio.play():', err);
      this.isPlaying = false;
      this.updateUI(false);
    }
    return true;
  }

  pause() {
    this.userExplicitlyPaused = true;
    this.cleanupGestureListeners();
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    try {
      this.audio.pause();
    } catch (err) {
      console.warn('Audio pause error:', err);
    }
    this.isPlaying = false;
    this.updateUI(false);
    return false;
  }

  toggle() {
    if (!this.audio) return false;
    // Check both native audio element paused status and internal playing flag
    const isCurrentlyPlaying = !this.audio.paused || this.isPlaying;
    if (isCurrentlyPlaying) {
      return this.pause();
    } else {
      return this.play();
    }
  }
}

window.weddingAudio = new WeddingSongAudio(audioUrl || 'assets/ranjheya-ve.mp3');
