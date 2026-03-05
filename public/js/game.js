'use strict';

const params = new URLSearchParams(window.location.search);

const mode = (params.get('mode') || 'pvp').toLowerCase();
const difficulty = (params.get('difficulty') || 'easy').toLowerCase();
const startingHeaps = parseHeaps(params.get('heaps'));

const modeText = document.getElementById('modeText');
const difficultyText = document.getElementById('difficultyText');
const moveCounter = document.getElementById('moveCounter');
const turnBanner = document.getElementById('turnBanner');
const gameBoard = document.getElementById('gameBoard');
const moveHistory = document.getElementById('moveHistory');

const backToMenuBtn = document.getElementById('backToMenuBtn');
const undoBtn = document.getElementById('undoBtn');
const hintBtn = document.getElementById('hintBtn');
const newGameBtn = document.getElementById('newGameBtn');
const confirmMoveBtn = document.getElementById('confirmMoveBtn');

const timerEnabledInput = document.getElementById('timerEnabledInput');
const turnTimerBar = document.getElementById('turnTimerBar');
const turnTimerText = document.getElementById('turnTimerText');

const toast = document.getElementById('toast');

const gameOverOverlay = document.getElementById('gameOverOverlay');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverText = document.getElementById('gameOverText');
const playAgainBtn = document.getElementById('playAgainBtn');
const overlayBackBtn = document.getElementById('overlayBackBtn');

const nameModal = document.getElementById('name-modal');
const gameContent = document.getElementById('game-content');
const player1NameLabel = document.getElementById('player1NameLabel');
const player1NameInput = document.getElementById('player1NameInput');
const player2NameWrap = document.getElementById('player2NameWrap');
const player2NameInput = document.getElementById('player2NameInput');
const startMatchBtn = document.getElementById('startMatchBtn');

const sounds = window.NimSounds || {};

const TURN_TIMER_MS = 30000;
const TIMER_PREF_KEY = 'nim.timer.enabled';

const state = {
  started: false,
  gameId: null,
  heaps: [],
  currentPlayer: 'player1',
  gameOver: false,
  winner: null,
  thinking: false,
  busy: false,
  selected: null,
  moveHistory: [],
  endEffectsPlayed: false,
  playerNames: {
    player1: 'Player 1',
    player2: mode === 'pve' ? 'NIM-AI' : 'Player 2',
  },
  performance: {
    humanMoves: 0,
    optimalMoves: 0,
  },
  timer: {
    enabled: window.sessionStorage.getItem(TIMER_PREF_KEY) === '1',
    remainingMs: TURN_TIMER_MS,
    intervalId: null,
  },
};

function parseHeaps(heapsParam) {
  if (!heapsParam) {
    return [1, 3, 5, 7];
  }

  const heaps = heapsParam
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  return heaps.length > 0 ? heaps : [1, 3, 5, 7];
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function nimSum(heaps) {
  return heaps.reduce((xor, heap) => xor ^ heap, 0);
}

function playerLabel(player) {
  return player === 'player2' ? state.playerNames.player2 : state.playerNames.player1;
}

function isHumanPlayer(player) {
  if (mode === 'pve') {
    return player === 'player1';
  }
  return player === 'player1' || player === 'player2';
}

function formatModeLabel(value) {
  return value === 'pve' ? 'Player vs AI' : 'Player vs Player';
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('show');
    window.setTimeout(() => {
      toast.hidden = true;
    }, 260);
  }, 2800);
}

function updateHeader() {
  modeText.textContent = `Mode: ${formatModeLabel(mode)}`;
  difficultyText.textContent = `Difficulty: ${mode === 'pve' ? difficulty : 'N/A'}`;
  moveCounter.textContent = String(state.moveHistory.length);
}

function updateTurnBanner() {
  turnBanner.classList.remove('thinking');

  if (!state.started) {
    turnBanner.textContent = 'Enter names to begin';
    return;
  }

  if (state.gameOver) {
    turnBanner.textContent = `${playerLabel(state.winner)} wins!`;
    return;
  }

  if (state.thinking) {
    turnBanner.classList.add('thinking');
    turnBanner.innerHTML = '<span class="spinner" aria-hidden="true"></span>AI is thinking...';
    return;
  }

  turnBanner.textContent = `${playerLabel(state.currentPlayer)} turn`;
}

