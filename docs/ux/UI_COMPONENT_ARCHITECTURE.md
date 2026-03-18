# EduSync LMS — UI Component Architecture

> Best-practice structure untuk `src/components/ui/` design system.
> Dokumen ini adalah **kontrak** — semua UI primitives harus mengikuti pattern ini.

---

## 1. Folder Structure

```
src/components/ui/
  ├─ index.ts              ← barrel export (single import point)
  ├─ Button.tsx
  ├─ Card.tsx
  ├─ Badge.tsx
  ├─ Skeleton.tsx           ← includes SkeletonText, SkeletonCard, SkeletonAvatar
  ├─ EmptyState.tsx
  ├─ Input.tsx
  ├─ Select.tsx
  ├─ Modal.tsx              ← includes ModalHeader, ModalBody, ModalFooter
  ├─ Tabs.tsx
  └─ DataTable.tsx
```

**Kenapa flat files, bukan folders?**
- Komponen ini kecil (50-150 lines)
- Satu file per komponen = less indirection
- Sub-komponen (ModalHeader, SkeletonCard) tinggal di file yang sama
- Kalau nanti tumbuh > 200 lines, baru extract ke folder

---

## 2. Universal Rules

### 2.1 Import Pattern

```ts
// Consumer import — ALWAYS from barrel
import { Button, Card, Modal } from '@/src/components/ui';

// NEVER direct file import
import { Button } from '@/src/components/ui/Button'; // ❌
```

### 2.2 Props Pattern

```ts
// Extend native HTML element props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}
```

Rules:
- **Extend native HTML props** — consumer can pass `onClick`, `disabled`, `aria-label`, etc.
- **All custom props optional** with sensible defaults
- **No `any` types** — use `React.ReactNode` for children/icons
- **Export interface** — consumers may need to type-check

### 2.3 Component Pattern

```tsx
import { forwardRef } from 'react';
import { cn } from '@/src/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, fullWidth, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // base
          'inline-flex items-center justify-center font-semibold transition-all duration-200',
          // variant
          variants[variant],
          // size
          sizes[size],
          // modifiers
          fullWidth && 'w-full',
          (disabled || loading) && 'opacity-50 cursor-not-allowed',
          className // always last — consumer can override
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Spinner size={size} /> : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

Rules:
- **`forwardRef`** — allows ref forwarding for form libraries, focus management
- **`cn()` for all class merging** — Tailwind-merge prevents conflicts
- **`className` as last arg to `cn()`** — consumer can always override
- **`displayName`** — for React DevTools
- **Spread `...props`** — native attrs pass through
- **Style maps as const objects** outside component — no re-creation on render

### 2.4 Style Maps Pattern

```ts
const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500',
} as const;

const sizes = {
  sm: 'text-sm px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2 rounded-xl gap-2',
  lg: 'text-base px-6 py-3 rounded-xl gap-2.5',
} as const;
```

Rules:
- **`as const`** — TypeScript narrows types
- **Always include dark mode** — `dark:` variant for every color
- **Always include focus-visible** — accessibility
- **Consistent radius** — sm=rounded-lg, md/lg=rounded-xl

### 2.5 Dark Mode

Every component MUST work in dark mode. Pattern:

```
Light:                          Dark:
bg-white                       dark:bg-slate-900
bg-slate-50                    dark:bg-slate-800
bg-slate-100                   dark:bg-slate-700
text-slate-900                 dark:text-white
text-slate-600                 dark:text-slate-300
text-slate-500                 dark:text-slate-400
border-slate-200               dark:border-slate-700
```

### 2.6 Accessibility

- All interactive elements need `focus-visible:ring-2`
- Modals need focus trap + Escape key close
- Buttons with icons only need `aria-label`
- Form inputs need associated `<label>`
- Color alone never conveys meaning (add icon/text)

---

## 3. Component Contracts

### 3.1 Button

```ts
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

// Usage
<Button variant="primary" size="md" onClick={handleSave}>Simpan</Button>
<Button variant="danger" icon={<Trash2 className="w-4 h-4" />}>Hapus</Button>
<Button variant="ghost" size="sm" loading>Loading...</Button>
```

### 3.2 Card

```ts
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  border?: boolean;
}

// Usage
<Card padding="md" hover onClick={handleClick}>
  <h3>Title</h3>
  <p>Content</p>
</Card>
```

### 3.3 Badge

```ts
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

// Usage
<Badge variant="success">Selesai</Badge>
<Badge variant="warning" size="sm" icon={<Clock className="w-3 h-3" />}>H-2</Badge>
```

### 3.4 Skeleton

```ts
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

// Sub-components in same file
const SkeletonText: FC<{ lines?: number }>;
const SkeletonCard: FC<{ className?: string }>;
const SkeletonAvatar: FC<{ size?: 'sm' | 'md' | 'lg' }>;

