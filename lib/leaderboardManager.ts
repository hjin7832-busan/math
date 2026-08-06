// Leaderboard Manager for 수학공부 HYO
// Handles daily leaderboard, midnight auto-reset, Hall of Fame, and duplicate numeric name checks.

export interface LeaderboardEntry {
  id: string
  numericName: string
  score: number
  correctCount: number
  maxCombo: number
  date: string // YYYY-MM-DD
  createdAt: string
}

export interface HallOfFameEntry {
  id: string
  date: string // YYYY-MM-DD (e.g., 2026-08-05)
  numericName: string
  score: number
  correctCount: number
  maxCombo: number
}

const STORAGE_KEYS = {
  TODAY_LEADERBOARD: 'hyo_today_leaderboard_v1',
  HALL_OF_FAME: 'hyo_hall_of_fame_v1',
  LAST_RESET_DATE: 'hyo_last_reset_date_v1',
}

// Utility to get today's date string YYYY-MM-DD in local time
export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Validate if input consists strictly of numbers (학번 5자리 or PIN 번호 등)
export function validateNumericName(input: string): { valid: boolean; message?: string } {
  const trimmed = input.trim()
  if (!trimmed) {
    return { valid: false, message: '숫자로 된 이름을 입력해 주세요.' }
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, message: '문자나 특수문자는 입력할 수 없습니다. 오직 숫자로만 입력해 주세요! (예: 20301)' }
  }
  if (trimmed.length < 2 || trimmed.length > 10) {
    return { valid: false, message: '숫자 이름은 2자리 ~ 10자리 사이여야 합니다.' }
  }
  return { valid: true }
}

