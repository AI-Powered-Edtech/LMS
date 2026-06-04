import { describe, expect, it } from 'vitest';

import { cn } from '@/utils/cn';

describe('cn utility', () => {
  it('merges simple class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional classes using objects', () => {
    expect(cn('base', { conditional: true, ignored: false })).toBe('base conditional');
  });

  it('handles arrays and nested arrays', () => {
    expect(cn(['class1', ['class2', 'class3']])).toBe('class1 class2 class3');
  });

  it('resolves tailwind conflicts correctly using twMerge', () => {
    expect(cn('p-4 p-2')).toBe('p-2');
    expect(cn('px-2 py-1 p-4')).toBe('p-4');
    expect(cn('text-red-500 text-blue-500')).toBe('text-blue-500');
  });

  it('handles edge cases like null, undefined, and empty strings safely', () => {
    expect(cn('class1', null, undefined, '', 'class2')).toBe('class1 class2');
    expect(cn(null)).toBe('');
    expect(cn(undefined)).toBe('');
    expect(cn()).toBe('');
  });
});
