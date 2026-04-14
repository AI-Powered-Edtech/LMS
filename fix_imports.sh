#!/bin/bash
for file in $(grep -ril "api\." src/ | grep -v "\.test\.ts" | grep -v "\.test\.tsx" | grep -v "README.md"); do
  if ! grep -q "import { api }" "$file" && ! grep -q "import {.*api.*} from '@/src/lib/api'" "$file"; then
    # insert at the top, or after the first line if it's a doc block
    sed -i '1i import { api } from "@/src/lib/api"' "$file"
  fi
done
