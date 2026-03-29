import {
  Award,
  BookOpen,
  ChevronLeft,
  Eye,
  EyeOff,
  Flame,
  Star,
  User,
  Zap,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/src/contexts/AuthContext'
import {
  useProfileIdByUsername,
  usePublicProfileById,
  useUpdateProfilePrivacy,
} from '@/src/features/profile/hooks/usePublicProfile'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { cn } from '@/src/utils/cn'

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8 animate-pulse">
      <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="h-32 md:h-48 w-full bg-slate-200 dark:bg-slate-700" />
        <div className="px-6 md:px-8 pb-8">
          <div className="flex flex-col items-center -mt-12 gap-3">
            <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-600 border-4 border-white dark:border-slate-800" />
            <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number | string
  iconClass?: string
}

function StatCard({ icon: Icon, label, value, iconClass }: StatCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 bg-slate-50 dark:bg-slate-700/60 rounded-2xl text-center">
      <Icon className={cn('w-5 h-5', iconClass ?? 'text-indigo-500 dark:text-indigo-400')} />
      <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
        {value}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{label}</p>
    </div>
  )
}

// ── Badge chip ────────────────────────────────────────────────────────────────
function BadgeChip({ name, icon }: { name: string; icon: string | null }) {
  const emoji = icon ?? '🏅'
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm font-medium text-amber-800 dark:text-amber-300">
      <span className="text-base leading-none">{emoji}</span>
      <span className="truncate">{name}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function PublicProfile() {
  usePageTitle('Profil Publik')
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Resolve username → userId
  const { data: resolved, isLoading: isResolvingId } = useProfileIdByUsername(username)
  const targetUserId = resolved?.id

  // Fetch profile data
  const { data: profile, isLoading: isLoadingProfile } = usePublicProfileById(targetUserId)

  const isOwn = !!user && user.id === targetUserId
  const { mutate: setPrivacy, isPending: isToggling } = useUpdateProfilePrivacy(
    targetUserId ?? ''
  )

  const isLoading = isResolvingId || isLoadingProfile

  if (isLoading) return <ProfileSkeleton />

  // Not found or private (null = private/not found, undefined = still loading handled above)
  if (!targetUserId || profile == null) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors font-medium text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Kembali
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center">
          <div className="w-20 h-20 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Profil Tidak Tersedia
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Profil ini tidak tersedia atau bersifat privat.
          </p>
        </div>
      </div>
    )
  }

  const { stats, badges } = profile
  const displayName = profile.full_name || profile.username || 'Pengguna'
  const avatarSrc =
    profile.avatar_url ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors font-medium text-sm"
      >
        <ChevronLeft className="w-4 h-4" /> Kembali
      </button>

      {/* Profile card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Cover */}
        <div className="h-32 md:h-48 w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />

        <div className="px-6 md:px-8 pb-8">
          {/* Avatar + name row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 md:-mt-16 mb-4">
            <div className="flex flex-col items-start gap-2">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg bg-slate-100 dark:bg-slate-700 shrink-0">
                <img
                  src={avatarSrc}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).src =
                      `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`
                  }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {displayName}
                </h1>
                {profile.username && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    @{profile.username}
                  </p>
                )}
              </div>
            </div>

            {/* Privacy toggle — owner only */}
            {isOwn && (
              <button
                onClick={() => setPrivacy(!profile.is_profile_public)}
                disabled={isToggling}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all shrink-0',
                  profile.is_profile_public
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                    : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600',
                  isToggling && 'opacity-50 cursor-not-allowed'
                )}
              >
                {profile.is_profile_public ? (
                  <>
                    <Eye className="w-4 h-4" />
                    Profil Publik
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Profil Privat
                  </>
                )}
              </button>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 max-w-2xl">
              {profile.bio}
            </p>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              icon={Zap}
              label="Total XP"
              value={stats.total_xp.toLocaleString('id-ID')}
              iconClass="text-yellow-500"
            />
            <StatCard
              icon={Star}
              label="Level"
              value={stats.level}
              iconClass="text-indigo-500 dark:text-indigo-400"
            />
            <StatCard
              icon={Flame}
              label="Hari Beruntun"
              value={stats.streak}
              iconClass="text-orange-500"
            />
            <StatCard
              icon={BookOpen}
              label="Kursus Selesai"
              value={stats.courses_done}
              iconClass="text-emerald-500"
            />
          </div>

          {/* Badges */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Lencana ({stats.badge_count})
              </h2>
            </div>

            {badges.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-600">
                <Award className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Belum ada lencana yang diraih
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {badges.map((badge: { id: string; name: string; icon: string | null }) => (
                  <BadgeChip key={badge.id} name={badge.name} icon={badge.icon} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
