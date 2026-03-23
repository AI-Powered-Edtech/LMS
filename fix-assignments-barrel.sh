#!/bin/bash
sed -i '/\/\/ Legacy gradebook re-exports/,$d' src/features/assignments/index.ts
