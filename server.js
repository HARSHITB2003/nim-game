'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');

const { saveGameResult, getStats, resetStats } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Save a completed game result (called by the client after game ends).
 */
app.post('/api/game/save', (req, res) => {
  try {
    const { mode, difficulty, heaps, maxTake, winner, winnerName, player1Name, player2Name, totalMoves } = req.body || {};

    if (!mode || !winner) {
      res.status(400).json({ error: 'mode and winner are required.' });
      return;
    }

    saveGameResult({
      mode,
      difficulty: difficulty ?? null,
      heapConfig: Array.isArray(heaps) ? heaps : [],
      maxTake: Number.isInteger(maxTake) && maxTake > 0 ? maxTake : 0,
      winner,
      winnerName: winnerName ?? winner,
      player1Name: player1Name ?? 'Player 1',
      player2Name: player2Name ?? 'Player 2',
      totalMoves: totalMoves ?? 0,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('save game error:', error);
    res.status(500).json({ error: 'Failed to save game.' });
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

app.listen(PORT, () => {
  console.log(`Nim server running on http://localhost:${PORT}`);
});

module.exports = app;
