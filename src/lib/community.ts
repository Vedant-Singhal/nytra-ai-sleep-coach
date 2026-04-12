import { getClient } from './supabase'
import type { CommunityUser, FeedEntry, ReactionEmoji, SleepSession } from '@/types'

type FeedScope = 'following' | 'discover'

const REACTIONS: ReactionEmoji[] = ['💤', '💪', '🔥']

async function getFollowingIds(userId: string): Promise<string[]> {
  const supabase = getClient()
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  return (follows ?? []).map((r: { following_id: string }) => r.following_id)
}

export async function getCommunityFeed(userId: string, scope: FeedScope = 'following'): Promise<FeedEntry[]> {
  const supabase = getClient()

  const followingIds = await getFollowingIds(userId)
  if (scope === 'following' && !followingIds.length) return []

  let feedQuery = supabase
    .from('sleep_sessions')
    .select('*, profiles(username, avatar_url)')
    .eq('is_shared', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (scope === 'following') {
    feedQuery = feedQuery.in('user_id', followingIds)
  } else {
    feedQuery = feedQuery.neq('user_id', userId)
  }

  const { data: feedRows } = await feedQuery

  if (!feedRows?.length) return []

  const sessionIds = feedRows.map((r: { id: string }) => r.id)
  const { data: reactionRows, error: reactionError } = await supabase
    .from('kudos')
    .select('session_id, from_user_id, reaction_emoji')
    .in('session_id', sessionIds)

  let safeRows: Array<{ session_id: string; from_user_id: string; reaction_emoji?: string | null }> = reactionRows ?? []
  if (reactionError) {
    // Backward compatibility when reaction_emoji column is not present yet.
    const { data: fallbackRows } = await supabase
      .from('kudos')
      .select('session_id, from_user_id')
      .in('session_id', sessionIds)
    safeRows = (fallbackRows ?? []).map((r: { session_id: string; from_user_id: string }) => ({
      ...r,
      reaction_emoji: '💪',
    }))
  }

  const baseCounts = (): Record<ReactionEmoji, number> => ({
    '💤': 0,
    '💪': 0,
    '🔥': 0,
  })
  const reactionCounts: Record<string, Record<ReactionEmoji, number>> = {}
  const myReaction: Record<string, ReactionEmoji | null> = {}

  for (const row of safeRows) {
    const emoji = REACTIONS.includes(row.reaction_emoji as ReactionEmoji)
      ? (row.reaction_emoji as ReactionEmoji)
      : '💪'
    reactionCounts[row.session_id] = reactionCounts[row.session_id] ?? baseCounts()
    reactionCounts[row.session_id][emoji] += 1
    if (row.from_user_id === userId) myReaction[row.session_id] = emoji
  }

  const followingSet = new Set(followingIds)

  return feedRows.map((r: {
    id: string; user_id: string; score: number; duration_minutes: number;
    bedtime: string; wake_time: string; motion_index: number; created_at: string;
    profiles: { username?: string; avatar_url?: string } | null
  }) => {
    const session: SleepSession = {
      id: r.id,
      date: r.created_at,
      bedtime: r.bedtime,
      wakeTime: r.wake_time,
      score: r.score,
      durationMinutes: r.duration_minutes,
      motionIndex: r.motion_index,
      isShared: true,
      samples: [],
    }
    return {
      session,
      userId: r.user_id,
      username: r.profiles?.username ?? 'Unknown',
      avatarUrl: r.profiles?.avatar_url ?? undefined,
      reactionCounts: reactionCounts[r.id] ?? baseCounts(),
      viewerReaction: myReaction[r.id] ?? null,
      isFollowingAuthor: followingSet.has(r.user_id),
    }
  })
}

export async function syncSessionToSupabase(
  session: SleepSession,
  userId: string
): Promise<void> {
  const supabase = getClient()
  await supabase.from('sleep_sessions').upsert({
    id: session.id,
    user_id: userId,
    score: session.score,
    duration_minutes: session.durationMinutes,
    bedtime: session.bedtime,
    wake_time: session.wakeTime,
    motion_index: session.motionIndex,
    is_shared: session.isShared,
  })
}

export async function setReaction(
  sessionId: string,
  userId: string,
  emoji: ReactionEmoji | null
): Promise<void> {
  const supabase = getClient()
  if (!emoji) {
    await supabase.from('kudos').delete()
      .eq('session_id', sessionId).eq('from_user_id', userId)
  } else {
    const { error } = await supabase.from('kudos').upsert({
      session_id: sessionId,
      from_user_id: userId,
      reaction_emoji: emoji,
    })
    if (error) {
      // Backward compatibility when reaction_emoji column is not present yet.
      await supabase.from('kudos').upsert({ session_id: sessionId, from_user_id: userId })
    }
  }
}

export async function followUser(followerId: string, username: string): Promise<string | null> {
  const supabase = getClient()
  const { data: profile } = await supabase
    .from('profiles').select('id').eq('username', username).single()
  if (!profile) return 'User not found'
  if (profile.id === followerId) return 'You cannot follow yourself'
  await supabase.from('follows').upsert({ follower_id: followerId, following_id: profile.id })
  return null
}

export async function toggleFollow(
  followerId: string,
  followingId: string,
  isFollowing: boolean
): Promise<void> {
  const supabase = getClient()
  if (isFollowing) {
    await supabase.from('follows').delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
  } else {
    await supabase.from('follows').upsert({ follower_id: followerId, following_id: followingId })
  }
}

export async function searchUsers(userId: string, query: string): Promise<CommunityUser[]> {
  const supabase = getClient()
  const q = query.trim()
  if (q.length < 2) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${q}%`)
    .limit(12)

  const filtered = (profiles ?? []).filter((p: { id: string }) => p.id !== userId)
  if (!filtered.length) return []

  const ids = filtered.map((p: { id: string }) => p.id)
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .in('following_id', ids)

  const followingSet = new Set((follows ?? []).map((f: { following_id: string }) => f.following_id))

  return filtered.map((p: { id: string; username: string; avatar_url: string | null }) => ({
    id: p.id,
    username: p.username,
    avatarUrl: p.avatar_url ?? undefined,
    isFollowing: followingSet.has(p.id),
  }))
}
