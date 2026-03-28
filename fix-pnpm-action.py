import sys
import re

files = ['.github/workflows/ci.yml', '.github/workflows/deploy.yml']

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # We want to remove:
    #         uses: pnpm/action-setup@v4
    #         with:
    #           version: 10

    # And replace with:
    #         uses: pnpm/action-setup@v4

    # Pattern to match the specific lines (allowing varying indentation but preserving it before 'uses')
    pattern = r"( +uses: pnpm/action-setup@v4\n) +with:\n +version: 10"

    new_content = re.sub(pattern, r"\1", content)

    with open(file, 'w') as f:
        f.write(new_content)
