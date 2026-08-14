## 2024-05-15 - React Array O(N) operations within Render
**Learning:** React components frequently trigger full array traversal multiple times per render via successive \`.filter()\` or \`.find()\` calls on the same array (e.g. counting unread items, counting severe alerts, and pulling IDs).
**Action:** When working on arrays that could grow large and are mapped/filtered multiple times per render cycle, consolidate the operations into a single O(N) pass inside a \`useMemo\` block to minimize computation time and prevent unnecessary allocations.
