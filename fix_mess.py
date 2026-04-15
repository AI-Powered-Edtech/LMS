import re

files = [
"src/features/administration/api/ppdbApi.ts",
"src/features/gamification/api/gamificationService.ts",
"src/features/gradebook/hooks/useGradebookQueries.ts",
"src/features/lessons/api/lessonService.ts",
"src/features/lessons/components/ScormPlayer.tsx",
"src/features/parent/api/parentApi.ts",
"src/features/principal/api/executiveApi.ts",
"src/features/principal/api/surveyApi.ts",
"src/features/quizzes/api/quizPlayer.service.ts",
"src/services/realtime/vilRealtimeProvider.ts",
"src/services/storage/vilStorageProvider.ts"
]

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    content = content.replace("import { logger } from '@/utils/logger'\n", "")
    content = "import { logger } from '@/utils/logger'\n" + content
    
    with open(f, 'w') as file:
        file.write(content)
