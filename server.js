'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');

const { NimGame } = require('./game-logic');
const { NimAI } = require('./ai-engine');
const {
  createGame,
  saveMove,
  undoMoves,
  completeGame,
  getStats,
  cleanupAbandoned,
  resetStats,
} = require('./database');

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const activeGames = new Map();

const DIFFICULTY_DELAYS = {
  easy: { min: 200, max: 500 },
  medium: { min: 600, max: 1200 },
  hard: { min: 1000, max: 2000 },
};

function aiDelay(difficulty) {
  const range = DIFFICULTY_DELAYS[difficulty] || DIFFICULTY_DELAYS.easy;
  const ms = range.min + Math.floor(Math.random() * (range.max - range.min));
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

function parseGameId(rawId) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getActiveGameEntry(req, res) {
  const gameId = parseGameId(req.params.id);

  if (!gameId) {
    res.status(404).json({ error: 'Game not found.' });
    return null;
  }

  const entry = activeGames.get(gameId);
  if (!entry) {
    res.status(404).json({ error: 'Game not found.' });
    return null;
  }

  return { gameId, entry };
}

// Clean up abandoned games on startup
try {
  const cleaned = cleanupAbandoned();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} abandoned game(s) from database.`);
  }
} catch (_) { /* ignore */ }

app.post('/api/game/start', (req, res) => {
  try {
    const { mode, difficulty, heaps, player1Name, player2Name } = req.body || {};

    if (!Array.isArray(heaps) || heaps.length === 0) {
      res.status(400).json({ error: 'heaps must be a non-empty array.' });
      return;
    }

    const validHeaps = heaps.every(h => Number.isInteger(h) && h >= 0);
    if (!validHeaps || heaps.length > 10 || heaps.some(h => h > 100)) {
      res.status(400).json({ error: 'Invalid heap config. Use 1-10 heaps with values 0-100.' });
      return;
    }

    const p1 = (player1Name || 'Player 1').trim();
    const p2 = mode === 'pve' ? 'NIM-AI' : (player2Name || 'Player 2').trim();

    const game = new NimGame(heaps);
    const gameId = createGame(mode, difficulty, heaps, p1, p2);

    activeGames.set(gameId, {
      game,
      mode,
      difficulty,
      playerNames: { player1: p1, player2: p2 },
    });

    res.json({
      gameId,
      heaps: [...game.heaps],
      currentPlayer: game.currentPlayer,
    });
  } catch (error) {
    console.error('start game error:', error);
    res.status(500).json({ error: 'Failed to start game.' });
  }
});

app.post('/api/game/:id/move', async (req, res) => {
  try {
    const gameLookup = getActiveGameEntry(req, res);
    if (!gameLookup) {
      return;
    }

    const { gameId, entry } = gameLookup;
    const { game, mode, difficulty } = entry;
    const { heapIndex, stonesToTake } = req.body || {};

    if (!Number.isInteger(heapIndex) || !Number.isInteger(stonesToTake)) {
      res.status(400).json({ valid: false, reason: 'heapIndex and stonesToTake must be numbers.' });
      return;
    }

    const playerResult = game.makeMove(heapIndex, stonesToTake);
    if (!playerResult.valid) {
      res.json(playerResult);
      return;
    }

    const playerMove = playerResult.move;
    saveMove(
      gameId,
      playerMove.player,
      playerMove.heapIndex,
      playerMove.stonesToTake,
      game.heaps,
      game.moveHistory.length
    );

    let aiMove = null;

    if (mode === 'pve' && !game.gameOver && game.currentPlayer === 'player2') {
      const aiChoice = NimAI.getMove(game.heaps, difficulty);

      if (aiChoice) {
        await aiDelay(difficulty);
        const aiResult = game.makeMove(aiChoice.heapIndex, aiChoice.stonesToTake);

        if (aiResult.valid) {
          aiMove = aiResult.move;
          saveMove(
            gameId,
            aiMove.player,
            aiMove.heapIndex,
            aiMove.stonesToTake,
            game.heaps,
            game.moveHistory.length
          );
        }
      }
    }

    if (game.gameOver) {
      const winnerName = entry.playerNames
        ? entry.playerNames[game.winner] || game.winner
        : game.winner;
      completeGame(gameId, game.winner, winnerName, game.moveHistory.length);
    }

    res.json({
      valid: true,
      heaps: [...game.heaps],
      currentPlayer: game.currentPlayer,
      gameOver: game.gameOver,
      winner: game.winner,
      playerMove,
      aiMove,
    });
  } catch (error) {
    console.error('move error:', error);
    res.status(500).json({ error: 'Failed to process move.' });
  }
});

app.post('/api/game/:id/undo', (req, res) => {
  try {
    const gameLookup = getActiveGameEntry(req, res);
    if (!gameLookup) {
      return;
    }

    const { gameId, entry } = gameLookup;
    const { game, mode } = entry;

    const firstUndo = game.undo();
    if (!firstUndo) {
      res.json({ success: false, heaps: [...game.heaps], currentPlayer: game.currentPlayer });
      return;
    }

    let finalUndo = firstUndo;

    if (mode === 'pve') {
      const secondUndo = game.undo();
      if (secondUndo) {
        finalUndo = secondUndo;
      }
    }

    // Sync the database: delete moves that were undone
    undoMoves(gameId, game.moveHistory.length);

    res.json({
      success: true,
      heaps: [...finalUndo.heaps],
      currentPlayer: finalUndo.currentPlayer,
    });
  } catch (error) {
    console.error('undo error:', error);
    res.status(500).json({ error: 'Failed to undo move.' });
  }
});

app.get('/api/game/:id/hint', (req, res) => {
  try {
    const gameLookup = getActiveGameEntry(req, res);
    if (!gameLookup) {
      return;
    }

    const { entry } = gameLookup;
    const hint = NimAI.getHint(entry.game.heaps);

    res.json(hint);
  } catch (error) {
    console.error('hint error:', error);
    res.status(500).json({ error: 'Failed to get hint.' });
  }
});

app.get('/api/game/:id/state', (req, res) => {
  try {
    const gameLookup = getActiveGameEntry(req, res);
    if (!gameLookup) {
      return;
    }

    const { entry } = gameLookup;
    res.json(entry.game.getState());
  } catch (error) {
    console.error('state error:', error);
    res.status(500).json({ error: 'Failed to get game state.' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    res.json(getStats());
  } catch (error) {
    console.error('stats error:', error);
    res.status(500).json({ error: 'Failed to get stats.' });
  }
});

app.post('/api/stats/reset', (req, res) => {
  try {
    resetStats();
    res.json({ success: true });
  } catch (error) {
    console.error('reset stats error:', error);
    res.status(500).json({ error: 'Failed to reset stats.' });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Nim server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
