class AudioManager {
  private ctx: AudioContext | null = null;
  public sfxVolume: number = 0.5;
  public bgmVolume: number = 0.3;
  private bgmAudio: HTMLAudioElement | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBidSound() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.1); // A6
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.6, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playTickSound() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(this.sfxVolume * 0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playWinSound() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    
    // Ascending arpeggio for positive dopamine
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const time = this.ctx.currentTime;
    
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, time + i * 0.1);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.5, time + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.1 + 0.3);
      
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      
      osc.start(time + i * 0.1);
      osc.stop(time + i * 0.1 + 0.3);
    });
  }

  playPassSound() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    
    // Gentle downward blip
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.3, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playRevealSound() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    
    // Dramatic swell
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc2.type = 'square';
    
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.4);
    
    osc2.frequency.setValueAtTime(204, this.ctx.currentTime); // Slight detune
    osc2.frequency.exponentialRampToValueAtTime(816, this.ctx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.4, this.ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
    
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc2.start();
    osc.stop(this.ctx.currentTime + 0.6);
    osc2.stop(this.ctx.currentTime + 0.6);
  }

  playRouletteSpinSound() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    
    // Quick mechanical tick
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(this.sfxVolume * 0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playRouletteLockSound() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    
    // Heavy chunk / ding!
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(this.sfxVolume * 0.7, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playJackpotSound() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    
    // Series of bright chimes!
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    const time = this.ctx.currentTime;
    
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, time + i * 0.08);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.5, time + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.08 + 0.5);
      
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      
      osc.start(time + i * 0.08);
      osc.stop(time + i * 0.08 + 0.5);
    });
  }

  playUIClick() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(this.sfxVolume * 0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playAllInSound() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc2.type = 'sawtooth';
    
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
    
    osc2.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(this.sfxVolume * 0.7, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc2.start();
    osc.stop(this.ctx.currentTime + 0.4);
    osc2.stop(this.ctx.currentTime + 0.4);
  }

  playStartGameSound() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.5, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playSuccessChime() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(this.sfxVolume * 0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playBGM() {
    if (!this.bgmAudio) {
      // Standard trainer battle theme!
      this.bgmAudio = new Audio('https://play.pokemonshowdown.com/audio/dpp-trainer.mp3');
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = this.bgmVolume;
    }
    
    // Ensure we trigger it correctly and handle promise
    this.bgmAudio.play().then(() => {
      console.log('BGM playing successfully');
    }).catch(e => {
      console.warn('BGM Autoplay prevented, waiting for further interaction:', e);
      // Fallback: attach a one-time global click listener to force play
      const forcePlay = () => {
        this.bgmAudio?.play();
        window.removeEventListener('click', forcePlay);
      };
      window.addEventListener('click', forcePlay);
    });
  }

  stopBGM() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
  }

  playGameOverSound() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    
    // Triumphant fanfare
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const time = this.ctx.currentTime;
    
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const isLast = i === notes.length - 1;
      const duration = isLast ? 1.5 : 0.15;
      
      gain.gain.setValueAtTime(0, time + i * 0.15);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.6, time + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.15 + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      
      osc.start(time + i * 0.15);
      osc.stop(time + i * 0.15 + duration);
    });
  }

  setBGMVolume(val: number) {
    this.bgmVolume = val;
    if (this.bgmAudio) {
      this.bgmAudio.volume = val;
    }
  }

  setSFXVolume(val: number) {
    this.sfxVolume = val;
  }
}

export const audio = new AudioManager();
