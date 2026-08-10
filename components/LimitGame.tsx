'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  validateNumericName,
  submitScore,
  getUserDailyPlayStatus,
  MAX_DAILY_PLAY_COUNT,
} from '@/lib/leaderboardManager'
import GameLeaderboard from './GameLeaderboard'

function playSound(type: 'ok' | 'ng' | 'end') {
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
      osc.frequency.setValueAtTime(587.33, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12)
      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)
    } else if (type === 'ng') {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(200, now)
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.2)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.2)
    } else {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.5)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      osc.start(now)
      osc.stop(now + 0.5)
    }
  } catch {
    /* Autoplay block ignore */
  }
}

interface LimitQ {
  expr: string
  target: string
  ans: string
  choices: string[]
  explanation: string
}

function makeLimitQuestion(): LimitQ {
  const types = ['constant', 'linear', 'quadratic', 'infinity', 'zero_denom']
  const selectedType = types[Math.floor(Math.random() * types.length)]

  if (selectedType === 'constant') {
    const c = Math.floor(Math.random() * 10) - 5
    const a = Math.floor(Math.random() * 5) + 1
    return {
      expr: `f(x) = ${c}`,
      target: `x → ${a}`,
      ans: `${c}`,
      choices: [`${c}`, `${c + a}`, '0', '발산'].sort(() => Math.random() - 0.5),
      explanation: '상수함수의 극한값은 항상 그 상수 자체입니다.',
    }
  } else if (selectedType === 'linear') {
    const m = Math.floor(Math.random() * 5) + 1
    const b = Math.floor(Math.random() * 7) - 3
    const a = Math.floor(Math.random() * 5) - 2
    const ans = m * a + b
    return {
      expr: `f(x) = ${m}x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}`,
      target: `x → ${a}`,
      ans: `${ans}`,
      choices: [`${ans}`, `${ans + 2}`, `${ans - 2}`, `${m}`].sort(() => Math.random() - 0.5),
      explanation: '다항함수의 극한값은 대입값과 같습니다.',
    }
  } else if (selectedType === 'infinity') {
    const a = Math.floor(Math.random() * 4) + 1
    return {
      expr: `f(x) = (${a}x + 1) / (x + 3)`,
      target: `x → ∞`,
      ans: `${a}`,
      choices: [`${a}`, '0', '∞', `${a + 1}`].sort(() => Math.random() - 0.5),
      explanation: 'x → ∞ 일 때 최고차항의 계수비가 극한값입니다.',
    }
  } else if (selectedType === 'zero_denom') {
    const a = Math.floor(Math.random() * 5) + 1
    const ans = 2 * a
    return {
      expr: `f(x) = (x² - ${a * a}) / (x - ${a})`,
      target: `x → ${a}`,
      ans: `${ans}`,
      choices: [`${ans}`, '0', '발산(∞)', `${a}`].sort(() => Math.random() - 0.5),
      explanation: '약분 후 인수대입: (x-a)(x+a)/(x-a) = x+a → 2a',
    }
  } else {
    const a = Math.floor(Math.random() * 3) + 1
    const ans = a * a - 2
    return {
      expr: `f(x) = x² - 2`,
      target: `x → ${a}`,
      ans: `${ans}`,
      choices: [`${ans}`, `${ans + 4}`, '0', `${a}`].sort(() => Math.random() - 0.5),
      explanation: '연속함수이므로 x 값을 직접 대입합니다.',
    }
  }
}

const GAME_SECS = 45
const GAME_ID = 'limit-concept'

export default function LimitGame({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle')

  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_SECS)
  const [currentQ, setCurrentQ] = useState<LimitQ>(makeLimitQuestion())
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
    playSound('end')
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
        ? `🎉 점수가 Supabase DB에 등록되었습니다! (오늘 남은 도전: ${res.remaining ?? 0}회)`
        : res.msg ?? '점수 등록 실패'
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
    setCurrentQ(makeLimitQuestion())
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

  const handleChoice = (choice: string) => {
    if (choice === currentQ.ans) {
      playSound('ok')
      setCombo((c) => {
        const nc = c + 1
        setMaxCombo((m) => Math.max(m, nc))
        setScore((s) => s + 150 + nc * 30)
        return nc
      })
      setCorrect((c) => c + 1)
    } else {
      playSound('ng')
      setCombo(0)
    }
    setCurrentQ(makeLimitQuestion())
  }

  useEffect(() => () => clearTimer(), [])

  if (phase === 'idle') {
    return (
      <div className="space-y-8 max-w-lg mx-auto">
        <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              ♾️ 극한의 도전 (Limit Master)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              x가 목표값 또는 무한대로 접근할 때의 극한값을 빠르게 판단하세요!
            </p>
          </div>

          <div className="space-y-2 pt-2">
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
                setNameErr(cleaned !== e.target.value ? '숫자만 입력 가능합니다.' : '')
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
            {!playStatus.canPlay ? '오늘의 도전 횟수를 모두 소모했습니다' : `도전 시작 (${GAME_SECS}초)`}
          </button>
        </div>

        {/* 🏆 극한 게임 전용 독립 리더보드 */}
        <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
      </div>
    )
  }

  if (phase === 'playing') {
    return (
      <div className="space-y-4 max-w-md w-full mx-auto">
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-100 rounded-xl shadow-sm">
          <span className="font-mono text-sm font-semibold text-gray-500">#{name}</span>
          <div className="flex items-center gap-4">
            <span
              className={`font-mono font-extrabold text-lg ${
                timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-800'
              }`}
            >
              ⏱️ {timeLeft}s
            </span>
            <span className="font-mono font-bold text-base text-indigo-600">{score}점</span>
          </div>
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
              ⚡ {combo} COMBO! (+{150 + combo * 30}점)
            </span>
          )}
        </div>

        {/* 문제 카드 */}
        <div className="text-center py-8 px-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner text-white space-y-3">
          <p className="text-sm text-indigo-300 font-mono font-semibold">lim ({currentQ.target})</p>
          <p className="text-3xl font-extrabold font-mono tracking-wide">{currentQ.expr}</p>
        </div>

        {/* 선택지 */}
        <div className="grid grid-cols-2 gap-3">
          {currentQ.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => handleChoice(c)}
              className="py-4 border border-gray-200 bg-white rounded-2xl text-xl font-mono font-bold text-gray-800 hover:border-gray-900 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900">🎉 극한의 도전 완료!</h2>
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
          onClick={() => {
            clearTimer()
            setPhase('idle')
            setNameErr('')
            setResultMsg('')
            setRefreshTrigger((prev) => prev + 1)
          }}
          className="w-full py-3 bg-gray-900 text-white font-semibold text-sm rounded-xl hover:bg-gray-800 transition-colors"
        >
          다시 플레이하기
        </button>
      </div>

      <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
    </div>
  )
}
