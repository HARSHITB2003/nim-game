'use strict';

const path = require('path');
const Database = require('better-sqlite3');

const isVercel = !!process.env.VERCEL;
const dbPath = isVercel ? ':memory:' : path.join(__dirname, 'nim-game.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL,
    difficulty TEXT,
    heap_config TEXT NOT NULL,
    winner TEXT,
    winner_name TEXT,
    player1_name TEXT DEFAULT 'Player 1',
    player2_name TEXT DEFAULT 'Player 2',
    total_moves INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    completed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS moves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player TEXT NOT NULL,
    heap_index INTEGER NOT NULL,
    stones_taken INTEGER NOT NULL,
    heap_state_after TEXT NOT NULL,
    move_number INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
  CREATE INDEX IF NOT EXISTS idx_games_completed ON games(completed);
  CREATE INDEX IF NOT EXISTS idx_games_mode ON games(mode, completed);
`);

// Migrate existing tables — add columns that may not exist yet
const addColumnSafe = (table, column, type) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch (_) { /* column already exists */ }
};

addColumnSafe('games', 'winner_name', 'TEXT');
addColumnSafe('games', 'player1_name', 'TEXT');
addColumnSafe('games', 'player2_name', 'TEXT');
addColumnSafe('games', 'completed_at', 'TEXT');

// Ensure indexes exist on older databases
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
  CREATE INDEX IF NOT EXISTS idx_games_completed ON games(completed);
  CREATE INDEX IF NOT EXISTS idx_games_mode ON games(mode, completed);
`);

function toText(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

// --- Prepared statements ---

const createGameStmt = db.prepare(`
  INSERT INTO games (mode, difficulty, heap_config, player1_name, player2_name)
  VALUES (?, ?, ?, ?, ?)
`);

const saveMoveStmt = db.prepare(`
  INSERT INTO moves (game_id, player, heap_index, stones_taken, heap_state_after, move_number)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const deleteMovesAfterStmt = db.prepare(`
  DELETE FROM moves
  WHERE game_id = ? AND move_number > ?
`);

const deleteAllMovesForGameStmt = db.prepare(`
  DELETE FROM moves
  WHERE game_id = ?
`);

const completeGameStmt = db.prepare(`
  UPDATE games
  SET winner = ?, winner_name = ?, total_moves = ?, completed = 1, completed_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const getGameStmt = db.prepare(`
  SELECT id, mode, difficulty, heap_config, winner, winner_name,
         player1_name, player2_name, total_moves, created_at, completed_at, completed
  FROM games
  WHERE id = ?
`);

const getGameMovesStmt = db.prepare(`
  SELECT id, game_id, player, heap_index, stones_taken, heap_state_after, move_number, created_at
  FROM moves
  WHERE game_id = ?
  ORDER BY move_number ASC
`);

const getMoveCountStmt = db.prepare(`
  SELECT COUNT(*) AS count FROM moves WHERE game_id = ?
`);

const getRecentGamesStmt = db.prepare(`
  SELECT id, mode, difficulty, heap_config, winner, winner_name, player1_name, player2_name,
         total_moves, created_at, completed_at, completed
  FROM games
  WHERE completed = 1
  ORDER BY completed_at DESC, id DESC
  LIMIT ?
`);

const getTotalGamesStmt = db.prepare(`
  SELECT COUNT(*) AS count FROM games WHERE completed = 1
`);

const getPvpGamesStmt = db.prepare(`
  SELECT COUNT(*) AS count FROM games WHERE mode = 'pvp' AND completed = 1
`);

const getPveGamesStmt = db.prepare(`
  SELECT COUNT(*) AS count FROM games WHERE mode = 'pve' AND completed = 1
`);

const getAverageMovesStmt = db.prepare(`
  SELECT COALESCE(AVG(total_moves), 0) AS average_moves
  FROM games
  WHERE completed = 1 AND total_moves > 0
`);

const getWinsLossesByDifficultyStmt = db.prepare(`
  SELECT
    COALESCE(difficulty, 'unknown') AS difficulty,
    SUM(CASE WHEN winner = 'player1' THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN winner = 'player2' THEN 1 ELSE 0 END) AS losses
  FROM games
  WHERE mode = 'pve' AND completed = 1
  GROUP BY COALESCE(difficulty, 'unknown')
`);

const cleanupAbandonedStmt = db.prepare(`
  DELETE FROM games
  WHERE completed = 0
    AND created_at < datetime('now', '-24 hours')
`);

const resetStatsTxn = db.transaction(() => {
  db.prepare('DELETE FROM moves').run();
  db.prepare('DELETE FROM games').run();
});

// --- Public API ---

function createGame(mode, difficulty, heapConfig, player1Name, player2Name) {
  const result = createGameStmt.run(
    mode,
    difficulty ?? null,
    toText(heapConfig),
    player1Name || 'Player 1',
    player2Name || (mode === 'pve' ? 'NIM-AI' : 'Player 2')
  );
  return Number(result.lastInsertRowid);
}

function saveMove(gameId, player, heapIndex, stonesTaken, heapStateAfter, moveNumber) {
  saveMoveStmt.run(gameId, player, heapIndex, stonesTaken, toText(heapStateAfter), moveNumber);
}

function undoMoves(gameId, keepMoveCount) {
  if (keepMoveCount <= 0) {
    deleteAllMovesForGameStmt.run(gameId);
  } else {
    deleteMovesAfterStmt.run(gameId, keepMoveCount);
  }
}

function completeGame(gameId, winner, winnerName, totalMoves) {
  completeGameStmt.run(winner ?? null, winnerName ?? null, totalMoves ?? 0, gameId);
}

function getGame(gameId) {
  return getGameStmt.get(gameId) || null;
}

function getGameMoves(gameId) {
  return getGameMovesStmt.all(gameId);
}

function getMoveCount(gameId) {
  return getMoveCountStmt.get(gameId).count;
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
    if (winsLossesByDifficulty[key]) {
      winsLossesByDifficulty[key] = {
        wins: row.wins,
        losses: row.losses,
      };
    }
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

function cleanupAbandoned() {
  const result = cleanupAbandonedStmt.run();
  return result.changes;
}

function resetStats() {
  resetStatsTxn();
}

module.exports = {
  createGame,
  saveMove,
  undoMoves,
  completeGame,
  getGame,
  getGameMoves,
  getMoveCount,
  getRecentGames,
  getStats,
  cleanupAbandoned,
  resetStats,
};
