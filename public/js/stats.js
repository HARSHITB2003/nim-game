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

function formatResult(mode, winner) {
  if (mode !== 'pve') {
    return winner ? `${winner} won` : '-';
  }

  if (winner === 'player1' || winner === 'player') {
    return 'Win';
  }

  if (winner === 'player2' || winner === 'ai' || winner === 'computer') {
    return 'Loss';
  }

  return 'Unknown';
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
    cell.colSpan = 5;
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

    const resultCell = document.createElement('td');
    resultCell.textContent = formatResult(game.mode, game.winner);

    const movesCell = document.createElement('td');
    movesCell.textContent = String(toNumber(game.total_moves));

    row.appendChild(dateCell);
    row.appendChild(modeCell);
    row.appendChild(difficultyCell);
    row.appendChild(resultCell);
    row.appendChild(movesCell);

    recentGamesBody.appendChild(row);
  });
}

async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    if (!response.ok) {
      throw new Error('Failed to fetch statistics.');
    }

    const stats = await response.json();
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
  } catch (error) {
    recentGamesBody.innerHTML = '<tr><td colspan="5" class="empty-table">Could not load stats.</td></tr>';
  }
}

async function clearStats() {
  const confirmed = window.confirm('Clear all saved statistics? This cannot be undone.');
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch('/api/stats/reset', { method: 'POST' });
    if (!response.ok) {
      throw new Error('Failed to clear stats.');
    }

    window.location.reload();
  } catch (error) {
    window.alert('Failed to clear stats. Please try again.');
  }
}

clearStatsBtn.addEventListener('click', clearStats);
loadStats();
