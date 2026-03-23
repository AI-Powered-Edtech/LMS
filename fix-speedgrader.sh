#!/bin/bash
sed -i 's/studentName={currentStudent.name}/studentName={currentStudent?.name || '\'''\''}/' src/pages/SpeedGrader.tsx
