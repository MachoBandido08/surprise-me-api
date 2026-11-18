import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeOwnsMatcher} from '../app/matching.js';

test('matches whole words, case-insensitively', () => {
    const owns = makeOwnsMatcher(['gin']);
    assert.equal(owns('Gin'), true);
    assert.equal(owns('London Dry Gin'), true);
    assert.equal(owns('Ginger'), false);
    assert.equal(owns('Original'), false);
    assert.equal(owns(undefined), false);
});

test('plain gin does not satisfy sloe gin, but typing sloe gin does', () => {
    assert.equal(makeOwnsMatcher(['gin'])('Sloe gin'), false);
    assert.equal(makeOwnsMatcher(['sloe gin'])('Sloe gin'), true);
});

test('look-alikes are hidden only for the ingredient they imitate', () => {
    assert.equal(makeOwnsMatcher(['beer'])('Ginger beer'), false);
    assert.equal(makeOwnsMatcher(['ginger beer'])('Ginger beer'), true);
    assert.equal(makeOwnsMatcher(['brandy'])('Cherry brandy'), false);
    assert.equal(makeOwnsMatcher(['brandy'])('Brandy'), true);
});

test('a specific kind satisfies a generic recipe line', () => {
    assert.equal(makeOwnsMatcher(['dry vermouth'])('Vermouth'), true);
    assert.equal(makeOwnsMatcher(['sweet vermouth'])('Vermouth'), true);
    assert.equal(makeOwnsMatcher(['white rum'])('Rum'), true);
});

test('generic matching does not go the other way or across ingredients', () => {
    // plain vermouth doesn't tell us the user has *dry* vermouth
    assert.equal(makeOwnsMatcher(['vermouth'])('Dry Vermouth'), true); // whole word still matches
    assert.equal(makeOwnsMatcher(['dry vermouth'])('Sweet Vermouth'), false);
    assert.equal(makeOwnsMatcher(['lime juice'])('Juice'), false);
    assert.equal(makeOwnsMatcher(['ginger beer'])('Beer'), false);
    assert.equal(makeOwnsMatcher(['sloe gin'])('Gin'), false);
});

test('regex characters in user input are treated as plain text', () => {
    assert.equal(makeOwnsMatcher(['a.b'])('axb'), false);
    assert.equal(makeOwnsMatcher(['(gin'])('Gin'), false);
});
