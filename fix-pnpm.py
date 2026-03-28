import re

files = ['.github/workflows/ci.yml', '.github/workflows/deploy.yml', '.github/workflows/e2e.yml']

for filepath in files:
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        # Remove the 'with:\n  version: 10' part from pnpm/action-setup@v4
        pattern = r'( +uses: pnpm/action-setup@v4\n) +with:\n +version: 10\n'
        new_content = re.sub(pattern, r'\1', content)

        # If it was just version: 10 without with, or if there's an empty with left,
        # we can also just explicitly replace:
        new_content = new_content.replace("        uses: pnpm/action-setup@v4\n        with:\n          version: 10\n", "        uses: pnpm/action-setup@v4\n")

        with open(filepath, 'w') as f:
            f.write(new_content)
    except FileNotFoundError:
        pass
