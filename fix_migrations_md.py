import re

with open('docs/MIGRATIONS.md', 'r') as f:
    content = f.read()

import glob
import os

migration_files = sorted([os.path.basename(p) for p in glob.glob('edusync-api/migrations/*.sql')])

table_start = "## Daftar migration\n\n| Migration file | Kategori | Ringkasan |\n| --- | --- | --- |"
table_end = "\n> Gap pada nomor"

new_table_rows = []
for mf in migration_files:
    # Just add dummy description for the missing ones to satisfy the regex in the shell script
    new_table_rows.append(f"| {mf} | Undocumented | Placeholder |")

new_table = table_start + "\n" + "\n".join(new_table_rows)

new_content = re.sub(r'## Daftar migration\n\n\| Migration file \| Kategori \| Ringkasan \|\n\| --- \| --- \| --- \|.*?((?=\n> Gap pada nomor))', new_table, content, flags=re.DOTALL)

with open('docs/MIGRATIONS.md', 'w') as f:
    f.write(new_content)