function updateConfirmButton() {
  const shouldShow = !!state.selected && !state.busy && !state.gameOver;
  confirmMoveBtn.hidden = !shouldShow;
}

function updateTimerUi() {
  if (!state.timer.enabled) {
    turnTimerText.textContent = 'Off';
    turnTimerBar.style.transform = 'scaleX(0)';
    turnTimerBar.classList.remove('warning', 'danger');
    return;
  }

  const seconds = Math.ceil(state.timer.remainingMs / 1000);
  const ratio = Math.max(0, Math.min(1, state.timer.remainingMs / TURN_TIMER_MS));

  turnTimerText.textContent = `${seconds}s`;
  turnTimerBar.style.transform = `scaleX(${ratio})`;
  turnTimerBar.classList.remove('warning', 'danger');

  if (seconds <= 5) {
    turnTimerBar.classList.add('danger');
  } else if (seconds <= 15) {
    turnTimerBar.classList.add('warning');
  }
}

function setSelection(heapIndex, stonesToTake) {
  state.selected = { heapIndex, stonesToTake };

  if (typeof sounds.playClickSound === 'function') {
    sounds.playClickSound();
  }

  renderBoard();
  updateConfirmButton();
}

function clearSelection() {
  state.selected = null;
  renderBoard();
  updateConfirmButton();
}

function canInteractWithBoard() {
  if (!state.started || state.busy || state.gameOver) {
    return false;
  }

  if (mode === 'pve') {
    return state.currentPlayer === 'player1';
  }

  return true;
}

function renderBoard() {
  gameBoard.innerHTML = '';

  state.heaps.forEach((heapSize, heapIndex) => {
    const row = document.createElement('div');
    row.className = 'heap-row';
    row.dataset.heapIndex = String(heapIndex);

    const label = document.createElement('div');
    label.className = 'heap-label';
    label.textContent = `Row ${heapIndex + 1} (${heapSize})`;

    const stonesWrap = document.createElement('div');
    stonesWrap.className = 'stones-wrap';

    if (heapSize === 0) {
      const empty = document.createElement('span');
      empty.className = 'empty-row';
      empty.textContent = 'Empty';
      stonesWrap.appendChild(empty);
    } else {
      for (let stoneIndex = 0; stoneIndex < heapSize; stoneIndex += 1) {
        const stone = document.createElement('div');
        stone.className = 'stone';

        const selected =
          state.selected &&
          state.selected.heapIndex === heapIndex &&
          stoneIndex >= heapSize - state.selected.stonesToTake;

        if (selected) {
          stone.classList.add('selected');
        }

        stone.addEventListener('click', () => {
          if (!canInteractWithBoard()) {
            return;
          }

          const stonesToTake = heapSize - stoneIndex;
          setSelection(heapIndex, stonesToTake);
        });

        stonesWrap.appendChild(stone);
      }
    }

    row.appendChild(label);
    row.appendChild(stonesWrap);
    gameBoard.appendChild(row);
  });
}

function renderHistory() {
  moveHistory.innerHTML = '';

  if (state.moveHistory.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'history-item muted';
    placeholder.textContent = 'No moves yet.';
    moveHistory.appendChild(placeholder);
    return;
  }

  state.moveHistory.forEach((move, index) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.textContent = `${index + 1}. ${playerLabel(move.player)} took ${move.stonesToTake} from Row ${move.heapIndex + 1}.`;
    moveHistory.appendChild(item);
  });

  moveHistory.scrollTop = moveHistory.scrollHeight;
}

function getPerformanceSummary() {
  const total = state.performance.humanMoves;
  const optimal = state.performance.optimalMoves;
  const percent = total > 0 ? Math.round((optimal / total) * 100) : 0;

  let rating = 'Novice';
  if (percent >= 85) {
    rating = 'Nim Master';
  } else if (percent >= 60) {
    rating = 'Strategist';
  } else if (percent >= 30) {
    rating = 'Intermediate';
  }

  return { percent, rating };
}

