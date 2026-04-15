'use strict';

const NimAI = {
  nimSum(heaps) {
    return heaps.reduce((xor, h) => xor ^ h, 0);
  },

  findOptimalMoves(heaps) {
    const nimSum = this.nimSum(heaps);

    if (nimSum === 0) {
      return [];
    }

    const optimalMoves = [];

    for (let i = 0; i < heaps.length; i += 1) {
      const target = heaps[i] ^ nimSum;

      if (target < heaps[i]) {
        optimalMoves.push({
          heapIndex: i,
          stonesToTake: heaps[i] - target,
          remaining: target,
        });
      }
    }

    return optimalMoves;
  },

  getRandomMove(heaps) {
    const nonEmpty = heaps
      .map((size, index) => ({ size, index }))
      .filter((h) => h.size > 0);

    if (nonEmpty.length === 0) return null;

    const { size, index } = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
    const stonesToTake = Math.floor(Math.random() * size) + 1;

    return { heapIndex: index, stonesToTake, remaining: size - stonesToTake };
  },

  getEasyMove(heaps) {
    return this.getRandomMove(heaps);
  },

  getMediumMove(heaps) {
    const optimalMoves = this.findOptimalMoves(heaps);
    if (optimalMoves.length > 0 && Math.random() < 0.85) {
      return optimalMoves[Math.floor(Math.random() * optimalMoves.length)];
    }
    return this.getRandomMove(heaps);
  },

  getHardMove(heaps) {
    const optimalMoves = this.findOptimalMoves(heaps);
    if (optimalMoves.length > 0) {
      return optimalMoves[0];
    }

    // Losing position — take 1 from largest heap to give opponent most rope
    const max = Math.max(...heaps);
    const heapIndex = heaps.indexOf(max);
    if (heapIndex === -1 || max === 0) return null;

    return { heapIndex, stonesToTake: 1, remaining: max - 1 };
  },

  getMove(heaps, difficulty) {
    const level = String(difficulty || '').toLowerCase();

    if (level === 'easy') {
      return this.getEasyMove(heaps);
    }

    if (level === 'medium') {
      return this.getMediumMove(heaps);
    }

    return this.getHardMove(heaps);
  },

  getHint(heaps) {
    const nimSum = this.nimSum(heaps);
    const optimalMoves = this.findOptimalMoves(heaps);

    if (nimSum !== 0 && optimalMoves.length > 0) {
      const move = optimalMoves[0];

      return {
        type: 'winning',
        message: `Strong move: take ${move.stonesToTake} from Row ${move.heapIndex + 1} to leave ${move.remaining}. This makes the nim-sum 0, which is the key target in Nim strategy.`,
        suggestion: {
          heapIndex: move.heapIndex,
          stonesToTake: move.stonesToTake,
        },
      };
    }

    return {
      type: 'losing',
      message: 'You are currently in a losing position (nim-sum is 0) against perfect play. Try to complicate the position and hope for an opponent mistake.',
      suggestion: null,
    };
  },
};

module.exports = {
  NimAI,
};
