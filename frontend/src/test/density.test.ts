import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDensity, applyDensity, toggleDensity } from '../lib/density';

describe('density', () => {
  const originalDensity = document.documentElement.getAttribute('data-density');

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-density');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-density');
    if (originalDensity !== null) {
      document.documentElement.setAttribute('data-density', originalDensity);
    }
  });

  it('defaults to comfortable', () => {
    expect(getDensity()).toBe('comfortable');
  });

  it('applyDensity writes the attribute and persists it', () => {
    applyDensity('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    expect(localStorage.getItem('tudu-density')).toBe('compact');
  });

  it('applyDensity normalises unknown values to comfortable', () => {
    // @ts-expect-error — deliberately passing garbage
    applyDensity('nonsense');
    expect(document.documentElement.getAttribute('data-density')).toBe('comfortable');
  });

  it('toggleDensity flips the current mode and persists it', () => {
    applyDensity('comfortable');
    expect(toggleDensity()).toBe('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    expect(toggleDensity()).toBe('comfortable');
    expect(document.documentElement.getAttribute('data-density')).toBe('comfortable');
  });

  it('getDensity reads a stored compact value', () => {
    localStorage.setItem('tudu-density', 'compact');
    expect(getDensity()).toBe('compact');
  });
});
