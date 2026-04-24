/**
 * AdminSidebar — Grouped, collapsible sidebar navigation for admin users.
 *
 * Features:
 * - Grouped navigation with collapsible sections
 * - Active route highlighting
 * - Badge support ("Segera", unread counts, etc.)
 * - Dark mode full support
 * - Keyboard-accessible
 */

import { ChevronDown, LogOut } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { adminNavGroups } from '@/shared/config/navigation'
import { cn } from '@/utils/cn'
import { logger } from '@/utils/logger'
import { captureError } from '@/utils/sentry'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Set of group names that start collapsed */
const INITIALLY_COLLAPSED = new Set<string>([
  // Collapse less-visited groups by default; user can expand as needed
  'Sistem',
  'Keuangan',
])

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  // Track which groups are collapsed; start with defaults
  const [collapsed, setCollapsed] = useState<Set<string>>(INITIALLY_COLLAPSED)

  const toggleGroup = (group: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  const isActive = (href: string) => {
    // Exact match or prefix match for nested routes
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (e) {
      if (import.meta.env.DEV) logger.error('[AdminSidebar] signOut error:', e)
      captureError(e, { context: 'AdminSidebar.signOut' })
    } finally {
      void navigate('/login')
    }
  }

  return (
    <aside
      aria-label="Menu admin"
      className="hidden md:flex flex-col w-64 h-screen bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 shrink-0 transition-colors duration-300"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-lg">E</span>
        </div>
        <div>
          <span className="block text-base font-bold text-neutral-900 dark:text-neutral-50 tracking-tight leading-none">
            EduSync
          </span>
          <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest">
            Admin
          </span>
        </div>
      </div>

      {/* Navigation groups */}
      <nav
        aria-label="Navigasi admin"
        className="flex-1 overflow-y-auto hide-scrollbar py-3 px-3 space-y-0.5"
      >
        {adminNavGroups.map(({ group, items }) => {
          const isGroupCollapsed = collapsed.has(group)
          const groupId = `admin-nav-group-${group.toLowerCase().replace(/\s+/g, '-')}`
          const hasActiveItem = items.some((item) => isActive(item.href))

          return (
            <div key={group} className="mb-1">
              {/* Group Header */}
              <button
                type="button"
                aria-expanded={!isGroupCollapsed}
                aria-controls={groupId}
                onClick={() => toggleGroup(group)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-1.5 rounded-lg',
                  'text-[10px] font-bold uppercase tracking-widest transition-colors',
                  hasActiveItem
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-neutral-400 dark:text-neutral-500',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
                )}
              >
                {group}
                <ChevronDown
                  className={cn(
                    'w-3 h-3 transition-transform duration-200',
                    isGroupCollapsed ? '-rotate-90' : 'rotate-0'
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* Group Items */}
              <div
                id={groupId}
                role="list"
                aria-label={`Grup navigasi ${group}`}
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  isGroupCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
                )}
              >
                <div className="pt-0.5 space-y-0.5">
                  {items.map((item) => {
                    const active = isActive(item.href)
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        role="listitem"
                        aria-current={active ? 'page' : undefined}
                        title={item.label}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all duration-200 group',
                          active
                            ? 'bg-gradient-to-r from-primary-50 to-transparent dark:from-primary-900/30 dark:to-transparent text-primary-700 dark:text-primary-400 shadow-sm border border-primary-100 dark:border-primary-800/50'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200'
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-4 h-4 flex-shrink-0',
                            active
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'
                          )}
                          aria-hidden="true"
                        />
                        <span className="text-sm flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 border-t border-neutral-200 dark:border-neutral-800 pt-3">
        <button
          type="button"
          data-testid="admin-sidebar-signout-button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-600 dark:text-neutral-400 hover:text-danger-600 font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm group"
        >
          <LogOut
            className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
          Keluar
        </button>
      </div>
    </aside>
  )
}
