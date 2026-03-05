'use strict';

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'nim-game.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL,
    difficulty TEXT,
    heap_config TEXT NOT NULL,
    winner TEXT,
    total_moves INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS moves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER REFERENCES games(id),
    player TEXT NOT NULL,
    heap_index INTEGER NOT NULL,
    stones_taken INTEGER NOT NULL,
    heap_state_after TEXT NOT NULL,
    move_number INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

function toText(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

const createGameStmt = db.prepare(`
  INSERT INTO games (mode, difficulty, heap_config)
  VALUES (?, ?, ?)
`);

const saveMoveStmt = db.prepare(`
  INSERT INTO moves (game_id, player, heap_index, stones_taken, heap_state_after, move_number)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const completeGameStmt = db.prepare(`
  UPDATE games
  SET winner = ?, total_moves = ?, completed = 1
  WHERE id = ?
`);

const getGameMovesStmt = db.prepare(`
  SELECT id, game_id, player, heap_index, stones_taken, heap_state_after, move_number, created_at
  FROM moves
  WHERE game_id = ?
  ORDER BY move_number ASC
`);

const getRecentGamesStmt = db.prepare(`
  SELECT id, mode, difficulty, heap_config, winner, total_moves, created_at, completed
  FROM games
  WHERE completed = 1
  ORDER BY created_at DESC, id DESC
  LIMIT ?
`);

const getTotalGamesStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM games
  WHERE completed = 1
`);

const getPvpGamesStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM games
  WHERE mode = 'pvp' AND completed = 1
`);

const getPveGamesStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM games
  WHERE mode = 'pve' AND completed = 1
`);

const getAverageMovesStmt = db.prepare(`
  SELECT COALESCE(AVG(total_moves), 0) AS average_moves
  FROM games
  WHERE completed = 1
`);

const getWinsLossesByDifficultyStmt = db.prepare(`
  SELECT
    COALESCE(difficulty, 'unknown') AS difficulty,
    SUM(
      CASE
        WHEN LOWER(COALESCE(winner, '')) IN ('player', 'human', 'user', 'player1') THEN 1
        ELSE 0
      END
    ) AS wins,
    COUNT(*) - SUM(
      CASE
        WHEN LOWER(COALESCE(winner, '')) IN ('player', 'human', 'user', 'player1') THEN 1
        ELSE 0
      END
    ) AS losses
  FROM games
  WHERE mode = 'pve' AND completed = 1
  GROUP BY COALESCE(difficulty, 'unknown')
`);

const resetStatsTxn = db.transaction(() => {
  db.prepare('DELETE FROM moves').run();
  db.prepare('DELETE FROM games').run();
});

function createGame(mode, difficulty, heapConfig) {
  const result = createGameStmt.run(mode, difficulty ?? null, toText(heapConfig));
  return Number(result.lastInsertRowid);
}

function saveMove(gameId, player, heapIndex, stonesTaken, heapStateAfter, moveNumber) {
  saveMoveStmt.run(gameId, player, heapIndex, stonesTaken, toText(heapStateAfter), moveNumber);
}

function completeGame(gameId, winner, totalMoves) {
  completeGameStmt.run(winner ?? null, totalMoves ?? 0, gameId);
}

function getGameMoves(gameId) {
  return getGameMovesStmt.all(gameId);
}

function getRecentGames(limit) {
  return getRecentGamesStmt.all(limit);
}

function getStats() {
  const totalGames = getTotalGamesStmt.get().count;
  const pvpGames = getPvpGamesStmt.get().count;
  const pveGames = getPveGamesStmt.get().count;
  const averageMoves = getAverageMovesStmt.get().average_moves;

  const winsLossesByDifficulty = {
    easy: { wins: 0, losses: 0 },
    medium: { wins: 0, losses: 0 },
    hard: { wins: 0, losses: 0 },
  };

  for (const row of getWinsLossesByDifficultyStmt.all()) {
    const key = String(row.difficulty || 'unknown').toLowerCase();
    winsLossesByDifficulty[key] = {
      wins: row.wins,
      losses: row.losses,
    };
  }

  const recentGames = getRecentGames(20);

  return {
    totalGames,
    pvpGames,
    pveGames,
    averageMoves,
    winsLossesByDifficulty,
    recentGames,
  };
}

function resetStats() {
  resetStatsTxn();
}

module.exports = {
  createGame,
  saveMove,
  completeGame,
  getGameMoves,
  getRecentGames,
  getStats,
  resetStats,
};
