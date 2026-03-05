'use strict';

(function initBackgroundParticles() {
  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createParticles() {
    const container = document.createElement('div');
    container.className = 'bg-particles';

    for (let i = 0; i < 50; i += 1) {
      const particle = document.createElement('span');
      particle.className = 'bg-particle';

      const size = randomBetween(2, 6);
      const opacity = randomBetween(0.1, 0.3);
      const x = randomBetween(0, 100);
      const y = randomBetween(0, 100);
      const drift = randomBetween(-45, 45);
      const duration = randomBetween(15, 45);
      const delay = randomBetween(-duration, 0);
      const hue = Math.random() > 0.5 ? 'rgba(80, 246, 238, OPACITY)' : 'rgba(43, 209, 214, OPACITY)';

      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${x}%`;
      particle.style.top = `${y}%`;
      particle.style.opacity = String(opacity);
      particle.style.setProperty('--drift', `${drift}px`);
      particle.style.animationDuration = `${duration}s`;
      particle.style.animationDelay = `${delay}s`;
      particle.style.background = hue.replace('OPACITY', String(opacity));

      container.appendChild(particle);
    }

    document.body.prepend(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createParticles, { once: true });
  } else {
    createParticles();
  }
})();
