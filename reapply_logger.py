import os
import glob
import re

def process_file(filepath):
    if not filepath.endswith(('.ts', '.tsx')):
        return
    with open(filepath, 'r') as f:
        content = f.read()

    # We only want to replace console.xxx with logger.xxx
    # And add import { logger } from '@/utils/logger' if not present
    original = content
    content = re.sub(r'\bconsole\.log\b', 'logger.info', content)
    content = re.sub(r'\bconsole\.info\b', 'logger.info', content)
    content = re.sub(r'\bconsole\.warn\b', 'logger.warn', content)
    content = re.sub(r'\bconsole\.error\b', 'logger.error', content)
    content = re.sub(r'\bconsole\.debug\b', 'logger.debug', content)

    if original != content and 'logger' in content and 'import { logger }' not in content:
        # Add import at the top of the file (after other imports or at the very top)
        # Find the last import statement
        imports_end = 0
        for match in re.finditer(r'^import\s+.*$', content, re.MULTILINE):
            imports_end = match.end()
        
        import_stmt = "\nimport { logger } from '@/utils/logger'"
        if imports_end > 0:
            content = content[:imports_end] + import_stmt + content[imports_end:]
        else:
            content = import_stmt + '\n' + content

    if original != content:
        with open(filepath, 'w') as f:
            f.write(content)

for filepath in glob.glob('src/**/*.ts*', recursive=True):
    if 'utils/logger.ts' in filepath: continue
    process_file(filepath)
