import { describe, expect, it } from 'vitest'

import type { PathRule } from '../types'
import { evaluateRulesClientSide } from '../utils/pathEvaluator'

// ── Helpers ────────────────────────────────────────────────────

function makeRule(overrides: Partial<PathRule> = {}): PathRule {
  return {
    id: 'rule-1',
    course_id: 'course-1',
    source_lesson_id: 'lesson-1',
    condition_type: 'quiz_score_below',
    condition_value: { threshold: 70 },
    target_lesson_id: 'remedial-1',
    priority: 0,
    is_active: true,
    label: 'Test rule',
    tenant_id: 'tenant-1',
    created_by: 'user-1',
    created_at: '2026-04-04T00:00:00Z',
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────

describe('evaluateRulesClientSide', () => {
  it('returns null when rules array is empty', () => {
    const result = evaluateRulesClientSide([], { quiz_score: 50 })
    expect(result).toBeNull()
  })

  it('returns null when no rule condition is met', () => {
    const rules = [
      makeRule({ condition_type: 'quiz_score_below', condition_value: { threshold: 70 } }),
    ]
    const result = evaluateRulesClientSide(rules, { quiz_score: 85 })
    expect(result).toBeNull()
  })

  it('matches quiz_score_below when score is below threshold', () => {
    const rule = makeRule({
      condition_type: 'quiz_score_below',
      condition_value: { threshold: 70 },
    })
    const result = evaluateRulesClientSide([rule], { quiz_score: 65 })
    expect(result?.id).toBe('rule-1')
  })

  it('does not match quiz_score_below when score equals threshold (exclusive)', () => {
    const rule = makeRule({
      condition_type: 'quiz_score_below',
      condition_value: { threshold: 70 },
    })
    const result = evaluateRulesClientSide([rule], { quiz_score: 70 })
    expect(result).toBeNull()
  })

  it('matches quiz_score_above when score is at or above threshold', () => {
    const rule = makeRule({
      condition_type: 'quiz_score_above',
      condition_value: { threshold: 70 },
      id: 'rule-2',
    })
    const result = evaluateRulesClientSide([rule], { quiz_score: 70 })
    expect(result?.id).toBe('rule-2')
  })

  it('matches quiz_score_above when score is strictly above threshold', () => {
    const rule = makeRule({
      condition_type: 'quiz_score_above',
      condition_value: { threshold: 70 },
      id: 'rule-2',
    })
    const result = evaluateRulesClientSide([rule], { quiz_score: 90 })
    expect(result?.id).toBe('rule-2')
  })

  it('matches time_spent_below when time_spent is below minimum', () => {
    const rule = makeRule({
      condition_type: 'time_spent_below',
      condition_value: { min_seconds: 300 },
      id: 'rule-3',
    })
    const result = evaluateRulesClientSide([rule], { time_spent: 120 })
    expect(result?.id).toBe('rule-3')
  })

  it('does not match time_spent_below when time_spent equals minimum', () => {
    const rule = makeRule({
      condition_type: 'time_spent_below',
      condition_value: { min_seconds: 300 },
    })
    const result = evaluateRulesClientSide([rule], { time_spent: 300 })
    expect(result).toBeNull()
  })

  it('always matches the "always" condition', () => {
    const rule = makeRule({ condition_type: 'always', condition_value: {} })
    const result = evaluateRulesClientSide([rule], {})
    expect(result).not.toBeNull()
  })

  it('skips inactive rules', () => {
    const inactiveRule = makeRule({ is_active: false })
    const result = evaluateRulesClientSide([inactiveRule], { quiz_score: 50 })
    expect(result).toBeNull()
  })

  it('uses default threshold of 70 when condition_value.threshold is not set', () => {
    const rule = makeRule({ condition_type: 'quiz_score_below', condition_value: {} })
    // Below default threshold
    expect(evaluateRulesClientSide([rule], { quiz_score: 60 })).not.toBeNull()
    // Above default threshold
    expect(evaluateRulesClientSide([rule], { quiz_score: 80 })).toBeNull()
  })

  it('uses default min_seconds of 300 when condition_value.min_seconds is not set', () => {
    const rule = makeRule({ condition_type: 'time_spent_below', condition_value: {} })
    // Below default
    expect(evaluateRulesClientSide([rule], { time_spent: 100 })).not.toBeNull()
    // Above default
    expect(evaluateRulesClientSide([rule], { time_spent: 400 })).toBeNull()
  })

  it('evaluates higher priority rules first', () => {
    const lowPriority = makeRule({
      id: 'low',
      priority: 0,
      condition_type: 'always',
      target_lesson_id: 'target-low',
    })
    const highPriority = makeRule({
      id: 'high',
      priority: 10,
      condition_type: 'quiz_score_below',
      condition_value: { threshold: 70 },
      target_lesson_id: 'target-high',
    })
    const result = evaluateRulesClientSide([lowPriority, highPriority], { quiz_score: 50 })
    expect(result?.id).toBe('high')
  })

  it('falls through to lower priority rule when high priority condition is not met', () => {
    const lowPriority = makeRule({
      id: 'low',
      priority: 0,
      condition_type: 'always',
      target_lesson_id: 'target-low',
    })
    const highPriority = makeRule({
      id: 'high',
      priority: 10,
      condition_type: 'quiz_score_below',
      condition_value: { threshold: 70 },
      target_lesson_id: 'target-high',
    })
    // Score is above threshold → high priority rule does NOT match → falls through to "always"
    const result = evaluateRulesClientSide([lowPriority, highPriority], { quiz_score: 90 })
    expect(result?.id).toBe('low')
  })

  it('treats missing quiz_score signal as 0 for score conditions', () => {
    const rule = makeRule({
      condition_type: 'quiz_score_below',
      condition_value: { threshold: 70 },
    })
    const result = evaluateRulesClientSide([rule], {})
    // 0 < 70 → should match
    expect(result).not.toBeNull()
  })

  it('treats missing time_spent signal as 0 for time conditions', () => {
    const rule = makeRule({
      condition_type: 'time_spent_below',
      condition_value: { min_seconds: 300 },
    })
    const result = evaluateRulesClientSide([rule], {})
    // 0 < 300 → should match
    expect(result).not.toBeNull()
  })
})
