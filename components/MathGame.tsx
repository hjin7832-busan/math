'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  validateNumericName,
  submitScore,
  getUserDailyPlayStatus,
  MAX_DAILY_PLAY_COUNT,
} from '@/lib/leaderboardManager'
import GameLeaderboard from './GameLeaderboard'

// ── 웹오디오 효과음 ───────────────────────────────────────────────
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

interface Q {
  text: string
  answer: number
  choices: number[]
}

function makeQuestion(): Q {
  const a = Math.floor(Math.random() * 8) + 2
  const b = Math.floor(Math.random() * 8) + 2
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
const GAME_ID = 'math-speed'

export default function MathGame({ onDone }: { onDone?: () => void }) {
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

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }

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

  const endGame = async (finalScore: number, finalCorrect: number, finalMaxCombo: number) => {
    clearTimer()
    beep('end')
    setPhase('done')
    const res = await submitScore({
      gameId: GAME_ID,
      numericName: name,
      score: finalScore,
      correctCount: finalCorrect,
      maxCombo: finalMaxCombo,
    })
    setResultMsg(
      res.ok
        ? `기록이 Supabase DB에 등록되었습니다. (오늘 남은 도전: ${res.remaining ?? 0}회)`
        : res.msg ?? ''
    )
    setRefreshTrigger((prev) => prev + 1)
    if (name) {
      const updatedStatus = await getUserDailyPlayStatus(name, GAME_ID)
      setPlayStatus(updatedStatus)
    }
    onDone?.()
  }

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
    setScore(0)
    setCorrect(0)
    setCombo(0)
    setMaxCombo(0)
    setTimeLeft(GAME_SECS)
    setQ(makeQuestion())
    setPhase('playing')

    let sc = 0,
      cor = 0,
      cmb = 0,
      maxC = 0
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          endGame(sc, cor, maxC)
          return 0
        }
        return t - 1
      })
    }, 1000)
    timerRef.current = interval
  }

  const handleChoice = (choice: number) => {
    if (phase !== 'playing') return
    const isOk = choice === q.answer
    beep(isOk ? 'ok' : 'ng')
    setFlash(isOk ? 'ok' : 'ng')
    setTimeout(() => setFlash(null), 220)

    if (isOk) {
      const newCombo = combo + 1
      const pts = 100 + newCombo * 20
      setScore((s) => s + pts)
      setCorrect((c) => c + 1)
      setCombo(newCombo)
      setMaxCombo((m) => Math.max(m, newCombo))
    } else {
      setCombo(0)
    }
    setQ(makeQuestion())
  }

  const reset = () => {
    clearTimer()
    setPhase('idle')
    setName('')
    setNameErr('')
    setResultMsg('')
    setRefreshTrigger((prev) => prev + 1)
  }

  useEffect(() => () => clearTimer(), [])

  if (phase === 'idle')
    return (
      <div className="space-y-6 max-w-md mx-auto bg-white p-6 border border-gray-100 rounded-2xl shadow-sm">
        <p className="text-sm text-gray-500">학번/PIN 번호를 입력하고 스피드 챌린지에 도전하세요.</p>

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
              if (cleaned !== e.target.value) setNameErr('숫자만 입력할 수 있습니다.')
              else setNameErr('')
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
          {!playStatus.canPlay ? '오늘의 도전 횟수를 모두 소모했습니다' : `게임 시작 (${GAME_SECS}초)`}
        </button>

        <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
      </div>
    )

  if (phase === 'playing')
    return (
      <div className="space-y-6 max-w-sm mx-auto">
        <div className="flex items-center justify-between text-sm">
          <span className="font-mono text-gray-400">#{name}</span>
          <span
            className={`font-mono font-bold ${
              timeLeft <= 10 ? 'text-red-500' : 'text-gray-700'
            }`}
          >
            {timeLeft}s
          </span>
          <span className="font-mono text-gray-700 font-bold">{score}점</span>
        </div>

        <div className="h-0.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft <= 10 ? 'bg-red-400' : 'bg-gray-900'
            }`}
            style={{ width: `${(timeLeft / GAME_SECS) * 100}%` }}
          />
        </div>

        {combo > 1 && (
          <div className="text-xs font-bold text-center text-orange-500 tracking-wider">
            × {combo} COMBO
          </div>
        )}

        <div
          className={`text-center py-8 border rounded-xl transition-colors ${
            flash === 'ok'
              ? 'border-green-300 bg-green-50'
              : flash === 'ng'
              ? 'border-red-300 bg-red-50'
              : 'border-gray-100 bg-white'
          }`}
        >
          <p className="text-3xl font-bold font-mono text-gray-900">{q.text}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {q.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => handleChoice(c)}
              className="py-4 border border-gray-200 rounded-xl text-xl font-mono font-bold text-gray-800 hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition-all"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    )

  return (
    <div className="space-y-6 max-w-md mx-auto bg-white p-6 border border-gray-100 rounded-2xl shadow-sm">
      <div className="space-y-1">
        <p className="text-lg font-bold text-gray-900">게임 종료</p>
        <p className="text-sm text-gray-500 font-mono">#{name}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: '최종 점수', value: score },
          { label: '정답 수', value: `${correct}개` },
          { label: '최대 콤보', value: `${maxCombo}×` },
        ].map((it) => (
          <div key={it.label} className="py-4 border border-gray-100 rounded-xl">
            <div className="text-xs text-gray-400">{it.label}</div>
            <div className="text-lg font-bold font-mono text-gray-900 mt-1">{it.value}</div>
          </div>
        ))}
      </div>

      {resultMsg && <p className="text-xs text-emerald-600 font-semibold">{resultMsg}</p>}

      <button
        onClick={reset}
        className="w-full py-2.5 bg-gray-900 text-white font-medium text-sm rounded-lg hover:bg-gray-800 transition-colors"
      >
        다시 시작
      </button>

      <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
    </div>
  )
}
