'use strict';

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.VERCEL
  ? '/tmp/nim-game.db'
  : path.join(__dirname, 'nim-game.db');

const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

/* ---------- schema ---------- */

// Drop legacy tables/data from old server versions
db.exec(`DROP TABLE IF EXISTS moves`);

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL,
    difficulty TEXT,
    heap_config TEXT NOT NULL,
    max_take INTEGER DEFAULT 0,
    winner TEXT,
    winner_name TEXT,
    player1_name TEXT,
    player2_name TEXT,
    total_moves INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

try { db.exec(`ALTER TABLE games ADD COLUMN max_take INTEGER DEFAULT 0`); }
catch (_) { /* column already exists */ }

try { db.exec(`DELETE FROM games WHERE winner IS NULL`); }
catch (_) { /* fresh table, nothing to clean */ }

/* ---------- helpers ---------- */

function toText(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/* ---------- prepared statements ---------- */

const insertGameStmt = db.prepare(`
  INSERT INTO games (mode, difficulty, heap_config, max_take, winner, winner_name, player1_name, player2_name, total_moves)
  VALUES (@mode, @difficulty, @heapConfig, @maxTake, @winner, @winnerName, @player1Name, @player2Name, @totalMoves)
`);

const getRecentGamesStmt = db.prepare(`
  SELECT id, mode, difficulty, heap_config, max_take, winner, winner_name,
         player1_name, player2_name, total_moves, created_at
  FROM games
  ORDER BY created_at DESC, id DESC
  LIMIT ?
`);

const getTotalGamesStmt  = db.prepare(`SELECT COUNT(*) AS count FROM games`);
const getPvpGamesStmt    = db.prepare(`SELECT COUNT(*) AS count FROM games WHERE mode = 'pvp'`);
const getPveGamesStmt    = db.prepare(`SELECT COUNT(*) AS count FROM games WHERE mode = 'pve'`);
const getAverageMovesStmt = db.prepare(
  `SELECT COALESCE(AVG(total_moves), 0) AS average_moves FROM games`
);

const getWinsLossesByDifficultyStmt = db.prepare(`
  SELECT
    COALESCE(difficulty, 'unknown') AS difficulty,
    SUM(CASE WHEN winner = 'player1' THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN winner != 'player1' THEN 1 ELSE 0 END) AS losses
  FROM games
  WHERE mode = 'pve'
  GROUP BY COALESCE(difficulty, 'unknown')
`);

/* ---------- public API ---------- */

function saveGameResult({ mode, difficulty, heapConfig, maxTake, winner, winnerName, player1Name, player2Name, totalMoves }) {
  insertGameStmt.run({
    mode,
    difficulty: difficulty ?? null,
    heapConfig: toText(heapConfig),
    maxTake: Number.isInteger(maxTake) && maxTake > 0 ? maxTake : 0,
    winner,
    winnerName: winnerName ?? winner,
    player1Name: player1Name ?? null,
    player2Name: player2Name ?? null,
    totalMoves: totalMoves ?? 0,
  });
}

function getStats() {
  const totalGames  = getTotalGamesStmt.get().count;
  const pvpGames    = getPvpGamesStmt.get().count;
  const pveGames    = getPveGamesStmt.get().count;
  const averageMoves = getAverageMovesStmt.get().average_moves;

  const winsLossesByDifficulty = {
    easy:   { wins: 0, losses: 0 },
    medium: { wins: 0, losses: 0 },
    hard:   { wins: 0, losses: 0 },
  };

  for (const row of getWinsLossesByDifficultyStmt.all()) {
    const key = String(row.difficulty || 'unknown').toLowerCase();
    if (winsLossesByDifficulty[key]) {
      winsLossesByDifficulty[key] = { wins: row.wins, losses: row.losses };
    }
  }

  return {
    totalGames,
    pvpGames,
    pveGames,
    averageMoves,
    winsLossesByDifficulty,
    recentGames: getRecentGamesStmt.all(20),
  };
}

function resetStats() {
  db.prepare('DELETE FROM games').run();
}

module.exports = {
  saveGameResult,
  getStats,
  resetStats,
};
