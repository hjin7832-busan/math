'use client'

import { useState, useEffect, useRef } from 'react'
import { validateNumericName, isDuplicate, submitScore } from '@/lib/leaderboardManager'

// ── 웹오디오 효과음 ───────────────────────────────────────────────
function beep(type: 'ok' | 'ng' | 'end') {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    const now = ctx.currentTime
    if (type === 'ok') {
      osc.type = 'sine'; osc.frequency.value = 660
      gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.start(now); osc.stop(now + 0.15)
    } else if (type === 'ng') {
      osc.type = 'sawtooth'; osc.frequency.value = 180
      gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      osc.start(now); osc.stop(now + 0.25)
    } else {
      osc.type = 'triangle'; osc.frequency.value = 300
      gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      osc.start(now); osc.stop(now + 0.5)
    }
  } catch { /* 자동재생 차단 무시 */ }
}

// ── 구구단 문제 생성 ──────────────────────────────────────────────
interface Q {
  text: string
  answer: number
  choices: number[]
}

function makeQuestion(): Q {
  const a = Math.floor(Math.random() * 8) + 2   // 2~9
  const b = Math.floor(Math.random() * 8) + 2   // 2~9
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

export default function MathGame({ onDone }: { onDone?: () => void }) {
  // ── 등록 단계 ────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')

  // ── 게임 상태 ────────────────────────────────────────────────────
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle')
  const [q, setQ] = useState<Q>(makeQuestion())
  const [timeLeft, setTimeLeft] = useState(GAME_SECS)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [flash, setFlash] = useState<'ok' | 'ng' | null>(null)
  const [resultMsg, setResultMsg] = useState('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 타이머 클리어 헬퍼
  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current) }

  // 게임 종료 처리
  const endGame = (finalScore: number, finalCorrect: number, finalMaxCombo: number) => {
    clearTimer()
    beep('end')
    setPhase('done')
    // 점수 등록
    const res = submitScore({ numericName: name, score: finalScore, correctCount: finalCorrect, maxCombo: finalMaxCombo })
    setResultMsg(res.ok ? '기록이 오늘 순위에 등록되었습니다.' : (res.msg ?? ''))
    onDone?.()
  }

  // 시작
  const startGame = () => {
    const v = validateNumericName(name)
    if (!v.ok) { setNameErr(v.msg ?? ''); return }
    if (isDuplicate(name)) { setNameErr(`[${name}]은 오늘 이미 등록된 번호입니다.`); return }
    setNameErr('')
    setScore(0); setCorrect(0); setCombo(0); setMaxCombo(0)
    setTimeLeft(GAME_SECS); setQ(makeQuestion()); setPhase('playing')

    let sc = 0, cor = 0, cmb = 0, maxC = 0
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); endGame(sc, cor, maxC); return 0 }
        return t - 1
      })
    }, 1000)
    timerRef.current = interval

    // 내부 변수 동기화 핸들러를 클로저에 담기 위해 ref 활용
    ;(window as unknown as { __hyoAnswer: (choice: number) => void }).__hyoAnswer = (choice: number) => {
      const nextQ = makeQuestion()
      if (choice === q.answer) {
        beep('ok')
        cmb++; sc += 100 + cmb * 20; cor++
        if (cmb > maxC) maxC = cmb
      } else {
        beep('ng')
        cmb = 0
      }
      setScore(sc); setCorrect(cor); setCombo(cmb); setMaxCombo(maxC)
      setQ(nextQ)
      setFlash(choice === nextQ.choices[0] ? 'ok' : null) // 임시; 아래서 덮어씀
    }
  }

  // 정답 클릭
  const handleChoice = (choice: number) => {
    if (phase !== 'playing') return
    const isOk = choice === q.answer
    beep(isOk ? 'ok' : 'ng')
    setFlash(isOk ? 'ok' : 'ng')
    setTimeout(() => setFlash(null), 220)

    if (isOk) {
      const newCombo = combo + 1
      const pts = 100 + newCombo * 20
      setScore(s => { const ns = s + pts; return ns })
      setCorrect(c => c + 1)
      setCombo(newCombo)
      setMaxCombo(m => Math.max(m, newCombo))
    } else {
      setCombo(0)
    }
    setQ(makeQuestion())
  }

  // 재시도
  const reset = () => {
    clearTimer(); setPhase('idle'); setName(''); setNameErr('')
  }

  useEffect(() => () => clearTimer(), [])

  // ─────────────────────────────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'idle') return (
    <div className="space-y-4 max-w-xs">
      <p className="text-sm text-gray-500">숫자 이름(학번/PIN)을 입력하고 시작하세요.</p>

      <div className="space-y-1">
        <input
          type="text"
          value={name}
          onChange={e => {
            // 숫자만 허용
            const cleaned = e.target.value.replace(/\D/g, '')
            setName(cleaned)
            if (cleaned !== e.target.value) setNameErr('숫자만 입력할 수 있습니다.')
            else setNameErr('')
          }}
          placeholder="예: 20301"
          maxLength={10}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-gray-400 transition-colors"
        />
        {nameErr && <p className="text-xs text-red-500">{nameErr}</p>}
      </div>

      <button
        onClick={startGame}
        className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 active:scale-95 transition-all"
      >
        게임 시작 ({GAME_SECS}초)
      </button>
    </div>
  )

  if (phase === 'playing') return (
    <div className="space-y-6 max-w-sm">
      {/* 상태 바 */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-mono text-gray-400">#{name}</span>
        <span className={`font-mono font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-700'}`}>
          {timeLeft}s
        </span>
        <span className="font-mono text-gray-700 font-bold">{score}점</span>
      </div>

      {/* 타이머 바 */}
      <div className="h-0.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-400' : 'bg-gray-900'}`}
          style={{ width: `${(timeLeft / GAME_SECS) * 100}%` }}
        />
      </div>

      {/* 콤보 */}
      {combo > 1 && (
        <div className="text-xs font-bold text-center text-orange-500 tracking-wider">
          × {combo} COMBO
        </div>
      )}

      {/* 문제 */}
      <div
        className={`text-center py-8 border rounded-xl transition-colors ${
          flash === 'ok' ? 'border-green-300 bg-green-50' :
          flash === 'ng' ? 'border-red-300 bg-red-50' :
          'border-gray-100 bg-white'
        }`}
      >
        <p className="text-3xl font-bold font-mono text-gray-900">{q.text}</p>
      </div>

      {/* 선택지 */}
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

  // done
  return (
    <div className="space-y-6 max-w-sm">
      <div className="space-y-1">
        <p className="text-lg font-bold text-gray-900">게임 종료</p>
        <p className="text-sm text-gray-500 font-mono">#{name}</p>
      </div>

      {/* 결과 */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: '최종 점수', value: score },
          { label: '정답 수',  value: `${correct}개` },
          { label: '최대 콤보', value: `${maxCombo}×` },
        ].map(it => (
          <div key={it.label} className="py-4 border border-gray-100 rounded-xl">
            <div className="text-xs text-gray-400">{it.label}</div>
            <div className="text-lg font-bold font-mono text-gray-900 mt-1">{it.value}</div>
          </div>
        ))}
      </div>

      {resultMsg && <p className="text-xs text-gray-500">{resultMsg}</p>}

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition-colors"
        >
          다시 시작
        </button>
      </div>
    </div>
  )
}
