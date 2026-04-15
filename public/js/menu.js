'use strict';

const pvpCard = document.getElementById('pvpCard');
const pveCard = document.getElementById('pveCard');
const tutorialCard = document.getElementById('tutorialCard');
const statsCard = document.getElementById('statsCard');

const difficultyPanel = document.getElementById('difficultyPanel');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');

const heapPresetBox = document.getElementById('heapPresetCustom');
const customHeapWrap = document.getElementById('customHeapWrap');
const customHeaps = document.getElementById('customHeaps');

function getSelectedPreset() {
  const selected = heapPresetBox.querySelector('.term-opt.selected');
  return selected ? selected.dataset.value : '1,3,5,7';
}

function parseHeaps() {
  const preset = getSelectedPreset();

  if (preset !== 'custom') {
    return preset;
  }

  const raw = customHeaps.value.trim();
  if (!raw) {
    return null;
  }

  const values = raw
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (values.length === 0) {
    return null;
  }

  return values.join(',');
}

function buildGameUrl(mode, difficulty) {
  const heaps = parseHeaps();
  if (!heaps) {
    window.alert('Please enter valid heap sizes (positive integers) for custom configuration.');
    return null;
  }

  const params = new URLSearchParams();
  params.set('mode', mode);
  params.set('heaps', heaps);

  if (difficulty) {
    params.set('difficulty', difficulty);
  }

  return `game.html?${params.toString()}`;
}

function goTo(url) {
  if (url) {
    window.location.href = url;
  }
}

function onCardActivate(element, handler) {
  element.addEventListener('click', handler);
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler();
    }
  });
}

heapPresetBox.addEventListener('preset-change', (e) => {
  const isCustom = e.detail === 'custom';
  customHeapWrap.hidden = !isCustom;
  if (isCustom) {
    customHeaps.focus();
  }
});

onCardActivate(pvpCard, () => {
  goTo(buildGameUrl('pvp'));
});

onCardActivate(pveCard, () => {
  difficultyPanel.hidden = !difficultyPanel.hidden;
});

onCardActivate(tutorialCard, () => {
  window.location.href = 'tutorial.html';
});

onCardActivate(statsCard, () => {
  window.location.href = 'stats.html';
});

difficultyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const difficulty = button.dataset.difficulty;
    goTo(buildGameUrl('pve', difficulty));
  });
});
