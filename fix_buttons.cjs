const fs = require('fs');

// 1. AdministrationDashboard.tsx
let adminDash = fs.readFileSync('src/pages/admin/AdministrationDashboard.tsx', 'utf8');
adminDash = adminDash.replace(
  "import { Link } from 'react-router-dom'",
  "import { Link, useNavigate } from 'react-router-dom'\nimport { useToast } from '@/src/hooks/useToast'"
);
adminDash = adminDash.replace(
  "export function AdministrationDashboard() {",
  "export function AdministrationDashboard() {\n  const navigate = useNavigate();\n  const addToast = useToast((s: any) => s.addToast);"
);
let parts = adminDash.split('<button className="w-full p-3 text-left bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors flex items-center gap-3">');
if(parts.length === 5) {
  adminDash = parts[0] + '<button onClick={() => navigate("/app/admin/settings")} className="w-full p-3 text-left bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors flex items-center gap-3">' + 
              parts[1] + '<button onClick={() => navigate("/app/admin/user-management")} className="w-full p-3 text-left bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors flex items-center gap-3">' + 
              parts[2] + '<button onClick={() => navigate("/app/admin/audit-log")} className="w-full p-3 text-left bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors flex items-center gap-3">' + 
              parts[3] + '<button onClick={() => addToast({ type: "info", message: "Segera hadir" })} className="w-full p-3 text-left bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors flex items-center gap-3">' + 
              parts[4];
}
fs.writeFileSync('src/pages/admin/AdministrationDashboard.tsx', adminDash);

// 2. BillingDashboard.tsx
let billDash = fs.readFileSync('src/pages/admin/BillingDashboard.tsx', 'utf8');
billDash = billDash.replace(
  "import { useAuth } from '@/src/contexts/AuthContext'",
  "import { useAuth } from '@/src/contexts/AuthContext'\nimport { useToast } from '@/src/hooks/useToast'"
);
billDash = billDash.replace(
  "export function BillingDashboard() {",
  "export function BillingDashboard() {\n  const addToast = useToast((s: any) => s.addToast);"
);
billDash = billDash.replace(
  '<button className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600',
  '<button onClick={() => addToast({ type: "info", message: "Segera hadir" })} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600'
);
billDash = billDash.replace(
  '<button\n                          className="p-2 text-slate-400',
  '<button onClick={() => addToast({ type: "info", message: "Segera hadir" })}\n                          className="p-2 text-slate-400'
);
fs.writeFileSync('src/pages/admin/BillingDashboard.tsx', billDash);

// 3. Creator.tsx
let creator = fs.readFileSync('src/pages/Creator.tsx', 'utf8');
creator = creator.replace(
  "import { useCallback, useState } from 'react'",
  "import { useCallback, useState, useRef } from 'react'"
);
creator = creator.replace(
  "const [isGenerating, setIsGenerating] = useState(false)",
  "const [isGenerating, setIsGenerating] = useState(false)\n  const fileInputRef = useRef<HTMLInputElement | null>(null)"
);
creator = creator.replace(
  '<button className="mt-6 px-6 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm">',
  '<input type="file" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files && e.target.files.length > 0) { const f = e.target.files[0]; if (f) { setFile(f); setFileUrl(URL.createObjectURL(f)); } } }} />\n                  <button onClick={() => fileInputRef.current?.click()} className="mt-6 px-6 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm">'
);
creator = creator.replace(
  'className="text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"\n                      aria-label="Edit soal"',
  'onClick={() => {\n                        const newText = prompt("Edit soal:", q.text);\n                        if (newText && newText !== q.text) {\n                          setResult((prev: any) => prev ? { ...prev, questions: prev.questions.map((question: any, idx: number) => idx === i ? { ...question, text: newText } : question) } : null);\n                        }\n                      }}\n                      className="text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"\n                      aria-label="Edit soal"'
);
fs.writeFileSync('src/pages/Creator.tsx', creator);

// 4. PostItem.tsx
let postItem = fs.readFileSync('src/features/discussions/components/forum/PostItem.tsx', 'utf8');
postItem = postItem.replace(
  "import { useAuth } from '@/src/contexts/AuthContext'",
  "import { useAuth } from '@/src/contexts/AuthContext'\nimport { useToast } from '@/src/hooks/useToast'"
);
postItem = postItem.replace(
  "const { profile } = useAuth()",
  "const { profile } = useAuth()\n  const addToast = useToast((s: any) => s.addToast);"
);
postItem = postItem.replace(
  '<button className="w-full text-left px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700">',
  '<button onClick={() => addToast({ type: "info", message: "Segera hadir" })} className="w-full text-left px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700">'
);
postItem = postItem.replace(
  /<button\n            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"/g,
  '<button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/#/forum/${post.id}`); addToast({ type: "success", message: "Tautan disalin" }) }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"'
);
fs.writeFileSync('src/features/discussions/components/forum/PostItem.tsx', postItem);

// 5. Profile.tsx
let profile = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
profile = profile.replace(
  "import { useAuth } from '@/src/contexts/AuthContext'",
  "import { useAuth } from '@/src/contexts/AuthContext'\nimport { useToast } from '@/src/hooks/useToast'"
);
profile = profile.replace(
  "const { user, profile } = useAuth()",
  "const { user, profile: userProfile } = useAuth()\n  const profile = userProfile;\n  const addToast = useToast((s: any) => s.addToast);"
);
profile = profile.replace(
  'aria-label="Ubah foto profil"',
  'onClick={() => addToast({ type: "info", message: "Ubah foto profil segera hadir" })} aria-label="Ubah foto profil"'
);
fs.writeFileSync('src/pages/Profile.tsx', profile);

// 6. Gradebook.tsx
let gb = fs.readFileSync('src/pages/Gradebook.tsx', 'utf8');
gb = gb.replace(
  "import { EmptyState } from '@/src/components/ui'",
  "import { EmptyState } from '@/src/components/ui'\nimport { useToast } from '@/src/hooks/useToast'"
);
gb = gb.replace(
  "const s = useGradebookState()",
  "const s = useGradebookState()\n  const addToast = useToast((s: any) => s.addToast);"
);
gb = gb.replace(
  'aria-label="Ekspor CSV"',
  'onClick={() => addToast({ type: "info", message: "Fitur Ekspor CSV segera hadir." })}\n            aria-label="Ekspor CSV"'
);
fs.writeFileSync('src/pages/Gradebook.tsx', gb);

console.log("Done.");
