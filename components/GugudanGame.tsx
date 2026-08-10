'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  validateNumericName,
  submitScore,
  getUserDailyPlayStatus,
  MAX_DAILY_PLAY_COUNT,
} from '@/lib/leaderboardManager'
import GameLeaderboard from './GameLeaderboard'

// ── 효과음 ──────────────────────────────────────────────────────────
function beep(type: 'ok' | 'ng' | 'end') {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    if (type === 'ok') {
      osc.type = 'sine'
      osc.frequency.value = 660
      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)
    } else if (type === 'ng') {
      osc.type = 'sawtooth'
      osc.frequency.value = 180
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      osc.start(now)
      osc.stop(now + 0.25)
    } else {
      osc.type = 'triangle'
      osc.frequency.value = 300
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      osc.start(now)
      osc.stop(now + 0.5)
    }
  } catch {
    /* 자동재생 차단 무시 */
  }
}

// ── 구구단 문제 생성 ──────────────────────────────────────────────
interface Q {
  text: string
  answer: number
  choices: number[]
}

function makeQuestion(): Q {
  const a = Math.floor(Math.random() * 8) + 2 // 2~9
  const b = Math.floor(Math.random() * 8) + 2 // 2~9
  const answer = a * b

  const wrong = new Set<number>()
  while (wrong.size < 3) {
    const delta = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1)
    const w = answer + delta
    if (w > 0 && w !== answer) wrong.add(w)
  }

  const choices = [answer, ...Array.from(wrong)].sort(() => Math.random() - 0.5)
  return { text: `${a} × ${b} = ?`, answer, choices }
}

const GAME_SECS = 45
const GAME_ID = 'gugudan'

