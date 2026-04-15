export interface Announcement {
  id: string
  tenant_id: string
  course_id: string | null
  title: string
  content: string
  priority: 'low' | 'normal' | 'high'
  target_audience: 'course_students' | 'course_staff' | 'all_students' | 'system'
  status: 'draft' | 'published' | 'archived'
  is_pinned: boolean
  allow_comments: boolean
  requires_rsvp: boolean
  location: string | null
  contact_person: string | null
  created_by: string
  created_at: string
  updated_at: string
  author?: {
    full_name: string
    avatar_url: string | null
  }
  rsvp_status?: 'yes' | 'no' | 'maybe'
}

export interface AnnouncementRSVP {
  id: string
  tenant_id: string
  announcement_id: string
  user_id: string
  response: 'yes' | 'no' | 'maybe'
  responded_at: string
}
