#!/bin/bash

# ==============================================================================
# EduSync Feature Generator
# Usage: ./generate_feature.sh <feature_name>
# Example: ./generate_feature.sh assignments
# ==============================================================================

FEATURE_NAME=$1

if [ -z "$FEATURE_NAME" ]; then
  echo "Error: Feature name is required."
  echo "Usage: ./generate_feature.sh <feature_name>"
  exit 1
fi

# Convert to lowercase for folder name
FEATURE_DIR="src/features/${FEATURE_NAME,,}"

if [ -d "$FEATURE_DIR" ]; then
  echo "Error: Feature '$FEATURE_NAME' already exists at $FEATURE_DIR"
  exit 1
fi

echo "🚀 Generating Feature Skeleton: $FEATURE_NAME"
echo "------------------------------------------------"

# 1. Create Directories
mkdir -p "$FEATURE_DIR"/{api,queries,components,hooks,store,utils,types}

# 2. Generate api/service.ts
cat <<EOF > "$FEATURE_DIR/api/${FEATURE_NAME}.service.ts"
import { supabase } from '@/lib/supabase';

// TODO: Define API calls (RPCs or raw queries) for $FEATURE_NAME here.
// Example:
// export async function fetch${FEATURE_NAME^}() {
//   const { data, error } = await supabase.from('...').select('*');
//   if (error) throw error;
//   return data;
// }
EOF

# 3. Generate queries/queries.ts
cat <<EOF > "$FEATURE_DIR/queries/${FEATURE_NAME}.queries.ts"
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { QueryKeys } from '@/services/queryKeys';
// import * as api from '../api/${FEATURE_NAME}.service';

// TODO: Define React Query hooks here.
// Example:
// export const useGet${FEATURE_NAME^} = () => {
//   return useQuery({
//     queryKey: ['${FEATURE_NAME}'],
//     queryFn: api.fetch${FEATURE_NAME^},
//   });
// };
EOF

# 4. Generate store/store.ts
cat <<EOF > "$FEATURE_DIR/store/${FEATURE_NAME}.store.ts"
import { create } from 'zustand';

// TODO: Define Zustand store for complex feature state here.
// Example:
// interface ${FEATURE_NAME^}State {
//   items: any[];
//   setItems: (items: any[]) => void;
// }
//
// export const use${FEATURE_NAME^}Store = create<${FEATURE_NAME^}State>((set) => ({
//   items: [],
//   setItems: (items) => set({ items }),
// }));
EOF

# 5. Generate types/types.ts
cat <<EOF > "$FEATURE_DIR/types/${FEATURE_NAME}.types.ts"
// TODO: Define TypeScript interfaces and types specific to $FEATURE_NAME here.
// Example:
// export interface ${FEATURE_NAME^}Entity {
//   id: string;
//   created_at: string;
// }
EOF

# 6. Generate Index File (Barrel Export)
cat <<EOF > "$FEATURE_DIR/index.ts"
// Public API for the $FEATURE_NAME feature
// Export only what is needed by other parts of the application.

// export * from './components/SomeComponent';
// export * from './hooks/useSomeHook';
// export * from './types/${FEATURE_NAME}.types';
EOF

echo "✅ Success! Feature '$FEATURE_NAME' generated at $FEATURE_DIR"
echo "Created layers: api/, queries/, components/, hooks/, store/, utils/, types/"
