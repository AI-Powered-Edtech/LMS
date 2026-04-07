#!/bin/bash
find src/components/CourseBuilder -name "*.tsx" | while read file; do
  echo "--- $file ---"
  grep -n "<button" "$file" | while IFS=: read -r line_num line_content; do
    end_line=$(awk "NR >= $line_num && />/ {print NR; exit}" "$file")
    if [ -n "$end_line" ]; then
      button_code=$(sed -n "${line_num},${end_line}p" "$file")
      if echo "$button_code" | grep -v -q "aria-label"; then
        if echo "$button_code" | grep -q "title="; then
          echo "Line $line_num: Button has title but no aria-label"
          echo "$button_code"
        fi
      fi
    fi
  done
done