// Check if midnight auto-reset should take place
export function checkAndResetDailyLeaderboard(): void {
  if (typeof window === 'undefined') return

  const today = getTodayDateString()
  const lastResetDate = localStorage.getItem(STORAGE_KEYS.LAST_RESET_DATE)

  if (!lastResetDate) {
    // Initial run
    localStorage.setItem(STORAGE_KEYS.LAST_RESET_DATE, today)
    return
  }

  // If date has passed midnight (different YYYY-MM-DD)
  if (lastResetDate !== today) {
    const rawTodayList = localStorage.getItem(STORAGE_KEYS.TODAY_LEADERBOARD)
    if (rawTodayList) {
      try {
        const todayEntries: LeaderboardEntry[] = JSON.parse(rawTodayList)
        if (todayEntries.length > 0) {
          // Sort descending by score
          todayEntries.sort((a, b) => b.score - a.score || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          const winner = todayEntries[0]

          // Save #1 winner to Hall of Fame
          const rawHof = localStorage.getItem(STORAGE_KEYS.HALL_OF_FAME)
          const hof: HallOfFameEntry[] = rawHof ? JSON.parse(rawHof) : []
          
          // Avoid duplicate entry for the same date in HOF
          const existingWinnerIdx = hof.findIndex((h) => h.date === lastResetDate)
          const newHofEntry: HallOfFameEntry = {
            id: winner.id,
            date: lastResetDate,
            numericName: winner.numericName,
            score: winner.score,
            correctCount: winner.correctCount,
            maxCombo: winner.maxCombo,
          }

          if (existingWinnerIdx >= 0) {
            hof[existingWinnerIdx] = newHofEntry
          } else {
            hof.unshift(newHofEntry) // Add newest at top
          }

          localStorage.setItem(STORAGE_KEYS.HALL_OF_FAME, JSON.stringify(hof))
        }
      } catch (e) {
        console.error('Error processing midnight reset:', e)
      }
    }

    // Reset Today's Leaderboard for the new day
    localStorage.setItem(STORAGE_KEYS.TODAY_LEADERBOARD, JSON.stringify([]))
    localStorage.setItem(STORAGE_KEYS.LAST_RESET_DATE, today)
  }
}

// Check if numeric name is already registered today
export function isDuplicateNumericName(numericName: string): boolean {
  if (typeof window === 'undefined') return false
  checkAndResetDailyLeaderboard()

  const entries = getTodayLeaderboard()
  return entries.some((item) => item.numericName.trim() === numericName.trim())
}

// Get today's leaderboard sorted by score descending
export function getTodayLeaderboard(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return []
  checkAndResetDailyLeaderboard()

  const raw = localStorage.getItem(STORAGE_KEYS.TODAY_LEADERBOARD)
  if (!raw) return []
  try {
    const list: LeaderboardEntry[] = JSON.parse(raw)
    return list.sort((a, b) => b.score - a.score || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  } catch (e) {
    return []
  }
}

// Get Hall of Fame records
export function getHallOfFame(): HallOfFameEntry[] {
  if (typeof window === 'undefined') return []
  checkAndResetDailyLeaderboard()

  const raw = localStorage.getItem(STORAGE_KEYS.HALL_OF_FAME)
  if (!raw) return []
  try {
    const list: HallOfFameEntry[] = JSON.parse(raw)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch (e) {
    return []
  }
}

// Submit a new game score
export function submitGameScore(payload: {
  numericName: string
  score: number
  correctCount: number
  maxCombo: number
}): { success: boolean; message?: string; entry?: LeaderboardEntry } {
  if (typeof window === 'undefined') return { success: false, message: '클라이언트 환경이 아닙니다.' }

  checkAndResetDailyLeaderboard()

  const validation = validateNumericName(payload.numericName)
  if (!validation.valid) {
    return { success: false, message: validation.message }
  }

  if (isDuplicateNumericName(payload.numericName)) {
    return {
      success: false,
      message: `숫자 이름 [${payload.numericName}]은(는) 이미 오늘 순위에 등록되어 있습니다! 중복 입력을 방지하기 위해 다른 숫자 이름을 사용해 주세요.`,
    }
  }

  const today = getTodayDateString()
  const newEntry: LeaderboardEntry = {
    id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    numericName: payload.numericName.trim(),
    score: payload.score,
    correctCount: payload.correctCount,
    maxCombo: payload.maxCombo,
    date: today,
    createdAt: new Date().toISOString(),
  }

  const currentList = getTodayLeaderboard()
  currentList.push(newEntry)
  localStorage.setItem(STORAGE_KEYS.TODAY_LEADERBOARD, JSON.stringify(currentList))

  return { success: true, entry: newEntry }
}

// Utility mock data generator for initial demonstration if empty
export function seedSampleDataIfEmpty(): void {
  if (typeof window === 'undefined') return
  const today = getTodayDateString()
  const current = getTodayLeaderboard()
  
  if (current.length === 0) {
    const sampleToday: LeaderboardEntry[] = [
      { id: 'sample_1', numericName: '20301', score: 1480, correctCount: 22, maxCombo: 12, date: today, createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'sample_2', numericName: '20412', score: 1250, correctCount: 18, maxCombo: 8, date: today, createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'sample_3', numericName: '10105', score: 980, correctCount: 14, maxCombo: 5, date: today, createdAt: new Date(Date.now() - 10800000).toISOString() },
    ]
    localStorage.setItem(STORAGE_KEYS.TODAY_LEADERBOARD, JSON.stringify(sampleToday))
  }

  const rawHof = localStorage.getItem(STORAGE_KEYS.HALL_OF_FAME)
  if (!rawHof || JSON.parse(rawHof).length === 0) {
    const sampleHof: HallOfFameEntry[] = [
      { id: 'hof_1', date: '2026-08-05', numericName: '20315', score: 1650, correctCount: 25, maxCombo: 15 },
      { id: 'hof_2', date: '2026-08-04', numericName: '20108', score: 1520, correctCount: 23, maxCombo: 11 },
      { id: 'hof_3', date: '2026-08-03', numericName: '10220', score: 1390, correctCount: 20, maxCombo: 9 },
    ]
    localStorage.setItem(STORAGE_KEYS.HALL_OF_FAME, JSON.stringify(sampleHof))
  }
}
