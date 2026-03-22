import { describe, it, expect } from 'vitest'
import { parseCSVLine, parseCSVQuestions, generateTemplateCSV } from '../utils/csvQuestionParser'

describe('parseCSVLine', () => {
  it('splits simple comma-separated values', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('handles quoted fields with commas inside', () => {
    expect(parseCSVLine('"hello, world",b,c')).toEqual(['hello, world', 'b', 'c'])
  })

  it('handles escaped quotes', () => {
    expect(parseCSVLine('"say ""hello""",b')).toEqual(['say "hello"', 'b'])
  })

  it('trims whitespace from fields', () => {
    expect(parseCSVLine('  a , b , c ')).toEqual(['a', 'b', 'c'])
  })

  it('handles empty fields', () => {
    expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c'])
  })
})

describe('parseCSVQuestions', () => {
  const header =
    'question_text,question_type,difficulty,explanation,tags,option1,correct1,option2,correct2'

  it('parses a valid MCQ row', () => {
    const csv = `${header}\n"What is 2+2?",MCQ,2,"Basic math","math",3,FALSE,4,TRUE`
    const result = parseCSVQuestions(csv)

    expect(result.errors).toHaveLength(0)
    expect(result.questions).toHaveLength(1)
    expect(result.questions[0].text).toBe('What is 2+2?')
    expect(result.questions[0].type).toBe('MCQ')
    expect(result.questions[0].difficulty).toBe(2)
    expect(result.questions[0].explanation).toBe('Basic math')
    expect(result.questions[0].tags).toEqual(['math'])
    expect(result.questions[0].options).toHaveLength(2)
    expect(result.questions[0].options[0].is_correct).toBe(false)
    expect(result.questions[0].options[1].is_correct).toBe(true)
  })

  it('handles TRUE_FALSE with auto-generated options', () => {
    const csv = `${header}\n"The earth is round",TRUE_FALSE,1,"Yes it is","science"`
    const result = parseCSVQuestions(csv)

    expect(result.errors).toHaveLength(0)
    expect(result.questions[0].type).toBe('TRUE_FALSE')
    expect(result.questions[0].options).toHaveLength(2)
    expect(result.questions[0].options[0].option_text).toBe('Benar')
    expect(result.questions[0].options[1].option_text).toBe('Salah')
  })

  it('handles MULTIPLE_SELECT questions', () => {
    const csv = `${header}\n"Pick primes",MULTIPLE_SELECT,3,,"math",2,TRUE,4,FALSE,5,TRUE`
    const result = parseCSVQuestions(csv)

    expect(result.errors).toHaveLength(0)
    expect(result.questions[0].type).toBe('MULTIPLE_SELECT')
    const correct = result.questions[0].options.filter((o) => o.is_correct)
    expect(correct).toHaveLength(2)
  })

  it('handles SHORT_ANSWER with no options', () => {
    const csv = `${header}\n"Capital of Indonesia?",SHORT_ANSWER,1,"Jakarta","geography"`
    const result = parseCSVQuestions(csv)

    expect(result.errors).toHaveLength(0)
    expect(result.questions[0].type).toBe('SHORT_ANSWER')
    expect(result.questions[0].options).toHaveLength(0)
  })

  it('defaults to MCQ for invalid type', () => {
    const csv = `${header}\n"A question",INVALID_TYPE,3,,,"A",FALSE,"B",TRUE`
    const result = parseCSVQuestions(csv)

    expect(result.questions[0].type).toBe('MCQ')
  })

  it('clamps difficulty to 1-5 range', () => {
    const csv1 = `${header}\n"Q1",MCQ,0,,,"A",FALSE,"B",TRUE`
    const csv2 = `${header}\n"Q2",MCQ,10,,,"A",FALSE,"B",TRUE`

    expect(parseCSVQuestions(csv1).questions[0].difficulty).toBe(1)
    expect(parseCSVQuestions(csv2).questions[0].difficulty).toBe(5)
  })

  it('returns error for MCQ with < 2 options', () => {
    const csv = `${header}\n"Only one option",MCQ,3,,,"A",TRUE`
    const result = parseCSVQuestions(csv)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('minimal 2 opsi')
  })

  it('returns error for MCQ with 0 correct answers', () => {
    const csv = `${header}\n"No correct",MCQ,3,,,"A",FALSE,"B",FALSE`
    const result = parseCSVQuestions(csv)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('jawaban benar')
  })

  it('returns error for MCQ with multiple correct answers', () => {
    const csv = `${header}\n"Multi correct",MCQ,3,,,"A",TRUE,"B",TRUE`
    const result = parseCSVQuestions(csv)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('hanya boleh 1 jawaban benar')
  })

  it('returns error for empty question text', () => {
    const csv = `${header}\n,MCQ,3,,,"A",FALSE,"B",TRUE`
    const result = parseCSVQuestions(csv)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('tidak boleh kosong')
  })

  it('parses multiple tags separated by comma or semicolon', () => {
    const csv = `${header}\n"Q1",SHORT_ANSWER,3,,"tag1;tag2,tag3"`
    const result = parseCSVQuestions(csv)

    expect(result.questions[0].tags).toEqual(['tag1', 'tag2', 'tag3'])
  })

  it('handles multiple rows with mixed success/error', () => {
    const csv = [
      header,
      '"Valid Q",MCQ,2,,"math","A",FALSE,"B",TRUE',
      ',MCQ,3,,', // empty text = error
      '"Also valid",SHORT_ANSWER,1,,"science"',
    ].join('\n')

    const result = parseCSVQuestions(csv)
    expect(result.questions).toHaveLength(2)
    expect(result.errors).toHaveLength(1)
    expect(result.totalRows).toBe(3)
  })

  it('returns error for CSV with only header', () => {
    const result = parseCSVQuestions(header)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('minimal 1 baris data')
  })

  it('handles Windows line endings (\\r\\n)', () => {
    const csv = `${header}\r\n"Q1",MCQ,2,,"math","A",FALSE,"B",TRUE`
    const result = parseCSVQuestions(csv)

    expect(result.questions).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })

  it('accepts "1" and "yes" and "benar" as truthy', () => {
    const csv = `${header}\n"Q1",MULTIPLE_SELECT,3,,,"A",1,"B",yes,"C",benar,"D",0`
    const result = parseCSVQuestions(csv)

    expect(result.questions[0].options[0].is_correct).toBe(true)
    expect(result.questions[0].options[1].is_correct).toBe(true)
    expect(result.questions[0].options[2].is_correct).toBe(true)
    expect(result.questions[0].options[3].is_correct).toBe(false)
  })
})

describe('generateTemplateCSV', () => {
  it('returns a string with header and example rows', () => {
    const template = generateTemplateCSV()
    const lines = template.split('\n')

    expect(lines[0]).toContain('question_text')
    expect(lines[0]).toContain('question_type')
    expect(lines.length).toBeGreaterThanOrEqual(3)
  })

  it('parseable by parseCSVQuestions', () => {
    const template = generateTemplateCSV()
    const result = parseCSVQuestions(template)

    expect(result.questions.length).toBeGreaterThan(0)
    expect(result.errors).toHaveLength(0)
  })
})
