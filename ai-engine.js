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

  getAllMoves(heaps) {
    const moves = [];
    for (let i = 0; i < heaps.length; i += 1) {
      for (let t = 1; t <= heaps[i]; t += 1) {
        moves.push({ heapIndex: i, stonesToTake: t, remaining: heaps[i] - t });
      }
    }
    return moves;
  },

  getSafeRandomMove(heaps) {
    const allMoves = this.getAllMoves(heaps);
    if (allMoves.length === 0) return null;

    const safe = allMoves.filter(m => {
      const after = [...heaps];
      after[m.heapIndex] -= m.stonesToTake;
      if (after.every(h => h === 0)) return false;
      return this.nimSum(after) !== 0;
    });

    const pool = safe.length > 0 ? safe : allMoves;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  getSmartMove(heaps) {
    const misere = this.getMisereMove(heaps);
    if (misere) return misere;

    const optimalMoves = this.findOptimalMoves(heaps);
    if (optimalMoves.length > 0) {
      return optimalMoves[Math.floor(Math.random() * optimalMoves.length)];
    }

    return null;
  },

  getEasyMove(heaps) {
    const smart = this.getSmartMove(heaps);
    if (smart && Math.random() < 0.5) return smart;

    return this.getSafeRandomMove(heaps) || smart;
  },

  getMediumMove(heaps) {
    const smart = this.getSmartMove(heaps);
    if (smart && Math.random() < 0.85) return smart;

    return this.getSafeRandomMove(heaps) || smart;
  },

  getHardMove(heaps) {
    const misere = this.getMisereMove(heaps);
    if (misere) return misere;

    const optimalMoves = this.findOptimalMoves(heaps);
    if (optimalMoves.length > 0) {
      return optimalMoves[0];
    }

    const allMoves = this.getAllMoves(heaps);
    if (allMoves.length === 0) return null;

    let bestMove = allMoves[0];
    let bestScore = -1;

    for (const move of allMoves) {
      const after = [...heaps];
      after[move.heapIndex] -= move.stonesToTake;

      if (after.every(h => h === 0)) continue;

      const nonEmpty = after.filter(h => h > 0).length;
      const maxHeap = Math.max(...after);
      const score = nonEmpty * 10 + maxHeap;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
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
