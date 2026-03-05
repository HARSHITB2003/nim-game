'use strict';

class NimGame {
  constructor(heapSizes) {
    const heaps = Array.isArray(heapSizes) ? [...heapSizes] : [];

    this.initialHeaps = [...heaps];
    this.heaps = [...heaps];
    this.currentPlayer = 'player1';
    this.moveHistory = [];
    this.gameOver = false;
    this.winner = null;
  }

  static getOtherPlayer(player) {
    return player === 'player1' ? 'player2' : 'player1';
  }

  makeMove(heapIndex, stonesToTake) {
    if (this.gameOver) {
      return { valid: false, reason: 'Game is already over.' };
    }

    if (!Number.isInteger(heapIndex) || heapIndex < 0 || heapIndex >= this.heaps.length) {
      return { valid: false, reason: 'Invalid heap index.' };
    }

    if (!Number.isInteger(stonesToTake) || stonesToTake < 1) {
      return { valid: false, reason: 'stonesToTake must be at least 1.' };
    }

    if (this.heaps[heapIndex] < stonesToTake) {
      return { valid: false, reason: 'Not enough stones in selected heap.' };
    }

    const heapsBefore = [...this.heaps];
    const move = {
      heapIndex,
      stonesToTake,
      player: this.currentPlayer,
      heapsBefore,
    };

    this.moveHistory.push(move);
    this.heaps[heapIndex] -= stonesToTake;

    if (this.heaps.every((heap) => heap === 0)) {
      this.gameOver = true;
      this.winner = NimGame.getOtherPlayer(move.player);
    }

    this.currentPlayer = NimGame.getOtherPlayer(this.currentPlayer);

    return {
      valid: true,
      heaps: [...this.heaps],
      gameOver: this.gameOver,
      winner: this.winner,
      move,
    };
  }

  undo() {
    if (this.moveHistory.length === 0) {
      return null;
    }

    const move = this.moveHistory.pop();

    this.heaps = [...move.heapsBefore];
    this.currentPlayer = move.player;
    this.gameOver = false;
    this.winner = null;

    return {
      heaps: [...this.heaps],
      currentPlayer: this.currentPlayer,
    };
  }

  getState() {
    return {
      heaps: [...this.heaps],
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
      moveHistory: this.moveHistory,
      moveCount: this.moveHistory.length,
    };
  }

  reset(newHeaps) {
    const heaps = Array.isArray(newHeaps) ? [...newHeaps] : [...this.initialHeaps];

    this.initialHeaps = [...heaps];
    this.heaps = [...heaps];
    this.currentPlayer = 'player1';
    this.moveHistory = [];
    this.gameOver = false;
    this.winner = null;
  }
}

module.exports = {
  NimGame,
};