function triggerConfetti() {
  const pieces = [];
  const colors = ['#00f5ff', '#34e6cf', '#ffd166', '#ff6f91', '#9bfffa', '#f68ef1'];
  const duration = 3000;
  const start = performance.now();

  for (let i = 0; i < 150; i += 1) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    document.body.appendChild(piece);

    pieces.push({
      el: piece,
      x: Math.random() * window.innerWidth,
      y: -Math.random() * 120,
      vx: (Math.random() - 0.5) * 2.1,
      vy: Math.random() * 1.8 + 1.4,
      r: Math.random() * 360,
      vr: (Math.random() - 0.5) * 10,
    });
  }

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);

    pieces.forEach((piece) => {
      piece.x += piece.vx;
      piece.vy += 0.05;
      piece.y += piece.vy;
      piece.r += piece.vr;
      piece.el.style.transform = `translate(${piece.x}px, ${piece.y}px) rotate(${piece.r}deg)`;
      piece.el.style.opacity = String(1 - t);
    });

    if (t < 1) {
      window.requestAnimationFrame(frame);
      return;
    }

    pieces.forEach((piece) => piece.el.remove());
  }

  window.requestAnimationFrame(frame);
}

function applyEndEffectsIfNeeded() {
  if (!state.gameOver || state.endEffectsPlayed) {
    return;
  }

  const winnerIsHuman = isHumanPlayer(state.winner);

  if (mode === 'pve') {
    if (winnerIsHuman) {
      if (typeof sounds.playVictorySound === 'function') {
        sounds.playVictorySound();
      }
      triggerConfetti();
    } else if (typeof sounds.playDefeatSound === 'function') {
      sounds.playDefeatSound();
    }
  } else {
    if (typeof sounds.playVictorySound === 'function') {
      sounds.playVictorySound();
    }
    if (winnerIsHuman) {
      triggerConfetti();
    }
  }

  state.endEffectsPlayed = true;
}

function renderGameOver() {
  if (!state.gameOver) {
    gameOverOverlay.hidden = true;
    return;
  }

  gameOverTitle.textContent = 'Game Over';

  let summary = `${playerLabel(state.winner)} wins this round.`;
  if (mode === 'pve') {
    const result = getPerformanceSummary();
    summary += `<br />You played ${result.percent}% optimally. Rating: <strong>${result.rating}</strong>.`;
  }

  gameOverText.innerHTML = summary;
  gameOverOverlay.hidden = false;

  applyEndEffectsIfNeeded();
}

function renderAll() {
  updateHeader();
  updateTurnBanner();
  renderBoard();
  renderHistory();
  updateConfirmButton();
  updateTimerUi();
  renderGameOver();
}

function applyMoveToHeaps(heaps, move) {
  const next = [...heaps];
  next[move.heapIndex] -= move.stonesToTake;
  return next;
}

function spawnStoneBurst(stoneElement) {
  const rect = stoneElement.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;
  const duration = 600;
  const start = performance.now();
  const colors = ['#8efffa', '#42f2ea', '#1bbec7'];
  const particles = [];

  for (let i = 0; i < 12; i += 1) {
    const particle = document.createElement('div');
    particle.className = 'remove-particle';
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    document.body.appendChild(particle);

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 0.9;

    particles.push({
      el: particle,
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.25,
    });
  }

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);

    particles.forEach((particle) => {
      particle.x += particle.vx * 1.2;
      particle.y += particle.vy * 1.2;
      particle.vy += 0.02;

      particle.el.style.transform = `translate(${particle.x}px, ${particle.y}px)`;
      particle.el.style.opacity = String(1 - t);
    });

    if (t < 1) {
      window.requestAnimationFrame(frame);
      return;
    }

    particles.forEach((particle) => particle.el.remove());
  }

  window.requestAnimationFrame(frame);
}

async function animateRemoval(move) {
  const row = document.querySelector(`.heap-row[data-heap-index="${move.heapIndex}"]`);
  if (!row) {
    return;
  }

  const stones = Array.from(row.querySelectorAll('.stone'));
  const targets = stones.slice(Math.max(0, stones.length - move.stonesToTake));

  if (typeof sounds.playRemoveSound === 'function') {
    sounds.playRemoveSound();
  }

  targets.forEach((stone, index) => {
    spawnStoneBurst(stone);
    stone.style.setProperty('--remove-delay', `${index * 20}ms`);
    stone.classList.add('removing');
  });

  await wait(420);
}

function evaluateHumanMove(heapsBefore, move) {
  if (mode !== 'pve' || state.currentPlayer !== 'player1') {
    return;
  }

  const before = nimSum(heapsBefore);
  const after = applyMoveToHeaps(heapsBefore, move);
  state.performance.humanMoves += 1;
  if (before !== 0 && nimSum(after) === 0) {
    state.performance.optimalMoves += 1;
  }
}

