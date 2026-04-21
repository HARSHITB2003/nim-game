'use strict';

(function () {
  const KEY = 'nim.stats.games.v1';

  function readAll() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeAll(games) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(games));
      return true;
    } catch (_) {
      return false;
    }
  }

  function addGame(game) {
    if (!game || typeof game !== 'object') return null;
    const games = readAll();
    const entry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      mode: String(game.mode || 'pvp'),
      difficulty: game.difficulty ?? null,
      heaps: Array.isArray(game.heaps) ? [...game.heaps] : [],
      max_take: Number.isInteger(game.maxTake) && game.maxTake > 0 ? game.maxTake : 0,
      winner: game.winner ?? null,
      winner_name: game.winnerName ?? game.winner ?? null,
      player1_name: game.player1Name ?? 'Player 1',
      player2_name: game.player2Name ?? 'Player 2',
      total_moves: Number.isInteger(game.totalMoves) ? game.totalMoves : 0,
      created_at: new Date().toISOString(),
    };
    games.push(entry);
    writeAll(games);
    return entry;
  }

  function reset() {
    writeAll([]);
  }

  function computeStats() {
    const games = readAll();
    const totalGames = games.length;
    const pvpGames = games.filter((g) => g.mode === 'pvp').length;
    const pveGames = games.filter((g) => g.mode === 'pve').length;
    const averageMoves = totalGames > 0
      ? games.reduce((sum, g) => sum + (Number(g.total_moves) || 0), 0) / totalGames
      : 0;

    const winsLossesByDifficulty = {
      easy:   { wins: 0, losses: 0 },
      medium: { wins: 0, losses: 0 },
      hard:   { wins: 0, losses: 0 },
    };

    for (const g of games) {
      if (g.mode !== 'pve') continue;
      const level = String(g.difficulty || '').toLowerCase();
      if (!winsLossesByDifficulty[level]) continue;
      if (g.winner === 'player1') winsLossesByDifficulty[level].wins += 1;
      else if (g.winner === 'player2') winsLossesByDifficulty[level].losses += 1;
    }

    const recentGames = [...games]
      .sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return tb - ta;
      })
      .slice(0, 20);

    return { totalGames, pvpGames, pveGames, averageMoves, winsLossesByDifficulty, recentGames };
  }

  window.LocalStats = { addGame, reset, computeStats, readAll, writeAll };
})();
