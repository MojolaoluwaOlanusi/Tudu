import { describe, it, expect, beforeEach } from 'vitest';
import {
  rememberPostLoginDestination,
  consumePostLoginDestination,
} from '../lib/postLoginRedirect';

describe('postLoginRedirect', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns / when nothing is stored', () => {
    expect(consumePostLoginDestination()).toBe('/');
  });

  it('round-trips a stored path', () => {
    rememberPostLoginDestination('/board?x=1');
    expect(consumePostLoginDestination()).toBe('/board?x=1');
  });

  it('clears after consuming so the next login starts fresh', () => {
    rememberPostLoginDestination('/board');
    consumePostLoginDestination();
    expect(consumePostLoginDestination()).toBe('/');
  });

  it('ignores the root path', () => {
    rememberPostLoginDestination('/');
    expect(sessionStorage.getItem('tudu.login.from')).toBeNull();
  });
});