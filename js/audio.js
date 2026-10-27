/**
 * Procedural Web Audio Engine for 2D Hill Climb Game
 * Fully self-contained synthesis for engine sounds, tire squeals,
 * coin pickups, crashes, and fuel alerts without any external audio files.
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;

    // Engine sound nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineNoise = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.noiseGain = null;

    // Skid sound nodes
    this.skidGain = null;
    this.skidFilter = null;

    // Coin combo tracking for musical chimes
    this.lastCoinTime = 0;
    this.coinStreak = 0;

    // Master volume
    this.masterGain = null;

    // Load mute preference
    const savedMute = localStorage.getItem('hcr_muted');
    if (savedMute !== null) {
      this.muted = savedMute === 'true';
    }
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.85;
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.setupSkidSynth();
      this.initialized = true;
    } catch (e) {
      console.warn("AudioContext failed to initialize:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('hcr_muted', this.muted);
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  // --- Procedural Engine Sound ---
  setupEngineSynth() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Low rumble sawtooth
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(35, now);

    // Harmonic square wave for combustion pop
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(70, now);

    // Engine lowpass filter (RPM opens the filter)
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(220, now);
    this.engineFilter.Q.setValueAtTime(3.5, now);

    // Engine gain
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, now);

    // Connect oscillators
    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  setupSkidSynth() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.setValueAtTime(950, this.ctx.currentTime);
    this.skidFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.masterGain);

    whiteNoise.start();
  }

  /**
   * Updates dynamic engine throttle and RPM pitch
   * @param {number} rpm - 0 to 1
   * @param {boolean} throttleActive - whether gas is being held
   * @param {boolean} isRunning - whether engine is active
   */
  updateEngine(rpm, throttleActive, isRunning) {
    if (!this.initialized || !this.ctx || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    if (!isRunning) {
      this.engineGain.gain.setTargetAtTime(0, t, 0.1);
      return;
    }

    // Base pitch depends on RPM: 35Hz at idle up to 130Hz at redline
    const targetFreq1 = 35 + rpm * 95;
    const targetFreq2 = targetFreq1 * 1.5;
    const filterFreq = 180 + rpm * 700 + (throttleActive ? 250 : 0);
    const volume = 0.22 + (throttleActive ? 0.20 : 0.05) + rpm * 0.15;

    this.engineOsc1.frequency.setTargetAtTime(targetFreq1, t, 0.06);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq2, t, 0.06);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.07);
    this.engineGain.gain.setTargetAtTime(volume, t, 0.05);
  }

  updateSkid(intensity) {
    if (!this.initialized || !this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const targetGain = Math.min(0.25, intensity * 0.25);
    this.skidGain.gain.setTargetAtTime(targetGain, t, 0.05);
  }

  // --- Sound Effects ---

  /** Play coin pickup chime with ascending scale for streaks */
  playCoin() {
    if (!this.initialized || !this.ctx || this.muted) return;
    this.resume();

    const now = Date.now();
    if (now - this.lastCoinTime < 650) {
      this.coinStreak = Math.min(8, this.coinStreak + 1);
    } else {
      this.coinStreak = 0;
    }
    this.lastCoinTime = now;

    // Pentatonic scale frequencies: C5, D5, E5, G5, A5, C6, D6, E6, G6
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98];
    const freq = notes[this.coinStreak];

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /** Fuel can pickup - liquid fill chime */
  playFuel() {
    if (!this.initialized || !this.ctx || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    // Two-tone rising chime
    const notes = [329.63, 440, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(0, t + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.3, t + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.25);
    });
  }

  /** Crash sound: bone snap / crunch + low thud */
  playCrash() {
    if (!this.initialized || !this.ctx || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;

    // Low impact boom
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(140, t);
    boomOsc.frequency.exponentialRampToValueAtTime(30, t + 0.4);

    boomGain.gain.setValueAtTime(0.8, t);
    boomGain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomOsc.start(t);
    boomOsc.stop(t + 0.5);

    // Crunch noise
    const bufferSize = this.ctx.sampleRate * 0.25;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(800, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseNode.start(t);
  }

  /** Low fuel beeping alarm */
  playLowFuelBeep() {
    if (!this.initialized || !this.ctx || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** Stunt bonus fanfare (Backflip, Wheelie, Air Time) */
  playFanfare() {
    if (!this.initialized || !this.ctx || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50];
    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0, t + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.25, t + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.4);
    });
  }

  /** Car horn */
  playHorn() {
    if (!this.initialized || !this.ctx || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(415.3, t); // G#4
    osc2.frequency.setValueAtTime(523.25, t); // C5

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.35);
    osc2.stop(t + 0.35);
  }

  /** Click sound for UI buttons */
  playClick() {
    if (!this.initialized || !this.ctx || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /** Upgrade purchase cash register chime */
  playUpgrade() {
    if (!this.initialized || !this.ctx || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, t); // B5
    osc.frequency.setValueAtTime(1318.51, t + 0.07); // E6

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.3);
  }
}

window.soundManager = new SoundManager();
