'use strict';

/**
 * Nim AI utilities based on Sprague-Grundy theory.
 *
 * Why XOR works in Nim:
 * In normal Nim, each heap behaves like an independent impartial game whose Grundy value is
 * the heap size itself. The XOR (nim-sum) of all heap sizes is the combined game state value.
 * - nim-sum === 0: mathematically losing position (with perfect play).
 * - nim-sum !== 0: there exists at least one move that makes nim-sum become 0,
 *   putting the opponent into a losing position.
 */
const NimAI = {
  /**
   * Returns the XOR of all heap values.
   * @param {number[]} heaps
   * @returns {number}
   */
  nimSum(heaps) {
    return heaps.reduce((xor, h) => xor ^ h, 0);
  },

  /**
   * Finds all winning moves that turn the position into nim-sum 0.
   * @param {number[]} heaps
   * @returns {{ heapIndex: number, stonesToTake: number, remaining: number }[]}
   */
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

  /**
   * Easy mode: random legal move.
   * @param {number[]} heaps
   * @returns {{ heapIndex: number, stonesToTake: number, remaining: number } | null}
   */
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

  /**
   * Medium mode: 50% chance to play an optimal move when available.
   * @param {number[]} heaps
   * @returns {{ heapIndex: number, stonesToTake: number, remaining: number } | null}
   */
  getMediumMove(heaps) {
    const optimalMoves = this.findOptimalMoves(heaps);

    if (optimalMoves.length > 0 && Math.random() < 0.5) {
      return optimalMoves[Math.floor(Math.random() * optimalMoves.length)];
    }

    return this.getEasyMove(heaps);
  },

  /**
   * Hard mode: always play optimally when possible.
   * If no optimal move exists, remove 1 from the largest heap.
   * @param {number[]} heaps
   * @returns {{ heapIndex: number, stonesToTake: number, remaining: number } | null}
   */
  getHardMove(heaps) {
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

  /**
   * Dispatches AI move selection by difficulty.
   * @param {number[]} heaps
   * @param {string} difficulty
   * @returns {{ heapIndex: number, stonesToTake: number, remaining: number } | null}
   */
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

  /**
   * Provides a user-facing hint based on nim-sum analysis.
   * @param {number[]} heaps
   * @returns {{ type: 'winning' | 'losing', message: string, suggestion: { heapIndex: number, stonesToTake: number } | null }}
   */
  getHint(heaps) {
    const nimSum = this.nimSum(heaps);

    if (nimSum !== 0) {
      const move = this.findOptimalMoves(heaps)[0];

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
