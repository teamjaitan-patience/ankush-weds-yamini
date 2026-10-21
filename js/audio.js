/**
 * Wedding Background Music Controller
 * Song: "Ranjheya Ve" by Zain Zohaib
 */

class WeddingSongAudio {
  constructor(audioSrc) {
    this.src = audioSrc;
    this.audio = new Audio(this.src);
    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.targetVolume = 0.7;
    this.audio.volume = this.targetVolume;
    this.isPlaying = false;
    this.fadeInterval = null;

    // Synchronize UI on native media events
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updateUI(true);
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
        if (this.isPlaying) {
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

  play() {
    this.isPlaying = true;
    this.updateUI(true);

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.updateUI(true);
        })
        .catch((err) => {
          console.warn('Audio playback deferred/blocked by browser policy:', err?.message || err);
          this.isPlaying = false;
          this.updateUI(false);

          // Retry on next user gesture if blocked by autoplay policy
          const playOnGesture = () => {
            this.audio.play().then(() => {
              this.isPlaying = true;
              this.updateUI(true);
            }).catch(() => {});
            window.removeEventListener('click', playOnGesture);
            window.removeEventListener('touchstart', playOnGesture);
          };
          window.addEventListener('click', playOnGesture, { once: true });
          window.addEventListener('touchstart', playOnGesture, { once: true, passive: true });
        });
    }
    return true;
  }

  pause() {
    clearInterval(this.fadeInterval);
    this.audio.pause();
    this.isPlaying = false;
    this.updateUI(false);
    return false;
  }

  toggle() {
    // Check real native state of the audio element
    if (!this.audio.paused && this.isPlaying) {
      return this.pause();
    } else {
      return this.play();
    }
  }
}

window.weddingAudio = new WeddingSongAudio('assets/ranjheya-ve.mp3');
