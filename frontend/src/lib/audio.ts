'use client';

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmOscillator: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;

  constructor() {
    // Initialize lazily to prevent autoplay warning
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      type AudioContextConstructor = typeof AudioContext;
      const AudioContextClass: AudioContextConstructor | undefined =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.bgmGain) {
      this.bgmGain.gain.value = muted ? 0 : 0.05;
    }
  }

  public initContext() {
    const ctx = this.getContext();
    if (ctx?.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  public playClick() {
    this.playTone(600, 'sine', 0.05, 0.1);
  }

  public playDiceRoll() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    
    // Simulate dice clatter with quick noise bursts
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playTone(150 + Math.random() * 50, 'square', 0.05, 0.1);
      }, i * 60);
    }
  }

  public playTokenMove() {
    this.playTone(400, 'triangle', 0.1, 0.2);
  }

  public playKill() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  public playHomeEnter() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    
    setTimeout(() => this.playTone(400, 'sine', 0.1, 0.1), 0);
    setTimeout(() => this.playTone(600, 'sine', 0.1, 0.1), 100);
    setTimeout(() => this.playTone(800, 'sine', 0.2, 0.1), 200);
  }

  public playVictory() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'square', 0.3, 0.1);
      }, i * 150);
    });
  }

  public toggleBGM(play: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;

    if (play && !this.bgmOscillator && !this.isMuted) {
      this.bgmOscillator = ctx.createOscillator();
      this.bgmGain = ctx.createGain();
      
      this.bgmOscillator.type = 'sine';
      // Low pulsing drone
      this.bgmOscillator.frequency.value = 60;
      
      // LFO for volume pulsing
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.5; // 0.5 Hz
      
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.02;
      
      lfo.connect(lfoGain);
      lfoGain.connect(this.bgmGain.gain);
      
      this.bgmGain.gain.value = 0.05;
      
      this.bgmOscillator.connect(this.bgmGain);
      this.bgmGain.connect(ctx.destination);
      
      this.bgmOscillator.start();
      lfo.start();
    } else if (!play && this.bgmOscillator) {
      this.bgmOscillator.stop();
      this.bgmOscillator.disconnect();
      this.bgmGain?.disconnect();
      this.bgmOscillator = null;
      this.bgmGain = null;
    }
  }
}

export const audioManager = new SoundManager();
