// EduSync LMS — Survey CSV Export Utility
// Exports survey results to CSV format for download

import type { SurveyAnalyticsResult } from '../api/surveyAnalytics'

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

/**
 * Export survey analytics results to CSV and trigger download.
 * Generates a CSV file with per-question aggregated data.
 */
export function exportSurveyToCSV(data: SurveyAnalyticsResult): void {
  const rows: string[][] = []

  // Header metadata
  rows.push(['Survey', data.surveyTitle])
  rows.push(['Target Audience', data.targetAudience])
  rows.push(['Status', data.status])
  rows.push(['Total Responses', String(data.totalResponses)])
  rows.push(['Exported At', new Date().toLocaleString('id-ID')])
  rows.push([])

  // Question results header
  rows.push([
    'No',
    'Question',
    'Type',
    'Result',
  ])

  // Question results
  data.questions.forEach((q, i) => {
    let result = ''

    if (q.questionType === 'rating') {
      result = `Average: ${(q.ratingAvg ?? 0).toFixed(2)}/5`
      if (q.ratingDistribution) {
        const dist = q.ratingDistribution
        result += ` | Distribution: 1=${dist[1] ?? 0}, 2=${dist[2] ?? 0}, 3=${dist[3] ?? 0}, 4=${dist[4] ?? 0}, 5=${dist[5] ?? 0}`
      }
    } else if (q.questionType === 'yesno') {
      const total = (q.yesCount ?? 0) + (q.noCount ?? 0)
      const yesPct = total > 0 ? (((q.yesCount ?? 0) / total) * 100).toFixed(0) : '0'
      result = `Yes: ${q.yesCount ?? 0} (${yesPct}%), No: ${q.noCount ?? 0}`
    } else if (q.questionType === 'text' && q.textAnswers) {
      result = q.textAnswers.join(' | ')
    }

    rows.push([
      String(i + 1),
      q.questionText,
      q.questionType,
      result,
    ])
  })

  // Generate CSV
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  // Trigger download
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `survey_${data.surveyId.slice(0, 8)}_results_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export raw survey responses to CSV (one row per response per question).
 * Useful for detailed analysis in spreadsheet software.
 */
export function exportRawResponsesToCSV(
  responses: Array<{
    respondentId: string
    respondedAt: string
    questionId: string
    questionText: string
    questionType: string
    answerValue: string
  }>,
  surveyTitle: string
): void {
  const rows: string[][] = []

  // Header
  rows.push(['Respondent ID', 'Responded At', 'Question ID', 'Question', 'Type', 'Answer'])

  // Data
  responses.forEach((r) => {
    rows.push([
      r.respondentId,
      r.respondedAt,
      r.questionId,
      r.questionText,
      r.questionType,
      r.answerValue,
    ])
  })

  // Generate CSV
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  // Trigger download
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `survey_${surveyTitle.replace(/\s+/g, '_')}_raw_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
