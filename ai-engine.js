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

  getMisereMove(heaps) {
    const largeHeaps = heaps.filter(h => h > 1);
    const onesCount = heaps.filter(h => h === 1).length;

    if (largeHeaps.length === 0) {
      const idx = heaps.indexOf(1);
      if (idx === -1) return null;
      return { heapIndex: idx, stonesToTake: 1, remaining: 0 };
    }

    if (largeHeaps.length === 1) {
      const idx = heaps.findIndex(h => h > 1);
      const leaveAs = (onesCount % 2 === 0) ? 1 : 0;
      return {
        heapIndex: idx,
        stonesToTake: heaps[idx] - leaveAs,
        remaining: leaveAs,
      };
    }

    return null;
  },

  getEasyMove(heaps) {
    const nonEmptyHeapIndexes = heaps
      .map((size, index) => ({ size, index }))
      .filter((heap) => heap.size > 0)
      .map((heap) => heap.index);

    if (nonEmptyHeapIndexes.length === 0) {
      return null;
    }

    const heapIndex = nonEmptyHeapIndexes[Math.floor(Math.random() * nonEmptyHeapIndexes.length)];
    const stonesToTake = Math.floor(Math.random() * heaps[heapIndex]) + 1;

    return {
      heapIndex,
      stonesToTake,
      remaining: heaps[heapIndex] - stonesToTake,
    };
  },

  getMediumMove(heaps) {
    if (Math.random() < 0.5) {
      const misere = this.getMisereMove(heaps);
      if (misere) return misere;

      const optimalMoves = this.findOptimalMoves(heaps);
      if (optimalMoves.length > 0) {
        return optimalMoves[Math.floor(Math.random() * optimalMoves.length)];
      }
    }

    return this.getEasyMove(heaps);
  },

  getHardMove(heaps) {
    const misere = this.getMisereMove(heaps);
    if (misere) return misere;

    const optimalMoves = this.findOptimalMoves(heaps);
    if (optimalMoves.length > 0) {
      return optimalMoves[0];
    }

    let heapIndex = -1;
    let largest = 0;

    for (let i = 0; i < heaps.length; i += 1) {
      if (heaps[i] > largest) {
        largest = heaps[i];
        heapIndex = i;
      }
    }

    if (heapIndex === -1) {
      return null;
    }

    return {
      heapIndex,
      stonesToTake: 1,
      remaining: heaps[heapIndex] - 1,
    };
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
