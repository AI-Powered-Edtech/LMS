#!/bin/bash
sed -i 's/${student.name}/${student?.name || '\'''\''}/' src/features/gradebook/components/speedgrader/RubricPanel.tsx
sed -i 's/>{student.name}</>{student?.name}</' src/features/gradebook/components/speedgrader/RubricPanel.tsx