// Usage
<Skeleton className="h-8 w-48" />
<SkeletonText lines={3} />
<SkeletonCard />
<SkeletonAvatar size="md" />
```

### 3.5 EmptyState

```ts
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

// Usage
<EmptyState
  icon={<BookOpen className="w-12 h-12" />}
  title="Belum ada materi"
  description="Gabung ke kelas untuk mulai belajar"
  action={{ label: "Gabung Kelas", onClick: handleJoin }}
/>
```

### 3.6 Input

```ts
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';   // 'size' conflicts with HTML attr
}

// Usage
<Input label="Email" type="email" error={errors.email} icon={<Mail />} />
```

### 3.7 Select

```ts
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  label?: string;
  error?: string;
  placeholder?: string;
  selectSize?: 'sm' | 'md' | 'lg';
}

// Usage
<Select
  label="Kelas"
  options={classes}
  placeholder="Pilih kelas..."
  onChange={handleChange}
/>
```

### 3.8 Modal

```ts
interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

// Sub-components
const ModalHeader: FC<{ title: string; onClose?: () => void }>;
const ModalBody: FC<{ children: React.ReactNode; className?: string }>;
const ModalFooter: FC<{ children: React.ReactNode }>;

// Usage
<Modal open={isOpen} onClose={() => setIsOpen(false)} size="md">
  <ModalHeader title="Gabung Kelas" />
  <ModalBody>
    <Input label="Kode Kelas" value={code} onChange={setCode} />
  </ModalBody>
  <ModalFooter>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>Batal</Button>
    <Button onClick={handleJoin}>Gabung</Button>
  </ModalFooter>
</Modal>
```

### 3.9 Tabs

```ts
interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

// Usage
<Tabs
  tabs={[
    { id: 'available', label: 'Tersedia', count: 5 },
    { id: 'completed', label: 'Selesai', count: 12 },
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

### 3.10 DataTable

```ts
interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  className?: string;
}

// Usage
<DataTable
  columns={[
    { key: 'name', header: 'Nama Siswa', sortable: true },
    { key: 'score', header: 'Nilai', sortable: true },
    { key: 'actions', header: '', render: (row) => <Button size="sm">Edit</Button> },
  ]}
  data={students}
  loading={isLoading}
  emptyState={<EmptyState title="Belum ada siswa" />}
/>
```

---

## 4. Anti-Patterns (JANGAN dilakukan)

### 4.1 Jangan tambah dependency baru

```
❌ npm install @radix-ui/react-dialog
❌ npm install @headlessui/react
✅ Custom-built dengan Tailwind + cn()
```

Alasan: app ini sudah zero-UI-library, tambah dependency = bundle bloat.

### 4.2 Jangan bikin component terlalu configurable

```tsx
// ❌ Over-engineered
<Button
  borderWidth={2}
  textTransform="uppercase"
  letterSpacing="wide"
  shadow="md"
  gradient={{ from: 'blue', to: 'purple' }}
/>

// ✅ Simple variants
<Button variant="primary" size="md">Save</Button>
```

### 4.3 Jangan duplikasi Tailwind classes

```tsx
// ❌ Inconsistent
<div className="rounded-xl">  // Card A
<div className="rounded-2xl"> // Card B
<div className="rounded-lg">  // Card C

// ✅ Use Card component
<Card>Content A</Card>
<Card>Content B</Card>
<Card>Content C</Card>
```

### 4.4 Jangan import dari file langsung

```ts
// ❌ Direct import
import { Button } from '@/src/components/ui/Button';

// ✅ Barrel import
import { Button } from '@/src/components/ui';
```

---

## 5. Migration Strategy

Setelah komponen dibuat, migrasi GRADUAL — jangan refactor seluruh app sekaligus.

### Phase 1: Build components (tanpa ubah page apapun)
- Build semua 10 components
- Verify: `npx tsc --noEmit` + `npx vite build`

### Phase 2: Migrate 1 page sebagai proof (Dashboard)
- Replace inline buttons → `<Button>`
- Replace inline cards → `<Card>`
- Replace spinners → `<Skeleton>`
- Add `<EmptyState>` ke sections yang kosong
- Replace inline modals → `<Modal>`

### Phase 3: Migrate remaining pages (gradual, per-page)
- Setiap page di-migrate satu per satu
- Tidak perlu sekaligus

---

## 6. Testing Checklist

Setiap component harus pass:

```
□ TypeScript compiles (npx tsc --noEmit)
□ Renders correctly in light mode
□ Renders correctly in dark mode
□ Responsive on mobile (< 768px)
□ Focus-visible ring works
□ className override works
□ All variants render correctly
□ All sizes render correctly
□ Disabled state works (if applicable)
□ Loading state works (if applicable)
□ Build succeeds (npx vite build)
```
