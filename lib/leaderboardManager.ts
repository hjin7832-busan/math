// ─────────────────────────────────────────────────────────────────
// Leaderboard Manager — Supabase DB 연동 버전
//
// 규칙:
//  · Supabase `game_scores` 테이블 연동 (실시간 스코어 기록 및 랭킹)
//  · 게임별 / 날짜별 독자 기록 관리
//  · 오늘 리더보드: 당일 게임 기록 (점수 내림차순)
//  · 명예의 전당  : 지난 7일간 각 게임별 일자별 1등 등재
//  · DB 용량 관리를 위한 유저별 일일 플레이 횟수 제한 (최대 5회)
// ─────────────────────────────────────────────────────────────────

import { supabase } from './supabase'

export interface LeaderboardEntry {
  id: string
  gameId: string
  numericName: string
  score: number
  correctCount: number
  maxCombo: number
  date: string        // YYYY-MM-DD
  createdAt: string   // ISO string
}

export interface HallOfFameEntry {
  id: string
  gameId: string
  date: string        // YYYY-MM-DD
  numericName: string
  score: number
  correctCount: number
  maxCombo: number
  savedAt: string     // ISO string
}

export const MAX_DAILY_PLAY_COUNT = 5

// ── 날짜 유틸 ──────────────────────────────────────────────────────
export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── 학번/PIN 번호 검증 ─────────────────────────────────────────────
export function validateNumericName(input: string): { ok: boolean; msg?: string } {
  const s = input.trim()
  if (!s) return { ok: false, msg: '학번/PIN 번호를 입력해 주세요.' }
  if (!/^\d+$/.test(s)) return { ok: false, msg: '숫자만 입력할 수 있습니다. (예: 20301)' }
  if (s.length < 2 || s.length > 10) return { ok: false, msg: '2~10자리 숫자로 입력해 주세요.' }
  return { ok: true }
}

// ── 유저의 당일 플레이/등록 횟수 조회 ──────────────────────────────
export async function getUserDailyPlayStatus(
  numericName: string,
  gameId: string
): Promise<{ count: number; remaining: number; maxLimit: number; canPlay: boolean; msg?: string }> {
  const trimmed = numericName.trim()
  if (!trimmed) {
    return { count: 0, remaining: MAX_DAILY_PLAY_COUNT, maxLimit: MAX_DAILY_PLAY_COUNT, canPlay: true }
  }

  try {
    const today = todayStr()
    const { count, error } = await supabase
      .from('game_scores')
      .select('*', { count: 'exact', head: true })
      .eq('numeric_name', trimmed)
      .eq('game_id', gameId)
      .eq('play_date', today)

    if (error) {
      console.error('Supabase query error (play count):', error)
      return { count: 0, remaining: MAX_DAILY_PLAY_COUNT, maxLimit: MAX_DAILY_PLAY_COUNT, canPlay: true }
    }

    const currentCount = count ?? 0
    const remaining = Math.max(0, MAX_DAILY_PLAY_COUNT - currentCount)
    const canPlay = currentCount < MAX_DAILY_PLAY_COUNT

    return {
      count: currentCount,
      remaining,
      maxLimit: MAX_DAILY_PLAY_COUNT,
      canPlay,
      msg: !canPlay ? '오늘의 도전 횟수를 모두 소모했습니다. (일일 최대 5회)' : undefined,
    }
  } catch (err) {
    console.error('Failed to fetch play count from Supabase:', err)
    return { count: 0, remaining: MAX_DAILY_PLAY_COUNT, maxLimit: MAX_DAILY_PLAY_COUNT, canPlay: true }
  }
}

