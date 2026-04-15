import os
import glob

for filepath in glob.glob('src/**/*.ts*', recursive=True):
    with open(filepath, 'r') as f:
        content = f.read()
    if '@/src/utils/logger' in content:
        content = content.replace('@/src/utils/logger', '@/utils/logger')
        with open(filepath, 'w') as f:
            f.write(content)
