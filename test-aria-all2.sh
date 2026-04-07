#!/bin/bash
find src/components -name "*.tsx" | while read file; do
  awk '/<button/ {
         start = NR;
         while ($0 !~ />/) {
           getline;
         }
         end = NR;

         button_code = "";
         for (i=start; i<=end; i++) {
           cmd = "sed -n " i "p " "'"$file"'"
           cmd | getline line
           close(cmd)
           button_code = button_code "\n" line
         }

         has_aria = match(button_code, /aria-label/);
         has_title = match(button_code, /title=/);
         has_text = match(button_code, />[^<]+</);

         if (!has_aria) {
           print "--- " "'"$file"'" " ---";
           print "Line " start ":";
           print button_code;
         }
       }' "$file" > /tmp/no-aria.txt
done
