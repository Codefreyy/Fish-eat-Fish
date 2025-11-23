
export class SoundManager {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmNodes: AudioScheduledSourceNode[] = [];
  private isBgmPlaying: boolean = false;

  public isBgmEnabled: boolean = true;
  public isSfxEnabled: boolean = true;

  constructor() {
    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.connect(this.ctx.destination);
      this.bgmGain.gain.value = 0.15; // Ambient level

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.sfxGain.gain.value = 0.3; // FX level
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  public async init() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.updateMuteState();
  }

  public setBgmEnabled(enabled: boolean) {
    this.isBgmEnabled = enabled;
    this.updateMuteState();
    if (enabled && !this.isBgmPlaying) {
      this.startBgm();
    } else if (!enabled) {
      this.stopBgm();
    }
  }

  public setSfxEnabled(enabled: boolean) {
    this.isSfxEnabled = enabled;
    this.updateMuteState();
  }

  private updateMuteState() {
    if (!this.bgmGain || !this.sfxGain || !this.ctx) return;
    
    // Smooth transition
    const now = this.ctx.currentTime;
    this.bgmGain.gain.setTargetAtTime(this.isBgmEnabled ? 0.15 : 0, now, 0.1);
    this.sfxGain.gain.setTargetAtTime(this.isSfxEnabled ? 0.3 : 0, now, 0.1);
  }

  // --- BGM: Underwater Ambience ---
  // Uses Pink Noise + Lowpass Filter to simulate deep ocean rumble
  public startBgm() {
    if (!this.ctx || !this.bgmGain || this.isBgmPlaying) return;
    this.isBgmPlaying = true;

    // Create Pink Noise buffer
    const bufferSize = 4 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; 
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    // Filter to make it sound underwater (muffled)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400; 

    // Add gentle modulation to filter to simulate waves
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15; // Slow wave
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 150; // Modulate frequency by +/- 150Hz

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(this.bgmGain);

    noise.start();
    lfo.start();

    this.bgmNodes = [noise, lfo];
  }

  public stopBgm() {
    this.bgmNodes.forEach(node => node.stop());
    this.bgmNodes = [];
    this.isBgmPlaying = false;
  }

  // --- SFX ---

  public playEat() {
    if (!this.ctx || !this.sfxGain || !this.isSfxEnabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.sfxGain);

    // "Bloop" sound: Sine wave with quick pitch bend up
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playGameOver() {
    if (!this.ctx || !this.sfxGain || !this.isSfxEnabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.sfxGain);

    // Low sad drone
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 1.5);

    gain.gain.setValueAtTime(1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }

  public playClick() {
    if (!this.ctx || !this.sfxGain || !this.isSfxEnabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.sfxGain);

    // High tick
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
}