import os
import subprocess

def get_conflicted_files():
    result = subprocess.run(['git', 'diff', '--name-only', '--diff-filter=U'], capture_output=True, text=True)
    return result.stdout.strip().split('\n')

conflicted = get_conflicted_files()
manual_resolve = ['src/App.tsx', 'vite.config.ts', 'docs/SECURITY.md', 'src/contexts/AuthContext.tsx', 'src/contexts/__tests__/AuthContext.test.tsx']

for f in conflicted:
    if not f: continue
    if f not in manual_resolve and f.startswith('src/'):
        # Checkout theirs
        print(f"Checking out theirs for {f}")
        subprocess.run(['git', 'checkout', '--theirs', f])
        subprocess.run(['git', 'add', f])

