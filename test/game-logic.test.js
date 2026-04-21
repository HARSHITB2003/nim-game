'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { NimGame } = require('../game-logic');

describe('NimGame constructor', () => {
  it('creates game with correct initial heaps and player1 first', () => {
    const game = new NimGame([1, 3, 5, 7]);
    assert.deepStrictEqual(game.heaps, [1, 3, 5, 7]);
    assert.strictEqual(game.currentPlayer, 'player1');
    assert.strictEqual(game.gameOver, false);
    assert.strictEqual(game.winner, null);
  });
});

describe('NimGame.makeMove', () => {
  it('valid move returns valid:true and updates heaps', () => {
    const game = new NimGame([3, 5]);
    const result = game.makeMove(0, 2);
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.heaps, [1, 5]);
  });

  it('invalid heap index returns valid:false', () => {
    const game = new NimGame([3, 5]);
    const result = game.makeMove(5, 1);
    assert.strictEqual(result.valid, false);
  });

  it('stonesToTake > heap size returns valid:false', () => {
    const game = new NimGame([3, 5]);
    const result = game.makeMove(0, 10);
    assert.strictEqual(result.valid, false);
  });

  it('move on finished game returns valid:false', () => {
    const game = new NimGame([1]);
    game.makeMove(0, 1);
    const result = game.makeMove(0, 1);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'Game is already over.');
  });
});

describe('NimGame win condition (normal play)', () => {
  it('player who takes last stone WINS', () => {
    const game = new NimGame([1]);
    const result = game.makeMove(0, 1);
    assert.strictEqual(result.gameOver, true);
    assert.strictEqual(result.winner, 'player1', 'player1 took last stone, so player1 wins');
  });

  it('multi-heap game ends correctly', () => {
    const game = new NimGame([1, 1]);
    game.makeMove(0, 1);
    const result = game.makeMove(1, 1);
    assert.strictEqual(result.gameOver, true);
    assert.strictEqual(result.winner, 'player2', 'player2 took last stone, so player2 wins');
  });
});

describe('NimGame.undo', () => {
  it('restores heaps and currentPlayer to previous state', () => {
    const game = new NimGame([3, 5]);
    game.makeMove(0, 2);
    const result = game.undo();
    assert.deepStrictEqual(result.heaps, [3, 5]);
    assert.strictEqual(result.currentPlayer, 'player1');
  });

  it('returns null on empty history', () => {
    const game = new NimGame([3, 5]);
    assert.strictEqual(game.undo(), null);
  });

  it('clears gameOver and winner after undo', () => {
    const game = new NimGame([1]);
    game.makeMove(0, 1);
    assert.strictEqual(game.gameOver, true);
    game.undo();
    assert.strictEqual(game.gameOver, false);
    assert.strictEqual(game.winner, null);
  });
});

describe('NimGame.getState', () => {
  it('returns current state snapshot', () => {
    const game = new NimGame([3, 5]);
    game.makeMove(0, 1);
    const state = game.getState();
    assert.deepStrictEqual(state.heaps, [2, 5]);
    assert.strictEqual(state.currentPlayer, 'player2');
    assert.strictEqual(state.gameOver, false);
    assert.strictEqual(state.moveCount, 1);
  });
});

describe('NimGame.reset', () => {
  it('restores to initial state', () => {
    const game = new NimGame([3, 5]);
    game.makeMove(0, 2);
    game.reset();
    assert.deepStrictEqual(game.heaps, [3, 5]);
    assert.strictEqual(game.currentPlayer, 'player1');
    assert.strictEqual(game.gameOver, false);
    assert.strictEqual(game.moveHistory.length, 0);
  });
});

describe('NimGame maxTake (restricted moves)', () => {
  it('rejects a move that exceeds maxTake', () => {
    const game = new NimGame([10, 10], { maxTake: 5 });
    const result = game.makeMove(0, 6);
    assert.strictEqual(result.valid, false);
    assert.ok(/at most 5/.test(result.reason));
  });

  it('accepts a move at the maxTake limit', () => {
    const game = new NimGame([10, 10], { maxTake: 5 });
    const result = game.makeMove(0, 5);
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.heaps, [5, 10]);
  });

  it('defaults to unlimited when maxTake not provided', () => {
    const game = new NimGame([10, 10]);
    assert.strictEqual(game.maxTake, 0);
    const result = game.makeMove(0, 10);
    assert.strictEqual(result.valid, true);
  });
});
