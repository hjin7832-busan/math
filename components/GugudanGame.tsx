'use client'

import { useState, useEffect, useRef } from 'react'
import { validateNumericName, isDuplicate, submitScore } from '@/lib/leaderboardManager'

// Web Audio 효과음
function playSound(type: 'ok' | 'ng' | 'fever' | 'end') {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    const now = ctx.currentTime

    if (type === 'ok') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, now); osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1)
      gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.start(now); osc.stop(now + 0.15)
    } else if (type === 'fever') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.25)
      gain.gain.setValueAtTime(0.25, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      osc.start(now); osc.stop(now + 0.25)
    } else if (type === 'ng') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(220, now); osc.frequency.exponentialRampToValueAtTime(140, now + 0.2)
      gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      osc.start(now); osc.stop(now + 0.2)
    } else {
      osc.type = 'sine'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(220, now + 0.5)
      gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      osc.start(now); osc.stop(now + 0.5)
    }
  } catch { /* AudioContext autoplay block ignore */ }
}

interface Target {
  id: string
  a: number
  b: number
  ans: number
  x: number // percentage 10~90
  y: number // percentage 0~100 (top to bottom)
  speed: number
  color: string
}

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
const GAME_SECS = 45

export default function GugudanGame({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle')
  const [mode, setMode] = useState<'blast' | 'keypad'>('blast')

  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_SECS)
  const [isFever, setIsFever] = useState(false)
  const [resultMsg, setResultMsg] = useState('')

  // Blast 모드 전용 (풍선 폭파)
  const [targets, setTargets] = useState<Target[]>([])
  const [inputVal, setInputVal] = useState('')

  // Keypad 모드 전용
  const [currentQ, setCurrentQ] = useState<{ a: number; b: number; ans: number; choices: number[] }>({ a: 2, b: 2, ans: 4, choices: [4, 6, 8, 10] })

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const animRef = useRef<number | null>(null)

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animRef.current) cancelAnimationFrame(animRef.current)
  }

  // Keypad 문제 생성
  const makeKeypadQ = () => {
    const a = Math.floor(Math.random() * 8) + 2
    const b = Math.floor(Math.random() * 8) + 2
    const ans = a * b
    const wrong = new Set<number>()
    while (wrong.size < 3) {
      const delta = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1)
      const w = ans + delta
      if (w > 0 && w !== ans) wrong.add(w)
    }
    const choices = [ans, ...Array.from(wrong)].sort(() => Math.random() - 0.5)
    return { a, b, ans, choices }
  }

  // Blast 모드 풍선 생성
  const spawnTarget = () => {
    const a = Math.floor(Math.random() * 8) + 2
    const b = Math.floor(Math.random() * 8) + 2
    const ans = a * b
    const newTarget: Target = {
      id: Math.random().toString(36).substring(2, 9),
      a,
      b,
      ans,
      x: Math.floor(Math.random() * 75) + 10,
      y: -10,
      speed: 0.2 + Math.random() * 0.25,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }
    return newTarget
  }

  const endGame = (finalScore: number, finalCorrect: number, finalMaxCombo: number) => {
    clearTimers()
    playSound('end')
    setPhase('done')
    const res = submitScore({
      gameId: 'gugudan',
      numericName: name,
      score: finalScore,
      correctCount: finalCorrect,
      maxCombo: finalMaxCombo,
    })
    setResultMsg(res.ok ? '🎉 구구단 점수가 기록되었습니다!' : (res.msg ?? ''))
    onDone?.()
  }

  const startGame = () => {
    const v = validateNumericName(name)
    if (!v.ok) { setNameErr(v.msg ?? ''); return }
    if (isDuplicate(name, 'gugudan')) { setNameErr(`[${name}]은 오늘 이미 구구단 게임에 등록하셨습니다.`); return }

    setNameErr('')
    setScore(0); setCorrect(0); setCombo(0); setMaxCombo(0); setTimeLeft(GAME_SECS)
    setIsFever(false); setInputVal('')
    setPhase('playing')

    if (mode === 'blast') {
      setTargets([spawnTarget(), spawnTarget(), spawnTarget()])
    } else {
      setCurrentQ(makeKeypadQ())
    }

    let sc = 0, cor = 0, cmb = 0, maxC = 0
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); endGame(sc, cor, maxC); return 0 }
        return t - 1
      })
    }, 1000)
    timerRef.current = interval
  }

  // Blast 모드 프레임 업데이트 Loop
  useEffect(() => {
    if (phase !== 'playing' || mode !== 'blast') return

    let lastSpawn = Date.now()
    const loop = () => {
      setTargets(prev => {
        const updated = prev
          .map(t => ({ ...t, y: t.y + t.speed }))
          .filter(t => t.y < 105)

        // 풍선 수가 적으면 자동 생성
        if (updated.length < 4 && Date.now() - lastSpawn > 1200) {
          lastSpawn = Date.now()
          updated.push(spawnTarget())
        }
        return updated
      })
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [phase, mode])

  // 정답 맞춤 공통 로직
  const handleCorrect = () => {
    setCombo(c => {
      const nc = c + 1
      if (nc % 5 === 0) {
        setIsFever(true)
        playSound('fever')
        setTimeout(() => setIsFever(false), 2000)
      } else {
        playSound('ok')
      }
      setMaxCombo(m => Math.max(m, nc))
      const mult = nc >= 5 ? 2 : 1
      setScore(s => s + 100 * mult + nc * 20)
      return nc
    })
    setCorrect(c => c + 1)
  }

  const handleWrong = () => {
    playSound('ng')
    setCombo(0)
  }

  // Blast 모드: 풍선 클릭 / 입력 정답 처리
  const handleBlastHit = (target: Target) => {
    handleCorrect()
    setTargets(prev => prev.filter(t => t.id !== target.id).concat(spawnTarget()))
    setInputVal('')
  }

  const handleBlastSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const num = parseInt(inputVal, 10)
    if (isNaN(num)) return

    const matched = targets.find(t => t.ans === num)
    if (matched) {
      handleBlastHit(matched)
    } else {
      handleWrong()
      setInputVal('')
    }
  }

  // Keypad 모드: 선택지 클릭
  const handleKeypadChoice = (choice: number) => {
    if (choice === currentQ.ans) {
      handleCorrect()
    } else {
      handleWrong()
    }
    setCurrentQ(makeKeypadQ())
  }

  useEffect(() => () => clearTimers(), [])

  // ── 1. IDLE (대기) ───────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="space-y-6 max-w-md bg-white p-6 border border-gray-100 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🎯 구구단 팡팡
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            원하는 게임 스타일을 선택하고 학번/PIN 번호로 도전하세요!
          </p>
        </div>

        {/* 모드 선택 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('blast')}
            className={`p-3.5 border rounded-xl text-left transition-all ${
              mode === 'blast'
                ? 'border-gray-900 bg-gray-900 text-white shadow-md'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="text-sm font-bold flex items-center justify-between">
              🎈 버블 폭파 모드
            </div>
            <p className={`text-[11px] mt-1 leading-snug ${mode === 'blast' ? 'text-gray-300' : 'text-gray-400'}`}>
              화면에 내려오는 구구단을 직접 터치하거나 정답 숫자로 폭파!
            </p>
          </button>

          <button
            onClick={() => setMode('keypad')}
            className={`p-3.5 border rounded-xl text-left transition-all ${
              mode === 'keypad'
                ? 'border-gray-900 bg-gray-900 text-white shadow-md'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="text-sm font-bold flex items-center justify-between">
              ⚡ 스피드 키패드
            </div>
            <p className={`text-[11px] mt-1 leading-snug ${mode === 'keypad' ? 'text-gray-300' : 'text-gray-400'}`}>
              4개 선택지 중 빠르게 정답을 터치하는 고전 콤보 모드!
            </p>
          </button>
        </div>

        {/* 학번/PIN 입력 */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold text-gray-500">학번 / PIN 번호</label>
          <input
            type="text"
            value={name}
            onChange={e => {
              const cleaned = e.target.value.replace(/\D/g, '')
              setName(cleaned)
              setNameErr(cleaned !== e.target.value ? '숫자만 입력 가능합니다.' : '')
            }}
            placeholder="예: 20301"
            maxLength={10}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base font-mono focus:outline-none focus:border-gray-900 transition-colors"
          />
          {nameErr && <p className="text-xs text-red-500">{nameErr}</p>}
        </div>

        <button
          onClick={startGame}
          className="w-full py-3.5 bg-gray-900 text-white text-base font-bold rounded-xl hover:bg-gray-800 active:scale-[0.99] transition-all shadow-sm"
        >
          게임 시작 ({GAME_SECS}초)
        </button>
      </div>
    )
  }

  // ── 2. PLAYING (플레이) ─────────────────────────────────────────
  if (phase === 'playing') {
    return (
      <div className="space-y-4 max-w-md w-full mx-auto">
        {/* 상단 스코어 / 타이머 */}
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-100 rounded-xl shadow-sm">
          <span className="font-mono text-sm font-semibold text-gray-500">#{name}</span>
          <div className="flex items-center gap-4">
            <span className={`font-mono font-extrabold text-lg ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
              ⏱️ {timeLeft}s
            </span>
            <span className="font-mono font-bold text-base text-indigo-600">{score}점</span>
          </div>
        </div>

        {/* 타이머 게이지 */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-gray-900'}`}
            style={{ width: `${(timeLeft / GAME_SECS) * 100}%` }}
          />
        </div>

        {/* 콤보 / 피버 알림 */}
        <div className="h-6 flex items-center justify-center">
          {isFever ? (
            <span className="text-xs font-black tracking-widest text-amber-500 animate-bounce">
              🔥 FEVER TIME! 2배 점수 획득! 🔥
            </span>
          ) : combo > 1 ? (
            <span className="text-xs font-bold text-orange-500 tracking-wider">
              ⚡ {combo} COMBO! (+{100 + combo * 20}점)
            </span>
          ) : null}
        </div>

        {/* ── BUBBLE BLAST MODE ── */}
        {mode === 'blast' && (
          <div className="space-y-3">
            {/* 풍선 캔버스 영역 */}
            <div className="relative w-full h-80 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
              {targets.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleBlastHit(t)}
                  style={{ left: `${t.x}%`, top: `${t.y}%`, backgroundColor: t.color }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-lg text-white font-mono active:scale-90 transition-transform cursor-pointer border-2 border-white/30"
                >
                  <span className="text-sm font-bold tracking-tight">{t.a} × {t.b}</span>
                  <span className="text-[10px] text-white/80 font-sans mt-0.5">터치!</span>
                </button>
              ))}
            </div>

            {/* 정답 키인 입력창 */}
            <form onSubmit={handleBlastSubmit} className="flex gap-2">
              <input
                type="number"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="화면 풍선의 정답 숫자 입력 후 엔터!"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-base font-mono focus:outline-none focus:border-gray-900"
                autoFocus
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-gray-800 active:scale-95 transition-all"
              >
                발사 💥
              </button>
            </form>
          </div>
        )}

        {/* ── SPEED KEYPAD MODE ── */}
        {mode === 'keypad' && (
          <div className="space-y-4">
            <div className="text-center py-10 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <p className="text-4xl font-extrabold font-mono text-gray-900 tracking-tight">
                {currentQ.a} × {currentQ.b} = ?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {currentQ.choices.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleKeypadChoice(c)}
                  className="py-4 border border-gray-200 bg-white rounded-2xl text-2xl font-mono font-bold text-gray-800 hover:border-gray-900 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── 3. DONE (종료) ───────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-md bg-white p-6 border border-gray-100 rounded-2xl shadow-sm">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-gray-900">🎉 구구단 게임 종료!</h2>
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
        onClick={() => { clearTimers(); setPhase('idle'); setNameErr('') }}
        className="w-full py-3 bg-gray-900 text-white font-semibold text-sm rounded-xl hover:bg-gray-800 transition-colors"
      >
        다시 플레이하기
      </button>
    </div>
  )
}
