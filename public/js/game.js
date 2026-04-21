'use strict';

const params = new URLSearchParams(window.location.search);

const mode = (params.get('mode') || 'pvp').toLowerCase();
const difficulty = (params.get('difficulty') || 'easy').toLowerCase();
const startingHeaps = parseHeaps(params.get('heaps'));
const maxTake = parseMaxTake(params.get('maxTake'));

const difficultyText = document.getElementById('difficultyText');
const maxTakeText = document.getElementById('maxTakeText');
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

const popup = document.getElementById('popup');

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

/* ---------- local game instance ---------- */
let game = null;

const state = {
  started: false,
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

function parseMaxTake(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 0;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function playerLabel(player) {
  return player === 'player2' ? state.playerNames.player2 : state.playerNames.player1;
}

function showPopup(message) {
  popup.textContent = message;
  popup.hidden = false;
  popup.classList.remove('show');
  void popup.offsetWidth;
  popup.classList.add('show');

  window.clearTimeout(showPopup.timeoutId);
  showPopup.timeoutId = window.setTimeout(() => {
    popup.classList.remove('show');
    window.setTimeout(() => {
      popup.hidden = true;
    }, 260);
  }, 2800);
}

function updateHeader() {
  const difficultyCapitalized = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  difficultyText.textContent = mode === 'pve' ? `Difficulty: ${difficultyCapitalized}` : 'Player vs Player';
  if (maxTakeText) {
    if (maxTake > 0) {
      maxTakeText.textContent = `Max ${maxTake} per move`;
      maxTakeText.hidden = false;
    } else {
      maxTakeText.hidden = true;
    }
  }
  moveCounter.textContent = String(state.moveHistory.length);
}

function updateTurnBanner() {
  turnBanner.classList.remove('thinking', 'player1-turn', 'player2-turn');

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
  if (mode === 'pvp') {
    turnBanner.classList.add(state.currentPlayer === 'player1' ? 'player1-turn' : 'player2-turn');
  }
  turnBanner.textContent = `${playerLabel(state.currentPlayer)} turn`;
}

function updateConfirmButton() {
  confirmMoveBtn.hidden = !(state.selected && !state.busy && !state.gameOver);
}

function updateTimerUi() {
  if (!state.timer.enabled) {
    turnTimerText.textContent = '';
    turnTimerBar.style.transform = 'scaleX(0)';
    turnTimerBar.classList.remove('warning', 'danger');
    return;
  }
  const seconds = Math.ceil(state.timer.remainingMs / 1000);
  const ratio = Math.max(0, Math.min(1, state.timer.remainingMs / TURN_TIMER_MS));
  turnTimerText.textContent = `${seconds}s`;
  turnTimerBar.style.transform = `scaleX(${ratio})`;
  turnTimerBar.classList.remove('warning', 'danger');
  if (seconds <= 5) turnTimerBar.classList.add('danger');
  else if (seconds <= 15) turnTimerBar.classList.add('warning');
}

function setSelection(heapIndex, stonesToTake) {
  if (maxTake > 0 && stonesToTake > maxTake) {
    showPopup(`Max ${maxTake} per move. Pick a stone closer to the end of the row.`);
    return;
  }
  state.selected = { heapIndex, stonesToTake };
  sounds.playClickSound();
  renderBoard();
  updateConfirmButton();
}

function clearSelection() {
  state.selected = null;
  renderBoard();
  updateConfirmButton();
}

function canInteractWithBoard() {
  if (!state.started || state.busy || state.gameOver) return false;
  if (mode === 'pve') return state.currentPlayer === 'player1';
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
      stonesWrap.appendChild(empty);
    } else {
      for (let stoneIndex = 0; stoneIndex < heapSize; stoneIndex += 1) {
        const stone = document.createElement('div');
        stone.className = 'stone';

        const selected =
          state.selected &&
          state.selected.heapIndex === heapIndex &&
          stoneIndex >= heapSize - state.selected.stonesToTake;
        if (selected) stone.classList.add('selected');

        stone.addEventListener('click', () => {
          if (!canInteractWithBoard()) return;
          setSelection(heapIndex, heapSize - stoneIndex);
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
  if (percent >= 85) rating = 'Nim Master';
  else if (percent >= 60) rating = 'Strategist';
  else if (percent >= 30) rating = 'Intermediate';
  return { percent, rating };
}

function applyEndEffectsIfNeeded() {
  if (!state.gameOver || state.endEffectsPlayed) return;
  if (mode === 'pve') {
    if (state.winner === 'player1') {
      sounds.playVictorySound();
    } else {
      sounds.playDefeatSound();
    }
  } else {
    sounds.playVictorySound();
  }
  state.endEffectsPlayed = true;
}

function renderGameOver() {
  if (!state.gameOver) {
    gameOverOverlay.hidden = true;
    return;
  }
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

async function animateRemoval(move, isAI) {
  const row = document.querySelector(`.heap-row[data-heap-index="${move.heapIndex}"]`);
  if (!row) return;
  const stones = Array.from(row.querySelectorAll('.stone'));
  const targets = stones.slice(Math.max(0, stones.length - move.stonesToTake));

  if (isAI) {
    targets.forEach((stone) => stone.classList.add('selected'));
    await wait(500);
  }

  sounds.playRemoveSound();
  targets.forEach((stone, index) => {
    stone.classList.remove('selected');
    stone.style.setProperty('--remove-delay', `${index * 20}ms`);
    stone.classList.add('removing');
  });
  await wait(420);
}

function evaluateHumanMove(heapsBefore, move) {
  if (mode !== 'pve' || state.currentPlayer !== 'player1') return;
  const before = maxTake > 0
    ? window.NimAI.gameGrundy(heapsBefore, maxTake)
    : window.NimAI.nimSum(heapsBefore);
  const after = applyMoveToHeaps(heapsBefore, move);
  const afterScore = maxTake > 0
    ? window.NimAI.gameGrundy(after, maxTake)
    : window.NimAI.nimSum(after);
  state.performance.humanMoves += 1;
  if (before !== 0 && afterScore === 0) {
    state.performance.optimalMoves += 1;
  }
}

function getRandomValidMove() {
  const options = state.heaps
    .map((heap, heapIndex) => ({ heap, heapIndex }))
    .filter((r) => r.heap > 0);
  if (options.length === 0) return null;
  const r = options[Math.floor(Math.random() * options.length)];
  const cap = maxTake > 0 ? Math.min(maxTake, r.heap) : r.heap;
  return { heapIndex: r.heapIndex, stonesToTake: Math.floor(Math.random() * cap) + 1 };
}

/* ---------- timer ---------- */
function stopTurnTimer() {
  if (state.timer.intervalId) {
    window.clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
}

function shouldTimerRun() {
  if (!state.timer.enabled || !state.started || state.gameOver || state.busy || state.thinking) return false;
  if (mode === 'pve' && state.currentPlayer === 'player2') return false;
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
  if (!shouldTimerRun()) return;
  const move = getRandomValidMove();
  if (!move) return;
  showPopup('Time up. Random move played automatically.');
  await submitMove(move);
}

/* ---------- save completed game: localStorage primary, server best-effort ---------- */
function saveGameResult() {
  const payload = {
    mode,
    difficulty: mode === 'pve' ? difficulty : null,
    heaps: startingHeaps,
    maxTake: maxTake || 0,
    winner: game.winner,
    winnerName: state.playerNames[game.winner] || game.winner,
    player1Name: state.playerNames.player1,
    player2Name: state.playerNames.player2,
    totalMoves: game.moveHistory.length,
  };

  if (window.LocalStats) {
    window.LocalStats.addGame(payload);
  }

  try {
    fetch('/api/game/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch (_) { /* server save is optional */ }
}

/* ---------- game actions ---------- */
function syncState() {
  state.heaps = [...game.heaps];
  state.currentPlayer = game.currentPlayer;
  state.gameOver = game.gameOver;
  state.winner = game.winner;
  state.moveHistory = game.moveHistory.map((m) => ({
    player: m.player,
    heapIndex: m.heapIndex,
    stonesToTake: m.stonesToTake,
  }));
}

function startGame() {
  game = new window.NimGame(startingHeaps, { maxTake });

  state.started = true;
  state.endEffectsPlayed = false;
  state.selected = null;
  state.performance.humanMoves = 0;
  state.performance.optimalMoves = 0;

  syncState();
  renderAll();
  startTurnTimer();
}

async function submitMove(forcedMove) {
  if (state.busy || state.gameOver) return;

  const selectedMove = forcedMove
    ? { ...forcedMove }
    : state.selected
      ? { ...state.selected }
      : null;
  if (!selectedMove) return;

  state.busy = true;
  state.selected = null;
  updateConfirmButton();
  stopTurnTimer();

  const heapsBefore = [...game.heaps];

  evaluateHumanMove(heapsBefore, selectedMove);

  const playerResult = game.makeMove(selectedMove.heapIndex, selectedMove.stonesToTake);
  if (!playerResult.valid) {
    showPopup(playerResult.reason || 'Invalid move.');
    state.busy = false;
    renderAll();
    startTurnTimer();
    return;
  }

  await animateRemoval(selectedMove);
  syncState();
  renderAll();

  /* --- AI turn --- */
  if (mode === 'pve' && !game.gameOver && game.currentPlayer === 'player2') {
    state.thinking = true;
    renderAll();

    const aiChoice = window.NimAI.getMove(game.heaps, difficulty, maxTake);
    const thinkTime = { easy: 400, medium: 800, hard: 1200 }[difficulty] || 800;
    await wait(thinkTime);

    if (aiChoice) {
      const aiResult = game.makeMove(aiChoice.heapIndex, aiChoice.stonesToTake);
      if (aiResult.valid) {
        sounds.playAISound();
        await animateRemoval(aiChoice, true);
      }
    }

    state.thinking = false;
    syncState();
  }

  if (game.gameOver) {
    saveGameResult();
  }

  state.busy = false;
  renderAll();
  startTurnTimer();
}

function undoMove() {
  if (state.busy || state.gameOver || !game) return;
  clearSelection();
  stopTurnTimer();

  // In PvE, undo both the AI's move and the human's move together
  const undoCount = mode === 'pve' ? 2 : 1;
  let undone = 0;
  for (let i = 0; i < undoCount; i += 1) {
    if (!game.undo()) break;
    undone += 1;
  }

  if (undone === 0) {
    showPopup('Nothing to undo.');
    startTurnTimer();
    return;
  }

  syncState();
  renderAll();
  startTurnTimer();
}

function requestHint() {
  if (!game || state.gameOver) return;
  const hint = window.NimAI.getHint(game.heaps, maxTake);
  showPopup(hint.message || 'No hint available.');
  if (hint.suggestion && typeof hint.suggestion.heapIndex === 'number') {
    pulseSuggestedStones(hint.suggestion.heapIndex, hint.suggestion.stonesToTake);
  }
}

function pulseSuggestedStones(heapIndex, stonesToTake) {
  const row = document.querySelector(`.heap-row[data-heap-index="${heapIndex}"]`);
  if (!row) return;
  const stones = Array.from(row.querySelectorAll('.stone'));
  const targets = stones.slice(Math.max(0, stones.length - stonesToTake));
  targets.forEach((s) => s.classList.add('hint-pulse'));
  window.setTimeout(() => targets.forEach((s) => s.classList.remove('hint-pulse')), 1200);
}

function goToMenu() { window.location.href = 'index.html'; }
function restartGame() { window.location.href = `game.html?${params.toString()}`; }

function setupNameModal() {
  if (mode === 'pve') {
    player2NameWrap.hidden = true;
    player1NameLabel.textContent = 'Your Name';
  } else {
    player1NameLabel.textContent = 'Player 1 Name';
  }

  startMatchBtn.addEventListener('click', () => {
    state.playerNames.player1 = player1NameInput.value.trim() || 'Player 1';
    state.playerNames.player2 = mode === 'pve' ? 'NIM-AI' : player2NameInput.value.trim() || 'Player 2';
    nameModal.style.display = 'none';
    gameContent.style.display = 'block';
    startGame();
  });
}

function setupTimerToggle() {
  timerEnabledInput.checked = state.timer.enabled;
  updateTimerUi();

  timerEnabledInput.addEventListener('change', () => {
    state.timer.enabled = timerEnabledInput.checked;
    window.sessionStorage.setItem(TIMER_PREF_KEY, state.timer.enabled ? '1' : '0');
    if (state.timer.enabled) startTurnTimer();
    else {
      stopTurnTimer();
      state.timer.remainingMs = TURN_TIMER_MS;
      updateTimerUi();
    }
  });
}

backToMenuBtn.addEventListener('click', goToMenu);
overlayBackBtn.addEventListener('click', goToMenu);
playAgainBtn.addEventListener('click', restartGame);
confirmMoveBtn.addEventListener('click', () => submitMove());
undoBtn.addEventListener('click', undoMove);
hintBtn.addEventListener('click', requestHint);
newGameBtn.addEventListener('click', restartGame);

setupNameModal();
setupTimerToggle();
renderAll();
