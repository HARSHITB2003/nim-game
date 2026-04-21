'use strict';

const NimAI = {
  nimSum(heaps) {
    return heaps.reduce((xor, h) => xor ^ h, 0);
  },

  grundy(heap, maxTake) {
    if (!maxTake || maxTake < 1) return heap;
    return heap % (maxTake + 1);
  },

  gameGrundy(heaps, maxTake) {
    return heaps.reduce((xor, h) => xor ^ NimAI.grundy(h, maxTake), 0);
  },

  findOptimalMoves(heaps, maxTake) {
    if (maxTake && maxTake >= 1) {
      return NimAI.findOptimalMovesRestricted(heaps, maxTake);
    }

    const nimSum = this.nimSum(heaps);
    if (nimSum === 0) return [];

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

  findOptimalMovesRestricted(heaps, maxTake) {
    const total = NimAI.gameGrundy(heaps, maxTake);
    if (total === 0) return [];

    const moves = [];
    for (let i = 0; i < heaps.length; i += 1) {
      const heap = heaps[i];
      if (heap === 0) continue;
      const desired = total ^ NimAI.grundy(heap, maxTake);
      if (desired > maxTake) continue;
      for (let candidate = desired; candidate < heap; candidate += maxTake + 1) {
        const stonesToTake = heap - candidate;
        if (stonesToTake >= 1 && stonesToTake <= maxTake) {
          moves.push({ heapIndex: i, stonesToTake, remaining: candidate });
        }
      }
    }
    return moves;
  },

  getRandomMove(heaps, maxTake) {
    const nonEmpty = heaps
      .map((size, index) => ({ size, index }))
      .filter((h) => h.size > 0);

    if (nonEmpty.length === 0) return null;

    const { size, index } = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
    const cap = maxTake && maxTake >= 1 ? Math.min(maxTake, size) : size;
    const stonesToTake = Math.floor(Math.random() * cap) + 1;

    return { heapIndex: index, stonesToTake, remaining: size - stonesToTake };
  },

  getEasyMove(heaps, maxTake) {
    return this.getRandomMove(heaps, maxTake);
  },

  getMediumMove(heaps, maxTake) {
    const optimalMoves = this.findOptimalMoves(heaps, maxTake);
    if (optimalMoves.length > 0 && Math.random() < 0.85) {
      return optimalMoves[Math.floor(Math.random() * optimalMoves.length)];
    }
    return this.getRandomMove(heaps, maxTake);
  },

  getHardMove(heaps, maxTake) {
    const optimalMoves = this.findOptimalMoves(heaps, maxTake);
    if (optimalMoves.length > 0) {
      return optimalMoves[0];
    }

    const max = Math.max(...heaps);
    const heapIndex = heaps.indexOf(max);
    if (heapIndex === -1 || max === 0) return null;

    return { heapIndex, stonesToTake: 1, remaining: max - 1 };
  },

  getMove(heaps, difficulty, maxTake) {
    const level = String(difficulty || '').toLowerCase();

    if (level === 'easy') {
      return this.getEasyMove(heaps, maxTake);
    }

    if (level === 'medium') {
      return this.getMediumMove(heaps, maxTake);
    }

    return this.getHardMove(heaps, maxTake);
  },

  getHint(heaps, maxTake) {
    const restricted = maxTake && maxTake >= 1;
    const optimalMoves = this.findOptimalMoves(heaps, maxTake);
    const losingNow = restricted
      ? NimAI.gameGrundy(heaps, maxTake) === 0
      : this.nimSum(heaps) === 0;

    if (!losingNow && optimalMoves.length > 0) {
      const move = optimalMoves[0];
      const explain = restricted
        ? `This balances the Sprague–Grundy values (each heap counts modulo ${maxTake + 1}).`
        : 'This makes the nim-sum 0, which is the key target in Nim strategy.';

      return {
        type: 'winning',
        message: `Strong move: take ${move.stonesToTake} from Row ${move.heapIndex + 1} to leave ${move.remaining}. ${explain}`,
        suggestion: {
          heapIndex: move.heapIndex,
          stonesToTake: move.stonesToTake,
        },
      };
    }

    const losingMsg = restricted
      ? `You are in a losing position under the "max ${maxTake} per move" rule. Try to complicate the board and hope for an opponent mistake.`
      : 'You are currently in a losing position (nim-sum is 0) against perfect play. Try to complicate the position and hope for an opponent mistake.';

    return {
      type: 'losing',
      message: losingMsg,
      suggestion: null,
    };
  },
};

module.exports = {
  NimAI,
};
