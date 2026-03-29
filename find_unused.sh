#!/bin/bash
# Extract export names exactly
grep -rnhoE "export (const|function|type|interface|class|enum) [a-zA-Z0-9_]+" src/utils/ src/features/*/api/ | awk '{print $3}' | sed 's/[<(:].*//' | sort | uniq > all_exports.txt

echo "Found $(wc -l < all_exports.txt) exports"

for export_name in $(cat all_exports.txt); do
  # Find occurrences of the word across src/
  # Count the number of matches
  count=$(grep -rnwo "src/" -e "$export_name" | wc -l)
  if [ "$count" -eq 1 ]; then
    echo "$export_name is used 1 time (only its export)"
  elif [ "$count" -eq 0 ]; then
    echo "$export_name is used 0 times???"
  fi
done
