'use strict';

const totalGamesEl = document.getElementById('totalGames');
const pvpGamesEl = document.getElementById('pvpGames');
const pveGamesEl = document.getElementById('pveGames');
const averageMovesEl = document.getElementById('averageMoves');
const recentGamesBody = document.getElementById('recentGamesBody');
const clearStatsBtn = document.getElementById('clearStatsBtn');

const difficultyConfig = {
  easy: {
    winsEl: document.getElementById('easyWins'),
    lossesEl: document.getElementById('easyLosses'),
    rateBarEl: document.getElementById('easyRateBar'),
    rateTextEl: document.getElementById('easyRateText'),
  },
  medium: {
    winsEl: document.getElementById('mediumWins'),
    lossesEl: document.getElementById('mediumLosses'),
    rateBarEl: document.getElementById('mediumRateBar'),
    rateTextEl: document.getElementById('mediumRateText'),
  },
  hard: {
    winsEl: document.getElementById('hardWins'),
    lossesEl: document.getElementById('hardLosses'),
    rateBarEl: document.getElementById('hardRateBar'),
    rateTextEl: document.getElementById('hardRateText'),
  },
};

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatMode(mode) {
  return mode === 'pve' ? 'vs AI' : 'PvP';
}

function formatDifficulty(mode, difficulty) {
  if (mode !== 'pve') {
    return '-';
  }

  if (!difficulty) {
    return 'Unknown';
  }

  return String(difficulty).charAt(0).toUpperCase() + String(difficulty).slice(1);
}

function formatResult(game) {
  const { mode, winner } = game;

  if (mode !== 'pve') {
    if (!winner) return '-';
    return `${game.winner_name || winner} won`;
  }

  if (winner === 'player1') return 'Win';
  if (winner === 'player2') return 'Loss';
  return 'Unknown';
}

function formatLimit(game) {
  const mt = toNumber(game.max_take);
  return mt > 0 ? `Max ${mt}` : 'Unlimited';
}

function formatDate(dateText) {
  if (!dateText) {
    return '-';
  }

  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  return date.toLocaleString();
}

function updateDifficultyCard(level, wins, losses) {
  const config = difficultyConfig[level];
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;

  config.winsEl.textContent = String(wins);
  config.lossesEl.textContent = String(losses);
  config.rateBarEl.style.width = `${winRate}%`;
  config.rateTextEl.textContent = `Win Rate: ${winRate.toFixed(0)}%`;
}

function renderRecentGames(games) {
  recentGamesBody.innerHTML = '';

  if (!Array.isArray(games) || games.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'empty-table';
    cell.textContent = 'No completed games yet.';
    row.appendChild(cell);
    recentGamesBody.appendChild(row);
    return;
  }

  games.forEach((game) => {
    const row = document.createElement('tr');

    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(game.created_at);

    const modeCell = document.createElement('td');
    modeCell.textContent = formatMode(game.mode);

    const difficultyCell = document.createElement('td');
    difficultyCell.textContent = formatDifficulty(game.mode, game.difficulty);

    const limitCell = document.createElement('td');
    limitCell.textContent = formatLimit(game);

    const resultCell = document.createElement('td');
    resultCell.textContent = formatResult(game);

    const movesCell = document.createElement('td');
    movesCell.textContent = String(toNumber(game.total_moves));

    row.appendChild(dateCell);
    row.appendChild(modeCell);
    row.appendChild(difficultyCell);
    row.appendChild(limitCell);
    row.appendChild(resultCell);
    row.appendChild(movesCell);

    recentGamesBody.appendChild(row);
  });
}

function renderStats(stats) {
  totalGamesEl.textContent = String(toNumber(stats.totalGames));
  pvpGamesEl.textContent = String(toNumber(stats.pvpGames));
  pveGamesEl.textContent = String(toNumber(stats.pveGames));
  averageMovesEl.textContent = toNumber(stats.averageMoves).toFixed(2);

  const byDifficulty = stats.winsLossesByDifficulty || {};
  ['easy', 'medium', 'hard'].forEach((level) => {
    const wins = toNumber(byDifficulty[level]?.wins);
    const losses = toNumber(byDifficulty[level]?.losses);
    updateDifficultyCard(level, wins, losses);
  });

  renderRecentGames(stats.recentGames || []);
}

function loadStats() {
  if (!window.LocalStats) {
    recentGamesBody.innerHTML = '<tr><td colspan="6" class="empty-table">Local storage is unavailable in this browser.</td></tr>';
    return;
  }
  renderStats(window.LocalStats.computeStats());
}

async function clearStats() {
  const confirmed = window.confirm('Clear all saved statistics? This cannot be undone.');
  if (!confirmed) return;

  if (window.LocalStats) window.LocalStats.reset();

  try {
    await fetch('/api/stats/reset', { method: 'POST', keepalive: true });
  } catch (_) { /* server may be unreachable */ }

  window.location.reload();
}

clearStatsBtn.addEventListener('click', clearStats);
loadStats();