function recomputePerformanceFromHistory() {
  if (mode !== 'pve') {
    return;
  }

  let heapsCursor = [...startingHeaps];
  state.performance.humanMoves = 0;
  state.performance.optimalMoves = 0;

  state.moveHistory.forEach((move) => {
    const normalizedMove = {
      heapIndex: move.heapIndex,
      stonesToTake: move.stonesToTake,
    };

    if (move.player === 'player1') {
      state.performance.humanMoves += 1;
      const after = applyMoveToHeaps(heapsCursor, normalizedMove);
      if (nimSum(after) === 0) {
        state.performance.optimalMoves += 1;
      }
      heapsCursor = after;
      return;
    }

    heapsCursor = applyMoveToHeaps(heapsCursor, normalizedMove);
  });
}

function getRandomValidMove() {
  const options = state.heaps
    .map((heap, heapIndex) => ({ heap, heapIndex }))
    .filter((row) => row.heap > 0);

  if (options.length === 0) {
    return null;
  }

  const row = options[Math.floor(Math.random() * options.length)];
  return {
    heapIndex: row.heapIndex,
    stonesToTake: Math.floor(Math.random() * row.heap) + 1,
  };
}

function stopTurnTimer() {
  if (state.timer.intervalId) {
    window.clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
}

function shouldTimerRun() {
  if (!state.timer.enabled || !state.started || state.gameOver || state.busy || state.thinking) {
    return false;
  }

  if (mode === 'pve' && state.currentPlayer === 'player2') {
    return false;
  }

  return true;
}

function startTurnTimer() {
  stopTurnTimer();

  if (!shouldTimerRun()) {
    state.timer.remainingMs = TURN_TIMER_MS;
    updateTimerUi();
    return;
  }

  state.timer.remainingMs = TURN_TIMER_MS;
  updateTimerUi();

  state.timer.intervalId = window.setInterval(() => {
    state.timer.remainingMs = Math.max(0, state.timer.remainingMs - 100);
    updateTimerUi();

    if (state.timer.remainingMs <= 0) {
      stopTurnTimer();
      handleTimerExpired();
    }
  }, 100);
}

async function handleTimerExpired() {
  if (!shouldTimerRun()) {
    return;
  }

  const move = getRandomValidMove();
  if (!move) {
    return;
  }

  showToast('Time up. Random move played automatically.');
  await submitMove(move);
}

async function startGame() {
  try {
    const response = await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        difficulty: mode === 'pve' ? difficulty : null,
        heaps: startingHeaps,
      }),
    });

    if (!response.ok) {
      throw new Error('Could not start game.');
    }

    const data = await response.json();

    state.started = true;
    state.gameId = data.gameId;
    state.heaps = [...data.heaps];
    state.currentPlayer = data.currentPlayer;
    state.gameOver = false;
    state.winner = null;
    state.moveHistory = [];
    state.selected = null;
    state.endEffectsPlayed = false;
    state.performance.humanMoves = 0;
    state.performance.optimalMoves = 0;

    renderAll();
    startTurnTimer();
  } catch (error) {
    showToast(error.message || 'Failed to start game.');
  }
}

async function refreshStateFromServer() {
  const response = await fetch(`/api/game/${state.gameId}/state`);

  if (!response.ok) {
    throw new Error('Could not refresh game state.');
  }

  const latest = await response.json();
  state.heaps = [...latest.heaps];
  state.currentPlayer = latest.currentPlayer;
  state.gameOver = latest.gameOver;
  state.winner = latest.winner;
  state.moveHistory = Array.isArray(latest.moveHistory) ? [...latest.moveHistory] : [];
  state.selected = null;

  recomputePerformanceFromHistory();
}

