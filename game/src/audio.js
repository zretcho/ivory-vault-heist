// All sound is synthesized with WebAudio: no audio files, no network.
// Footsteps tick as the thief moves, a coin clinks when it lands, a camera
// beeps the moment it spots the thief, a siren swells while the alarm is
// high, and the getaway ends in a short chime — or a low sting when the
// run is caught. M mutes everything.

/** Build the sound effects; safe to call before any user gesture. */
export function createAudio() {
  let ctx = null;
  let muted = false;
  let sirenNodes = null;

  function context() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, seconds, type, gain, when = 0, slideTo = null) {
    const ac = context();
    if (!ac || muted) return;
    try {
      if (ac.state === 'suspended') void ac.resume();
      const t0 = ac.currentTime + when;
      const osc = ac.createOscillator();
      const amp = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
      amp.gain.setValueAtTime(0, t0);
      amp.gain.linearRampToValueAtTime(gain, t0 + 0.01);
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
      osc.connect(amp);
      amp.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + seconds + 0.05);
    } catch {
      // Sound is garnish: a failure here never stops the game.
    }
  }

  function noise(seconds, gain, lowpass = 1200) {
    const ac = context();
    if (!ac || muted) return;
    try {
      if (ac.state === 'suspended') void ac.resume();
      const length = Math.max(1, Math.floor(ac.sampleRate * seconds));
      const buffer = ac.createBuffer(1, length, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ac.createBufferSource();
      source.buffer = buffer;
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const amp = ac.createGain();
      amp.gain.value = gain;
      source.connect(filter);
      filter.connect(amp);
      amp.connect(ac.destination);
      source.start();
    } catch {
      // Sound is garnish: a failure here never stops the game.
    }
  }

  return {
    /** Muted or not. */
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopSiren();
      return muted;
    },
    /** Play one named cue. */
    play(name) {
      if (muted) return;
      switch (name) {
        case 'step':
          noise(0.05, 0.08, 900);
          break;
        case 'step-quiet':
          noise(0.04, 0.03, 700);
          break;
        case 'coin-throw':
          tone(1400, 0.08, 'sine', 0.08, 0, 900);
          break;
        case 'coin-land':
          tone(2093, 0.12, 'sine', 0.12);
          tone(2637, 0.16, 'sine', 0.09, 0.07);
          break;
        case 'coin-heard':
          tone(660, 0.1, 'triangle', 0.07);
          break;
        case 'suspicious':
          tone(392, 0.18, 'triangle', 0.12, 0, 311);
          break;
        case 'camera-spot':
          tone(880, 0.09, 'square', 0.05);
          tone(880, 0.09, 'square', 0.05, 0.12);
          break;
        case 'smoke':
          noise(0.4, 0.12, 500);
          break;
        case 'gold':
          tone(1568, 0.1, 'sine', 0.1);
          tone(2093, 0.18, 'sine', 0.1, 0.08);
          break;
        case 'star':
          tone(1047, 0.14, 'sine', 0.12);
          tone(1319, 0.14, 'sine', 0.12, 0.1);
          tone(1568, 0.3, 'sine', 0.12, 0.2);
          break;
        case 'escape':
          [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'sine', 0.12, i * 0.11));
          break;
        case 'caught':
          tone(220, 0.5, 'sawtooth', 0.14, 0, 110);
          tone(165, 0.7, 'sawtooth', 0.1, 0.15, 82);
          break;
        default:
          break;
      }
    },
    /** A two-tone siren while the alarm is high; call every frame. */
    siren(on) {
      const ac = context();
      if (!ac || muted) {
        this.stopSiren();
        return;
      }
      if (on && !sirenNodes) {
        try {
          if (ac.state === 'suspended') void ac.resume();
          const osc = ac.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = 620;
          const lfo = ac.createOscillator();
          lfo.type = 'sine';
          lfo.frequency.value = 1.6;
          const lfoGain = ac.createGain();
          lfoGain.gain.value = 180;
          const amp = ac.createGain();
          amp.gain.value = 0.035;
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          osc.connect(amp);
          amp.connect(ac.destination);
          osc.start();
          lfo.start();
          sirenNodes = { osc, lfo, amp };
        } catch {
          sirenNodes = null;
        }
      } else if (!on && sirenNodes) {
        this.stopSiren();
      }
    },
    stopSiren() {
      if (!sirenNodes) return;
      try {
        sirenNodes.amp.gain.setTargetAtTime(0, sirenNodes.osc.context.currentTime, 0.05);
        const nodes = sirenNodes;
        window.setTimeout(() => {
          try {
            nodes.osc.stop();
            nodes.lfo.stop();
          } catch {
            // Already stopped.
          }
        }, 300);
      } catch {
        // Already stopped.
      }
      sirenNodes = null;
    },
  };
}
