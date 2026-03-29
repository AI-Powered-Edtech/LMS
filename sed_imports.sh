sed -i '/import { useAuth }/c\import { useAuth } from "@/src/contexts/AuthContext"\nimport { useToast } from "@/src/components/ui"' src/pages/Profile.tsx
sed -i '/import { useAuth }/c\import { useAuth } from "@/src/contexts/AuthContext"\nimport { useToast } from "@/src/components/ui"' src/pages/admin/BillingDashboard.tsx
