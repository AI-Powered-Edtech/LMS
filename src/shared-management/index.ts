// ==========================================================================
// shared-management — Consolidated components for admin & teacher dashboards
//
// Sprint D: Eliminates duplicate table, stats, and filter components
// that previously existed in both administration/ and gradebook/ modules.
//
// Migration guide:
// - Replace <AdministrationTable> with <DataTable>
// - Replace <AdministrationStats> with <StatsCards>
// - Replace <AdministrationFilterBar> with <FilterBar>
// - Same props pattern, but now generic and role-aware
// ==========================================================================

export type { ColumnDef, DataTableProps, SortDirection } from './DataTable'
export { DataTable } from './DataTable'
export type { FilterConfig, FilterOption } from './FilterBar'
export { FilterBar } from './FilterBar'
export type { StatCardData } from './StatsCards'
export { StatsCards } from './StatsCards'