async function submitMove(forcedMove = null) {
  if (state.busy || state.gameOver) {
    return;
  }

  const selectedMove = forcedMove ? { ...forcedMove } : state.selected ? { ...state.selected } : null;
  if (!selectedMove) {
    return;
  }

  state.busy = true;
  state.selected = null;
  updateConfirmButton();
  stopTurnTimer();

  const heapsBefore = [...state.heaps];

  try {
    const response = await fetch(`/api/game/${state.gameId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedMove),
    });

    const data = await response.json();

    if (!response.ok || data.valid === false) {
      showToast(data.reason || data.error || 'Move rejected.');
      return;
    }

    evaluateHumanMove(heapsBefore, selectedMove);

    await animateRemoval(selectedMove);

    if (data.playerMove) {
      state.moveHistory.push(data.playerMove);
    }

    state.heaps = applyMoveToHeaps(heapsBefore, selectedMove);
    state.currentPlayer = mode === 'pve' ? 'player2' : data.currentPlayer;

    if (data.aiMove) {
      state.thinking = true;
      renderAll();
      await wait(800);

      if (typeof sounds.playAISound === 'function') {
        sounds.playAISound();
      }

      await animateRemoval(data.aiMove);
      state.thinking = false;
      state.moveHistory.push(data.aiMove);
    }

    state.heaps = [...data.heaps];
    state.currentPlayer = data.currentPlayer;
    state.gameOver = data.gameOver;
    state.winner = data.winner;

    renderAll();
  } catch (error) {
    showToast(error.message || 'Failed to submit move.');
  } finally {
    state.thinking = false;
    state.busy = false;
    renderAll();
    startTurnTimer();
  }
}

async function undoMove() {
  if (state.busy || state.gameOver || !state.gameId) {
    return;
  }

  state.busy = true;
  clearSelection();
  stopTurnTimer();

  try {
    const response = await fetch(`/api/game/${state.gameId}/undo`, {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.error || 'Nothing to undo.');
      return;
    }

    await refreshStateFromServer();
    renderAll();
  } catch (error) {
    showToast(error.message || 'Undo failed.');
  } finally {
    state.busy = false;
    renderAll();
    startTurnTimer();
  }
}

async function requestHint() {
  if (!state.gameId) {
    return;
  }

  try {
    const response = await fetch(`/api/game/${state.gameId}/hint`);
    if (!response.ok) {
      throw new Error('Could not get hint.');
    }

    const hint = await response.json();
    showToast(hint.message || 'No hint available.');

    if (hint.suggestion && typeof hint.suggestion.heapIndex === 'number') {
      pulseSuggestedStones(hint.suggestion.heapIndex, hint.suggestion.stonesToTake);
    }
  } catch (error) {
    showToast(error.message || 'Hint failed.');
  }
}

function pulseSuggestedStones(heapIndex, stonesToTake) {
  const row = document.querySelector(`.heap-row[data-heap-index="${heapIndex}"]`);
  if (!row) {
    return;
  }

  const stones = Array.from(row.querySelectorAll('.stone'));
  const targets = stones.slice(Math.max(0, stones.length - stonesToTake));

  targets.forEach((stone) => stone.classList.add('hint-pulse'));
  window.setTimeout(() => {
    targets.forEach((stone) => stone.classList.remove('hint-pulse'));
  }, 1200);
}

function goToMenu() {
  window.location.href = 'index.html';
}

function restartGame() {
  window.location.href = `game.html?${params.toString()}`;
}

function setupNameModal() {
  if (mode === 'pve') {
    player2NameWrap.hidden = true;
    player1NameLabel.textContent = 'Your Name';
  } else {
    player1NameLabel.textContent = 'Player 1 Name';
  }

  startMatchBtn.addEventListener('click', async () => {
    state.playerNames.player1 = player1NameInput.value.trim() || 'Player 1';
    state.playerNames.player2 = mode === 'pve' ? 'NIM-AI' : player2NameInput.value.trim() || 'Player 2';

    nameModal.style.display = 'none';
    gameContent.style.display = 'block';
    await startGame();
  });
}

function setupTimerToggle() {
  timerEnabledInput.checked = state.timer.enabled;
  updateTimerUi();

  timerEnabledInput.addEventListener('change', () => {
    state.timer.enabled = timerEnabledInput.checked;
    window.sessionStorage.setItem(TIMER_PREF_KEY, state.timer.enabled ? '1' : '0');

    if (state.timer.enabled) {
      startTurnTimer();
    } else {
      stopTurnTimer();
      state.timer.remainingMs = TURN_TIMER_MS;
      updateTimerUi();
    }
  });
}

backToMenuBtn.addEventListener('click', goToMenu);
overlayBackBtn.addEventListener('click', goToMenu);
playAgainBtn.addEventListener('click', restartGame);

confirmMoveBtn.addEventListener('click', () => {
  submitMove();
});
undoBtn.addEventListener('click', undoMove);
hintBtn.addEventListener('click', requestHint);
newGameBtn.addEventListener('click', restartGame);

setupNameModal();
setupTimerToggle();
renderAll();
