import type { PathRule } from '../types'

/**
 * Client-side preview evaluator for adaptive path rules.
 *
 * NOTE: The server (evaluate_next_lesson RPC) is authoritative for actual navigation.
 * This function is used ONLY for previewing rules in the course builder UI.
 */
export function evaluateRulesClientSide(
  rules: PathRule[],
  signals: { quiz_score?: number; time_spent?: number }
): PathRule | null {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority)

  for (const rule of sorted) {
    if (!rule.is_active) continue

    let met = false

    switch (rule.condition_type) {
      case 'quiz_score_below':
        met = (signals.quiz_score ?? 0) < (rule.condition_value.threshold ?? 70)
        break
      case 'quiz_score_above':
        met = (signals.quiz_score ?? 0) >= (rule.condition_value.threshold ?? 70)
        break
      case 'time_spent_below':
        met = (signals.time_spent ?? 0) < (rule.condition_value.min_seconds ?? 300)
        break
      case 'always':
        met = true
        break
      default:
        met = false
    }

    if (met) return rule
  }

  return null
}
