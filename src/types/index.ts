export interface MotionSample {
  timestamp: string // ISO string
  magnitude: number // abs acceleration minus gravity (m/s²)
}

export type SharePref = 'score_only' | 'score_duration' | 'full'
export type ReactionEmoji = '💤' | '💪' | '🔥'

export interface SleepSession {
  id: string
  date: string        // ISO – the morning this session ended
  bedtime: string     // ISO
  wakeTime: string    // ISO
  score: number       // 0–100
  durationMinutes: number
  motionIndex: number // 0.0 still → 1.0 very active
  isShared: boolean
  isExcluded?: boolean // if true, excluded from cumulative stats
  samples: MotionSample[]
}

export interface FeedEntry {
  session: SleepSession
  userId: string
  username: string
  avatarUrl?: string
  reactionCounts: Record<ReactionEmoji, number>
  viewerReaction: ReactionEmoji | null
  isFollowingAuthor: boolean
}

export interface CommunityUser {
  id: string
  username: string
  avatarUrl?: string
  isFollowing: boolean
}

export interface SleepGoal {
  wakeHour: number
  wakeMinute: number
  durationGoalHours: number
}

export interface UserProfile {
  id: string
  username: string
  avatarUrl?: string
  wakeGoalHour: number
  wakeGoalMinute: number
  sleepGoalHours: number
}

// Supabase table row shapes
export interface DbSleepSession {
  id: string
  user_id: string
  score: number
  duration_minutes: number
  bedtime: string
  wake_time: string
  motion_index: number
  is_shared: boolean
  created_at: string
}

export interface DbProfile {
  id: string
  username: string
  avatar_url: string | null
  wake_goal_hour: number
  wake_goal_minute: number
  sleep_goal_hours: number
}

export interface DbKudos {
  id: string
  session_id: string
  from_user_id: string
  created_at: string
}