export default function GugudanGame({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')

  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle')
  const [q, setQ] = useState<Q>(makeQuestion())
  const [timeLeft, setTimeLeft] = useState(GAME_SECS)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [flash, setFlash] = useState<'ok' | 'ng' | null>(null)
  const [resultMsg, setResultMsg] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // ── 일일 플레이 상태 ─────────────────────────────────────────────
  const [playStatus, setPlayStatus] = useState<{
    count: number
    remaining: number
    maxLimit: number
    canPlay: boolean
    msg?: string
  }>({
    count: 0,
    remaining: MAX_DAILY_PLAY_COUNT,
    maxLimit: MAX_DAILY_PLAY_COUNT,
    canPlay: true,
  })

  // ── refs로 최신 게임 상태 추적 ────────────────────────────────────
  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const nameRef = useRef('')
  const phaseRef = useRef<'idle' | 'playing' | 'done'>('idle')

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const checkUserLimit = useCallback(async (inputName: string) => {
    const v = validateNumericName(inputName)
    if (!v.ok) {
      setNameErr(v.msg ?? '')
      return
    }
    setNameErr('')
    const status = await getUserDailyPlayStatus(inputName, GAME_ID)
    setPlayStatus(status)
    if (!status.canPlay) {
      setNameErr('오늘의 도전 횟수를 모두 소모했습니다. (1일 최대 5회)')
    }
  }, [])

  useEffect(() => {
    if (name.trim().length >= 2) {
      checkUserLimit(name)
    }
  }, [name, checkUserLimit])

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  // ── endGame: Supabase DB에 점수 등록 ────────────────────────────
  const endGame = useCallback(async () => {
    clearTimer()
    beep('end')
    phaseRef.current = 'done'
    setPhase('done')

    const finalScore = scoreRef.current
    const finalCorrect = correctRef.current
    const finalMaxCombo = maxComboRef.current

    const res = await submitScore({
      gameId: GAME_ID,
      numericName: nameRef.current,
      score: finalScore,
      correctCount: finalCorrect,
      maxCombo: finalMaxCombo,
    })

    if (res.ok) {
      setResultMsg(
        `🎉 점수가 Supabase DB에 등록되었습니다! (오늘 남은 도전: ${res.remaining ?? 0}회)`
      )
    } else {
      setResultMsg(res.msg ?? '점수 등록 실패')
    }

    setRefreshTrigger((prev) => prev + 1)
    if (nameRef.current) {
      const updatedStatus = await getUserDailyPlayStatus(nameRef.current, GAME_ID)
      setPlayStatus(updatedStatus)
    }
    onDone?.()
  }, [onDone])

  const startGame = async () => {
    const v = validateNumericName(name)
    if (!v.ok) {
      setNameErr(v.msg ?? '')
      return
    }

    const status = await getUserDailyPlayStatus(name, GAME_ID)
    setPlayStatus(status)
    if (!status.canPlay) {
      setNameErr('오늘의 도전 횟수를 모두 소모했습니다. (1일 최대 5회)')
      return
    }

    setNameErr('')

    // 초기화
    setScore(0)
    setCorrect(0)
    setCombo(0)
    setMaxCombo(0)
    scoreRef.current = 0
    correctRef.current = 0
    comboRef.current = 0
    maxComboRef.current = 0
    nameRef.current = name
    phaseRef.current = 'playing'

    setTimeLeft(GAME_SECS)
    setQ(makeQuestion())
    setPhase('playing')

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          setTimeout(() => endGame(), 0)
          return 0
        }
        return t - 1
      })
    }, 1000)
    timerRef.current = interval
  }

  const handleChoice = (choice: number) => {
    if (phaseRef.current !== 'playing') return
    const isOk = choice === q.answer
    beep(isOk ? 'ok' : 'ng')
    setFlash(isOk ? 'ok' : 'ng')
    setTimeout(() => setFlash(null), 200)

    if (isOk) {
      const newCombo = comboRef.current + 1
      const pts = 100 + newCombo * 20

      scoreRef.current += pts
      correctRef.current += 1
      comboRef.current = newCombo
      if (newCombo > maxComboRef.current) maxComboRef.current = newCombo

      setScore(scoreRef.current)
      setCorrect(correctRef.current)
      setCombo(newCombo)
      setMaxCombo(maxComboRef.current)
    } else {
      comboRef.current = 0
      setCombo(0)
    }
    setQ(makeQuestion())
  }

  const reset = () => {
    clearTimer()
    phaseRef.current = 'idle'
    setPhase('idle')
    setName('')
    setNameErr('')
    setResultMsg('')
    setRefreshTrigger((prev) => prev + 1)
  }

  useEffect(() => () => clearTimer(), [])

  // ─────────────────────────────────────────────────────────────────
  // 1. 대기 화면
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="space-y-8 max-w-lg mx-auto">
        {/* 게임 시작 카드 */}
        <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🎯 구구단 스피드 챌린지
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              45초 동안 신속하게 구구단 정답을 맞추고 실시간 Supabase 랭킹에 도전하세요!
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500">학번 / PIN 번호</label>
              {name.trim().length >= 2 && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    playStatus.canPlay
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  오늘 도전: {playStatus.count} / {playStatus.maxLimit}회 (남은 횟수: {playStatus.remaining}회)
                </span>
              )}
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '')
                setName(cleaned)
                setNameErr(cleaned !== e.target.value ? '숫자만 입력할 수 있습니다.' : '')
              }}
              placeholder="예: 20301"
              maxLength={10}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base font-mono focus:outline-none focus:border-gray-900 transition-colors"
            />
            {nameErr && (
              <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
                ⚠️ {nameErr}
              </div>
            )}
          </div>

          <button
            onClick={startGame}
            disabled={!name.trim() || !playStatus.canPlay}
            className={`w-full py-3.5 text-base font-bold rounded-xl transition-all shadow-sm ${
              !name.trim() || !playStatus.canPlay
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.99]'
            }`}
          >
            {!playStatus.canPlay ? '오늘의 도전 횟수를 모두 소모했습니다' : `게임 시작하기 (${GAME_SECS}초)`}
          </button>
        </div>

        {/* 🏆 구구단 게임 전용 독립 리더보드 */}
        <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. 플레이 화면
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'playing') {
    return (
      <div className="space-y-6 max-w-sm mx-auto">
        <div className="flex items-center justify-between text-sm">
          <span className="font-mono text-gray-400">#{name}</span>
          <span
            className={`font-mono font-extrabold text-lg ${
              timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-800'
            }`}
          >
            ⏱️ {timeLeft}s
          </span>
          <span className="font-mono text-indigo-600 font-bold text-base">{score}점</span>
        </div>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft <= 10 ? 'bg-red-500' : 'bg-gray-900'
            }`}
            style={{ width: `${(timeLeft / GAME_SECS) * 100}%` }}
          />
        </div>

        <div className="h-6 flex items-center justify-center">
          {combo > 1 && (
            <span className="text-xs font-bold text-orange-500 tracking-wider">
              ⚡ {combo} COMBO! (+{100 + combo * 20}점)
            </span>
          )}
        </div>

        <div
          className={`text-center py-10 border rounded-2xl transition-colors ${
            flash === 'ok'
              ? 'border-green-300 bg-green-50'
              : flash === 'ng'
              ? 'border-red-300 bg-red-50'
              : 'border-gray-100 bg-white shadow-sm'
          }`}
        >
          <p className="text-4xl font-extrabold font-mono text-gray-900">{q.text}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {q.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => handleChoice(c)}
              className="py-4 border border-gray-200 bg-white rounded-2xl text-2xl font-mono font-bold text-gray-800 hover:border-gray-900 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. 종료 화면
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900">🎉 게임 종료!</h2>
          <p className="text-sm font-mono text-gray-400">학번/PIN: #{name}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="py-4 bg-gray-50 border border-gray-100 rounded-xl">
            <div className="text-xs text-gray-400">최종 점수</div>
            <div className="text-xl font-extrabold font-mono text-indigo-600 mt-1">{score}점</div>
          </div>
          <div className="py-4 bg-gray-50 border border-gray-100 rounded-xl">
            <div className="text-xs text-gray-400 font-medium">정답 개수</div>
            <div className="text-xl font-bold font-mono text-gray-900 mt-1">{correct}개</div>
          </div>
          <div className="py-4 bg-gray-50 border border-gray-100 rounded-xl">
            <div className="text-xs text-gray-400 font-medium">최대 콤보</div>
            <div className="text-xl font-bold font-mono text-orange-500 mt-1">{maxCombo}×</div>
          </div>
        </div>

        {resultMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-700">
            {resultMsg}
          </div>
        )}

        <button
          onClick={reset}
          className="w-full py-3 bg-gray-900 text-white font-semibold text-sm rounded-xl hover:bg-gray-800 transition-colors"
        >
          다시 도전하기
        </button>
      </div>

      {/* 게임 종료 화면에서도 바로 갱신된 순위 확인 가능 */}
      <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
    </div>
  )
}
