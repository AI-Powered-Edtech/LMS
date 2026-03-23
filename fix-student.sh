#!/bin/bash
sed -i 's/}) {/}) {\n  if (!student) return null/' src/features/gradebook/components/speedgrader/RubricPanel.tsx