// ── 오늘의 게임별 리더보드 (Supabase 조회) ───────────────────────
export async function getTodayLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
  try {
    const today = todayStr()
    const { data, error } = await supabase
      .from('game_scores')
      .select('*')
      .eq('game_id', gameId)
      .eq('play_date', today)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(50)

    if (error || !data) {
      console.error('Error fetching today leaderboard:', error)
      return []
    }

    return data.map((item: {
      id: string
      game_id: string
      numeric_name: string
      score: number
      correct_count: number
      max_combo: number
      play_date: string
      created_at: string
    }) => ({
      id: item.id,
      gameId: item.game_id,
      numericName: item.numeric_name,
      score: item.score,
      correctCount: item.correct_count,
      maxCombo: item.max_combo,
      date: item.play_date,
      createdAt: item.created_at,
    }))
  } catch (err) {
    console.error('Failed to fetch today leaderboard:', err)
    return []
  }
}

// ── 게임별 명예의 전당 (지난 7일 일자별 1위 Supabase 집계) ───────
export async function getHallOfFame(gameId: string): Promise<HallOfFameEntry[]> {
  try {
    const today = todayStr()
    const d = new Date()
    d.setDate(d.getDate() - 7)
    const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('game_scores')
      .select('*')
      .eq('game_id', gameId)
      .lt('play_date', today)
      .gte('play_date', startDate)
      .order('play_date', { ascending: false })
      .order('score', { ascending: false })

    if (error || !data) {
      console.error('Error fetching hall of fame:', error)
      return []
    }

    const hofMap = new Map<string, HallOfFameEntry>()
    for (const item of data) {
      if (!hofMap.has(item.play_date)) {
        hofMap.set(item.play_date, {
          id: item.id,
          gameId: item.game_id,
          date: item.play_date,
          numericName: item.numeric_name,
          score: item.score,
          correctCount: item.correct_count,
          maxCombo: item.max_combo,
          savedAt: item.created_at,
        })
      }
    }

    return Array.from(hofMap.values()).sort((a, b) => b.date.localeCompare(a.date))
  } catch (err) {
    console.error('Failed to fetch hall of fame:', err)
    return []
  }
}

// ── 점수 등록 (Supabase DB 저장) ─────────────────────────────────
export async function submitScore(payload: {
  gameId: string
  numericName: string
  score: number
  correctCount: number
  maxCombo: number
}): Promise<{ ok: boolean; msg?: string; entry?: LeaderboardEntry; remaining?: number }> {
  const gId = payload.gameId || 'gugudan'
  const v = validateNumericName(payload.numericName)
  if (!v.ok) return { ok: false, msg: v.msg }

  const trimmedName = payload.numericName.trim()

  // 1. 일일 횟수 제한 검증
  const status = await getUserDailyPlayStatus(trimmedName, gId)
  if (!status.canPlay) {
    return { ok: false, msg: '오늘의 도전 횟수를 모두 소모했습니다. (일일 최대 5회)' }
  }

  const today = todayStr()

  try {
    const { data, error } = await supabase
      .from('game_scores')
      .insert([
        {
          game_id: gId,
          numeric_name: trimmedName,
          score: payload.score,
          correct_count: payload.correctCount,
          max_combo: payload.maxCombo,
          play_date: today,
        },
      ])
      .select()
      .single()

    if (error || !data) {
      console.error('Supabase score insert error:', error)
      return { ok: false, msg: '점수 등록 중 오류가 발생했습니다. 다시 시도해 주세요.' }
    }

    const entry: LeaderboardEntry = {
      id: data.id,
      gameId: data.game_id,
      numericName: data.numeric_name,
      score: data.score,
      correctCount: data.correct_count,
      maxCombo: data.max_combo,
      date: data.play_date,
      createdAt: data.created_at,
    }

    const remaining = Math.max(0, MAX_DAILY_PLAY_COUNT - (status.count + 1))
    return { ok: true, entry, remaining }
  } catch (err) {
    console.error('Failed to submit score:', err)
    return { ok: false, msg: '데이터베이스 연동에 실패했습니다. 네트워크 상태를 확인해 주세요.' }
  }
}
