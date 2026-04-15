'use strict';

const NimAI = {
  nimSum(heaps) {
    return heaps.reduce((xor, h) => xor ^ h, 0);
  },

  findOptimalMoves(heaps) {
    const ns = this.nimSum(heaps);
    if (ns === 0) return [];
    const moves = [];
    for (let i = 0; i < heaps.length; i++) {
      const target = heaps[i] ^ ns;
      if (target < heaps[i]) {
        moves.push({ heapIndex: i, stonesToTake: heaps[i] - target, remaining: target });
      }
    }
    return moves;
  },

  getRandomMove(heaps) {
    const nonEmpty = heaps
      .map((size, index) => ({ size, index }))
      .filter((h) => h.size > 0);
    if (nonEmpty.length === 0) return null;
    const picked = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
    const stonesToTake = Math.floor(Math.random() * picked.size) + 1;
    return { heapIndex: picked.index, stonesToTake, remaining: picked.size - stonesToTake };
  },

  getMediumMove(heaps) {
    const optimal = this.findOptimalMoves(heaps);
    if (optimal.length > 0 && Math.random() < 0.85) {
      return optimal[Math.floor(Math.random() * optimal.length)];
    }
    return this.getRandomMove(heaps);
  },

  getHardMove(heaps) {
    const optimal = this.findOptimalMoves(heaps);
    if (optimal.length > 0) return optimal[0];

    const max = Math.max(...heaps);
    const idx = heaps.indexOf(max);
    if (idx === -1 || max === 0) return null;
    return { heapIndex: idx, stonesToTake: 1, remaining: max - 1 };
  },

  getMove(heaps, difficulty) {
    const level = String(difficulty || '').toLowerCase();
    if (level === 'medium') return this.getMediumMove(heaps);
    if (level === 'hard') return this.getHardMove(heaps);
    return this.getRandomMove(heaps);
  },

  getHint(heaps) {
    const ns = this.nimSum(heaps);
    const optimal = this.findOptimalMoves(heaps);
    if (ns !== 0 && optimal.length > 0) {
      const move = optimal[0];
      return {
        type: 'winning',
        message: `Strong move: take ${move.stonesToTake} from Row ${move.heapIndex + 1} to leave ${move.remaining}. This makes the nim-sum 0, which is the key target in Nim strategy.`,
        suggestion: { heapIndex: move.heapIndex, stonesToTake: move.stonesToTake },
      };
    }
    return {
      type: 'losing',
      message: 'You are currently in a losing position (nim-sum is 0) against perfect play. Try to complicate the position and hope for an opponent mistake.',
      suggestion: null,
    };
  },
};

window.NimAI = NimAI;
