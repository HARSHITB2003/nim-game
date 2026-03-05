'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');

const { NimGame } = require('./game-logic');
const { NimAI } = require('./ai-engine');
const {
  createGame,
  saveMove,
  completeGame,
  getStats,
  resetStats,
} = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const activeGames = new Map();

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

app.post('/api/game/start', (req, res) => {
  try {
    const { mode, difficulty, heaps } = req.body || {};

    if (!Array.isArray(heaps) || heaps.length === 0) {
      res.status(400).json({ error: 'heaps must be a non-empty array.' });
      return;
    }

    const game = new NimGame(heaps);
    const gameId = createGame(mode, difficulty, heaps);

    activeGames.set(gameId, {
      game,
      mode,
      difficulty,
    });

    res.json({
      gameId,
      heaps: [...game.heaps],
      currentPlayer: game.currentPlayer,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start game.' });
  }
});

app.post('/api/game/:id/move', (req, res) => {
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
      completeGame(gameId, game.winner, game.moveHistory.length);
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
    res.status(500).json({ error: 'Failed to process move.' });
  }
});

app.post('/api/game/:id/undo', (req, res) => {
  try {
    const gameLookup = getActiveGameEntry(req, res);
    if (!gameLookup) {
      return;
    }

    const { entry } = gameLookup;
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

    res.json({
      success: true,
      heaps: [...finalUndo.heaps],
      currentPlayer: finalUndo.currentPlayer,
    });
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to get game state.' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    res.json(getStats());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats.' });
  }
});

app.post('/api/stats/reset', (req, res) => {
  try {
    resetStats();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset stats.' });
  }
});

app.listen(PORT, () => {
  console.log(`Nim server running on http://localhost:${PORT}`);
});
