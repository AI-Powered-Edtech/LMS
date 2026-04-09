import * as v from 'valibot'

export const QuizFormDataSchema = v.object({
  title: v.pipe(v.string(), v.minLength(1, 'Judul kuis wajib diisi')),
  status: v.picklist(['draft', 'published', 'archived']),
  points: v.pipe(v.number(), v.minValue(1, 'Poin minimal 1')),
})

type QuizFormData = v.InferOutput<typeof QuizFormDataSchema>

console.log('Success')
