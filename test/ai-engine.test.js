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
    assert.strictEqual(NimAI.nimSum(after), 0, 'resulting nim-sum should be 0');
  });

  it('returns legal move from losing position [1,3,5,7]', () => {
    const move = NimAI.getHardMove([1, 3, 5, 7]);
    assert.ok(move, 'should return a move');
    assert.ok(move.stonesToTake >= 1, 'should take at least 1 stone');
    assert.ok(move.heapIndex >= 0 && move.heapIndex < 4, 'valid heap index');
  });

  it('takes 1 from largest heap when in losing position', () => {
    const move = NimAI.getHardMove([1, 3, 5, 7]);
    assert.strictEqual(move.heapIndex, 3, 'should pick largest heap');
    assert.strictEqual(move.stonesToTake, 1);
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
