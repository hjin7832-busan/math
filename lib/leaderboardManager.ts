// ─────────────────────────────────────────────────────────────────
// Leaderboard Manager — 수학공부HYO
//
// 규칙:
//  · 오늘 리더보드: 당일 게임 기록 (자정마다 리셋)
//  · 명예의 전당  : 매일 자정 전날 1등 → HOF 저장 (7일 후 자동 삭제)
// ─────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string
  numericName: string
  score: number
  correctCount: number
  maxCombo: number
  date: string        // YYYY-MM-DD
  createdAt: string   // ISO string
}

export interface HallOfFameEntry {
  id: string
  date: string        // YYYY-MM-DD
  numericName: string
  score: number
  correctCount: number
  maxCombo: number
  savedAt: string     // ISO string — HOF 등재 시각 (7일 만료 기준)
}

const KEY = {
  TODAY: 'hyo_today_v2',
  HOF:   'hyo_hof_v2',
  LAST:  'hyo_last_date_v2',
}

const HOF_MAX_DAYS = 7 // 주간 리셋: 7일 이후 HOF 레코드 삭제

// ── 유틸 ──────────────────────────────────────────────────────────
export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(val))
}

// ── 숫자 이름 검증 ────────────────────────────────────────────────
export function validateNumericName(input: string): { ok: boolean; msg?: string } {
  const s = input.trim()
  if (!s) return { ok: false, msg: '숫자 이름을 입력해 주세요.' }
  if (!/^\d+$/.test(s)) return { ok: false, msg: '숫자만 입력할 수 있습니다. (예: 20301)' }
  if (s.length < 2 || s.length > 10) return { ok: false, msg: '2~10자리 숫자로 입력해 주세요.' }
  return { ok: true }
}

// ── 자정 리셋 (호출할 때마다 자동 검사) ──────────────────────────
export function checkMidnightReset(): void {
  if (typeof window === 'undefined') return
  const today = todayStr()
  const last = localStorage.getItem(KEY.LAST)

  if (!last) {
    writeJSON(KEY.TODAY, [])
    localStorage.setItem(KEY.LAST, today)
    return
  }

  if (last !== today) {
    // 전날 1등 → HOF
    const todayList = readJSON<LeaderboardEntry[]>(KEY.TODAY, [])
    if (todayList.length > 0) {
      todayList.sort((a, b) => b.score - a.score)
      const winner = todayList[0]
      const hof = readJSON<HallOfFameEntry[]>(KEY.HOF, [])

      // 주간 만료 레코드 제거 (7일 초과)
      const cutoff = Date.now() - HOF_MAX_DAYS * 24 * 60 * 60 * 1000
      const fresh = hof.filter(h => new Date(h.savedAt).getTime() > cutoff)

      // 중복 방지
      const alreadyExists = fresh.some(h => h.date === last)
      if (!alreadyExists) {
        fresh.unshift({
          id: winner.id,
          date: last,
          numericName: winner.numericName,
          score: winner.score,
          correctCount: winner.correctCount,
          maxCombo: winner.maxCombo,
          savedAt: new Date().toISOString(),
        })
      }
      writeJSON(KEY.HOF, fresh)
    }

    // 오늘 리더보드 리셋
    writeJSON(KEY.TODAY, [])
    localStorage.setItem(KEY.LAST, today)
  }
}

// ── 중복 확인 ─────────────────────────────────────────────────────
export function isDuplicate(numericName: string): boolean {
  checkMidnightReset()
  const list = readJSON<LeaderboardEntry[]>(KEY.TODAY, [])
  return list.some(e => e.numericName === numericName.trim())
}

// ── 오늘 리더보드 ─────────────────────────────────────────────────
export function getTodayLeaderboard(): LeaderboardEntry[] {
  checkMidnightReset()
  const list = readJSON<LeaderboardEntry[]>(KEY.TODAY, [])
  return [...list].sort((a, b) => b.score - a.score)
}

// ── 명예의 전당 (HOF) ─────────────────────────────────────────────
export function getHallOfFame(): HallOfFameEntry[] {
  checkMidnightReset()
  const hof = readJSON<HallOfFameEntry[]>(KEY.HOF, [])
  // 주간 만료 제거 후 반환
  const cutoff = Date.now() - HOF_MAX_DAYS * 24 * 60 * 60 * 1000
  return hof.filter(h => new Date(h.savedAt).getTime() > cutoff)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// ── 점수 등록 ─────────────────────────────────────────────────────
export function submitScore(payload: {
  numericName: string
  score: number
  correctCount: number
  maxCombo: number
}): { ok: boolean; msg?: string; entry?: LeaderboardEntry } {
  if (typeof window === 'undefined') return { ok: false, msg: '서버 환경에서는 사용할 수 없습니다.' }
  checkMidnightReset()

  const v = validateNumericName(payload.numericName)
  if (!v.ok) return { ok: false, msg: v.msg }

  if (isDuplicate(payload.numericName)) {
    return { ok: false, msg: `[${payload.numericName}]은 오늘 이미 등록된 숫자 이름입니다.` }
  }

  const entry: LeaderboardEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    numericName: payload.numericName.trim(),
    score: payload.score,
    correctCount: payload.correctCount,
    maxCombo: payload.maxCombo,
    date: todayStr(),
    createdAt: new Date().toISOString(),
  }

  const list = readJSON<LeaderboardEntry[]>(KEY.TODAY, [])
  list.push(entry)
  writeJSON(KEY.TODAY, list)

  return { ok: true, entry }
}
