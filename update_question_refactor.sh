#!/bin/bash
sed -i 's/const updateQuestion = (idx: number, field: string, value: any) => {/const updateQuestion = <K extends keyof QuizQuestion>(idx: number, field: K, value: QuizQuestion[K]) => {/' src/pages/QuizManager.tsx
sed -i 's/(qs\[idx\] as any)\[field\] = value;/qs[idx][field] = value;/' src/pages/QuizManager.tsx
