import test from 'node:test';
import assert from 'node:assert/strict';
import { getActiveBottomNavId } from './navigation';

test('getActiveBottomNavId resolves root and trailing slash to home', () => {
  assert.equal(getActiveBottomNavId('/'), 'home');
  assert.equal(getActiveBottomNavId(''), 'home');
});

test('getActiveBottomNavId resolves explore routes to explore', () => {
  assert.equal(getActiveBottomNavId('/explore'), 'explore');
  assert.equal(getActiveBottomNavId('/explore/movie'), 'explore');
  assert.equal(getActiveBottomNavId('/explore/tv'), 'explore');
  assert.equal(getActiveBottomNavId('/explore/anime'), 'explore');
});

test('getActiveBottomNavId resolves search route to search', () => {
  assert.equal(getActiveBottomNavId('/search'), 'search');
});

test('getActiveBottomNavId resolves my-list and history routes to list', () => {
  assert.equal(getActiveBottomNavId('/my-list'), 'list');
  assert.equal(getActiveBottomNavId('/history'), 'list');
});

test('getActiveBottomNavId returns null for non-tab routes', () => {
  assert.equal(getActiveBottomNavId('/detail/movie/123'), null);
  assert.equal(getActiveBottomNavId('/dashboard'), null);
  assert.equal(getActiveBottomNavId('/ranking'), null);
});
