with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { SkipToContent } from './features/accessibility'\nimport { SkipToContent } from './features/accessibility'", "import { SkipToContent } from './features/accessibility'")
content = content.replace("<MotionConfigWrapper reducedMotion=\"user\">", "<MotionConfigWrapper>")

with open('src/App.tsx', 'w') as f:
    f.write(content)
