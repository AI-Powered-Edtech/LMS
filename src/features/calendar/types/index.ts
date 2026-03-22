/** Entity utama Kalender */
export interface Calendar {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/** Payload untuk create/update Kalender */
export interface CalendarInput {
  tenant_id: string
}

/** Response wrapper dari API Kalender */
export interface CalendarResponse {
  data: Calendar[]
  count: number
}

/** Filter options untuk query Kalender */
export interface CalendarFilter {
  search?: string
  page?: number
  limit?: number
}
