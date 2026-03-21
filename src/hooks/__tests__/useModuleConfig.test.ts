import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useModuleConfig } from '../useModuleConfig';

describe('useModuleConfig', () => {
  it('returns all default modules', () => {
    const { result } = renderHook(() => useModuleConfig());
    expect(result.current.modules.length).toBeGreaterThan(0);
  });

  it('includes required module IDs', () => {
    const { result } = renderHook(() => useModuleConfig());
    const ids = result.current.modules.map(m => m.id);
    expect(ids).toContain('gradebook');
    expect(ids).toContain('quiz');
    expect(ids).toContain('assignments');
    expect(ids).toContain('calendar');
    expect(ids).toContain('announcements');
    expect(ids).toContain('analytics');
  });

  it('all default modules have isEnabled=true', () => {
    const { result } = renderHook(() => useModuleConfig());
    const allEnabled = result.current.modules.every(m => m.isEnabled === true);
    expect(allEnabled).toBe(true);
  });

  it('isModuleEnabled returns true for known enabled module', () => {
    const { result } = renderHook(() => useModuleConfig());
    expect(result.current.isModuleEnabled('gradebook')).toBe(true);
  });

  it('isModuleEnabled returns true for unknown module (default fallback)', () => {
    const { result } = renderHook(() => useModuleConfig());
    expect(result.current.isModuleEnabled('unknown-module' as any)).toBe(true);
  });

  it('modules have required fields', () => {
    const { result } = renderHook(() => useModuleConfig());
    result.current.modules.forEach(m => {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.description).toBeTruthy();
      expect(Array.isArray(m.targetRoles)).toBe(true);
      expect(typeof m.isEnabled).toBe('boolean');
    });
  });

  it('teacher-only modules have targetRoles containing teacher', () => {
    const { result } = renderHook(() => useModuleConfig());
    const gradebook = result.current.modules.find(m => m.id === 'gradebook');
    expect(gradebook?.targetRoles).toContain('teacher');
    expect(gradebook?.targetRoles).not.toContain('student');
  });

  it('shared modules have both teacher and student roles', () => {
    const { result } = renderHook(() => useModuleConfig());
    const assignments = result.current.modules.find(m => m.id === 'assignments');
    expect(assignments?.targetRoles).toContain('teacher');
    expect(assignments?.targetRoles).toContain('student');
  });

  it('student-visible modules include quiz', () => {
    const { result } = renderHook(() => useModuleConfig());
    const quiz = result.current.modules.find(m => m.id === 'quiz');
    expect(quiz?.targetRoles).toContain('student');
  });

  it('toggleModule function is callable without error', () => {
    const { result } = renderHook(() => useModuleConfig());
    expect(() => {
      act(() => {
        result.current.toggleModule('gradebook');
      });
    }).not.toThrow();
  });
});
