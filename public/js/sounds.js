'use strict';

(function initSounds() {
  let audioContext = null;

  function getContext() {
    if (!audioContext) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) {
        return null;
      }
      audioContext = new Context();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }

    return audioContext;
  }

  function playTone({ frequency, duration, type = 'sine', gain = 0.06, sweepTo = null }) {
    const context = getContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const osc = context.createOscillator();
    const amp = context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (sweepTo !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), now + duration);
    }

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(amp);
    amp.connect(context.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playClickSound() {
    playTone({ frequency: 680, duration: 0.08, type: 'triangle', gain: 0.045, sweepTo: 820 });
  }

  function playRemoveSound() {
    playTone({ frequency: 300, duration: 0.18, type: 'sawtooth', gain: 0.05, sweepTo: 110 });
  }

  function playVictorySound() {
    const context = getContext();
    if (!context) {
      return;
    }

    const steps = [392, 523.25, 659.25, 783.99];
    steps.forEach((freq, index) => {
      window.setTimeout(() => {
        playTone({ frequency: freq, duration: 0.16, type: 'triangle', gain: 0.06, sweepTo: freq * 1.05 });
      }, index * 110);
    });
  }

  function playDefeatSound() {
    const steps = [392, 329.63, 261.63, 196];
    steps.forEach((freq, index) => {
      window.setTimeout(() => {
        playTone({ frequency: freq, duration: 0.15, type: 'sine', gain: 0.05, sweepTo: Math.max(60, freq * 0.88) });
      }, index * 120);
    });
  }

  function playAISound() {
    playTone({ frequency: 740, duration: 0.11, type: 'square', gain: 0.04, sweepTo: 700 });
  }

  window.NimSounds = {
    playClickSound,
    playRemoveSound,
    playVictorySound,
    playDefeatSound,
    playAISound,
  };
})();
