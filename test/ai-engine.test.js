'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { NimAI } = require('../ai-engine');

describe('NimAI.getHardMove', () => {
  it('returns winning move from winning position [1,3,5,6]', () => {
    const move = NimAI.getHardMove([1, 3, 5, 6]);
    assert.ok(move, 'should return a move');
    const after = [1, 3, 5, 6];
    after[move.heapIndex] -= move.stonesToTake;
    assert.strictEqual(NimAI.nimSum(after), 0, 'resulting nim-sum should be 0 in midgame');
  });

  it('plays correct misere endgame from [1,1,0] — leaves odd ones', () => {
    const move = NimAI.getHardMove([1, 1, 0]);
    assert.ok(move, 'should return a move');
    const after = [1, 1, 0];
    after[move.heapIndex] -= move.stonesToTake;
    const onesLeft = after.filter(h => h === 1).length;
    assert.strictEqual(onesLeft % 2, 1, 'should leave odd number of size-1 heaps');
  });

  it('handles near-endgame [1,1,5] — reduces large heap correctly', () => {
    const move = NimAI.getHardMove([1, 1, 5]);
    assert.ok(move, 'should return a move');
    const after = [1, 1, 5];
    after[move.heapIndex] -= move.stonesToTake;
    const onesLeft = after.filter(h => h === 1).length;
    assert.ok(after.every(h => h <= 1), 'all heaps should be 0 or 1 after move');
    assert.strictEqual(onesLeft % 2, 1, 'should leave odd number of size-1 heaps');
  });

  it('returns legal move from losing position [1,3,5,7]', () => {
    const move = NimAI.getHardMove([1, 3, 5, 7]);
    assert.ok(move, 'should return a move');
    assert.ok(move.stonesToTake >= 1, 'should take at least 1 stone');
    assert.ok(move.heapIndex >= 0 && move.heapIndex < 4, 'valid heap index');
  });
});

describe('NimAI difficulty levels', () => {
  it('getEasyMove returns a legal move', () => {
    const move = NimAI.getEasyMove([3, 5, 7]);
    assert.ok(move, 'should return a move');
    assert.ok(move.stonesToTake >= 1);
    assert.ok(move.stonesToTake <= [3, 5, 7][move.heapIndex]);
  });

  it('getMediumMove returns a legal move', () => {
    const move = NimAI.getMediumMove([3, 5, 7]);
    assert.ok(move, 'should return a move');
    assert.ok(move.stonesToTake >= 1);
  });

  it('getMediumMove plays optimally roughly 85% over 200 trials', () => {
    let optimalCount = 0;
    const heaps = [3, 4, 5, 6];
    for (let i = 0; i < 200; i++) {
      const move = NimAI.getMediumMove(heaps);
      const after = [...heaps];
      after[move.heapIndex] -= move.stonesToTake;
      if (NimAI.nimSum(after) === 0) {
        optimalCount++;
      }
    }
    const rate = optimalCount / 200;
    assert.ok(rate >= 0.65 && rate <= 0.98, `optimal rate ${rate} should be between 65-98%`);
  });

  it('getMediumMove uses misere-aware logic in endgame', () => {
    const move = NimAI.getMediumMove([1, 1, 3]);
    if (move) {
      const after = [1, 1, 3];
      after[move.heapIndex] -= move.stonesToTake;
      if (after.every(h => h <= 1)) {
        const onesLeft = after.filter(h => h === 1).length;
        assert.strictEqual(onesLeft % 2, 1, 'misere endgame should leave odd ones');
      }
    }
  });
});

describe('NimAI.getHint', () => {
  it('returns winning hint with suggestion when nim-sum != 0', () => {
    const hint = NimAI.getHint([1, 3, 5, 6]);
    assert.strictEqual(hint.type, 'winning');
    assert.ok(hint.suggestion, 'should have a suggestion');
    assert.ok(hint.message.length > 0);
  });

  it('returns losing hint with null suggestion when nim-sum = 0', () => {
    const hint = NimAI.getHint([1, 3, 5, 7]);
    assert.strictEqual(hint.type, 'losing');
    assert.strictEqual(hint.suggestion, null);
  });

  it('does not throw on [0,0,0]', () => {
    assert.doesNotThrow(() => {
      NimAI.getHint([0, 0, 0]);
    });
  });
});
