'use strict';

class NimGame {
  constructor(heapSizes, options = {}) {
    this.heaps = Array.isArray(heapSizes) ? [...heapSizes] : [];
    const rawMax = typeof options === 'object' && options ? options.maxTake : options;
    const parsedMax = Number(rawMax);
    this.maxTake = Number.isInteger(parsedMax) && parsedMax >= 1 ? parsedMax : 0;
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
    if (this.maxTake > 0 && stonesToTake > this.maxTake) {
      return { valid: false, reason: `You can take at most ${this.maxTake} per move.` };
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

    if (this.heaps.every((h) => h === 0)) {
      this.gameOver = true;
      this.winner = move.player;
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
    if (this.moveHistory.length === 0) return null;
    const move = this.moveHistory.pop();
    this.heaps = [...move.heapsBefore];
    this.currentPlayer = move.player;
    this.gameOver = false;
    this.winner = null;
    return { heaps: [...this.heaps], currentPlayer: this.currentPlayer };
  }
}

window.NimGame = NimGame;
