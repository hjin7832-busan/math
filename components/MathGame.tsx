'use client'

import { useState, useEffect, useRef } from 'react'
import {
  submitGameScore,
  validateNumericName,
  isDuplicateNumericName,
  LeaderboardEntry,
} from '@/lib/leaderboardManager'
import {
  Trophy,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Flame,
  Award,
  Hash,
} from 'lucide-react'

// Web Audio API Synthesizer sound effect helper (No external audio file needed!)
function playSound(type: 'correct' | 'wrong' | 'start' | 'gameover') {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime

    if (type === 'correct') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1) // E5
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.2)
    } else if (type === 'wrong') {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, now) // A3
      osc.frequency.setValueAtTime(180, now + 0.1)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
      osc.start(now)
      osc.stop(now + 0.3)
    } else if (type === 'start') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25)
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
      osc.start(now)
      osc.stop(now + 0.3)
    } else if (type === 'gameover') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, now)
      osc.frequency.setValueAtTime(880, now + 0.15)
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
      osc.start(now)
      osc.stop(now + 0.5)
    }
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

interface Question {
  questionText: string
  options: number[]
  correctAnswer: number
  category: string
}

// Question Generator (Speed Multiplication + Mental Math)
function generateQuestion(): Question {
  const categories = ['gugudan', 'gugudan', 'gugudan_hard', 'calculus_warmup']
  const cat = categories[Math.floor(Math.random() * categories.length)]

  let questionText = ''
  let correctAnswer = 0

  if (cat === 'gugudan') {
    // Standard Multiplication (2 ~ 9)
    const a = Math.floor(Math.random() * 8) + 2
    const b = Math.floor(Math.random() * 8) + 2
    questionText = `${a} × ${b} = ?`
    correctAnswer = a * b
  } else if (cat === 'gugudan_hard') {
    // Double digit / Teen Multiplication (11 ~ 19 x 2 ~ 9)
    const a = Math.floor(Math.random() * 9) + 11
    const b = Math.floor(Math.random() * 8) + 2
    questionText = `${a} × ${b} = ?`
    correctAnswer = a * b
  } else {
    // Calculus Concept Mental Math (Simple Derivative & Integral)
    const types = [
      () => {
        const k = Math.floor(Math.random() * 5) + 2
        const x = Math.floor(Math.random() * 4) + 1
        // d/dx (k * x^2) at x -> 2 * k * x
        const ans = 2 * k * x
        return { text: `d/dx (${k}x²)  [x = ${x} 일 때 미분계수]`, ans }
      },
      () => {
        const a = Math.floor(Math.random() * 4) + 1
        const b = Math.floor(Math.random() * 4) + 1
        // ∫ (2x) dx from 0 to a -> a^2
        const ans = a * a
        return { text: `∫₀^${a} (2x) dx  [정적분 값]`, ans }
      },
      () => {
        const x = Math.floor(Math.random() * 5) + 2
        // lim (t->x) (t^2 - x^2)/(t - x) -> 2x
        const ans = 2 * x
        return { text: `lim (t→${x}) (t² - ${x*x})/(t - ${x})`, ans }
      },
    ]
    const pick = types[Math.floor(Math.random() * types.length)]()
    questionText = pick.text
    correctAnswer = pick.ans
  }

  // Generate 4 unique options including correct answer
  const optionsSet = new Set<number>()
  optionsSet.add(correctAnswer)

  while (optionsSet.size < 4) {
    const offset = (Math.floor(Math.random() * 7) + 1) * (Math.random() > 0.5 ? 1 : -1)
    const fake = correctAnswer + offset
    if (fake > 0 && fake !== correctAnswer) {
      optionsSet.add(fake)
    }
  }

  const options = Array.from(optionsSet).sort(() => Math.random() - 0.5)

  return {
    questionText,
    options,
    correctAnswer,
    category: cat === 'calculus_warmup' ? '미적분 퀴즈' : '스피드 구구단',
  }
}

interface MathGameProps {
  onScoreSubmitted?: () => void
}

export default function MathGame({ onScoreSubmitted }: MathGameProps) {
  // Registration State
  const [numericName, setNumericName] = useState('')
  const [inputError, setInputError] = useState('')

  // Game Engine State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle')
  const [timeLeft, setTimeLeft] = useState(45)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)

  // Current Question
  const [currentQ, setCurrentQ] = useState<Question | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  // Result submission state
  const [submittedResult, setSubmittedResult] = useState<LeaderboardEntry | null>(null)

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Input Change Handler with Strict Numeric Filtering
  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // Instantly strip any non-digit character
    const cleaned = val.replace(/\D/g, '')

    if (val !== cleaned) {
      setInputError('문자나 특수문자는 입력할 수 없습니다. 숫자만 입력 가능합니다!')
    } else {
      setInputError('')
    }
    setNumericName(cleaned)
  }

  // Start Game Validation & Initialization
  const handleStartGame = () => {
    const validation = validateNumericName(numericName)
    if (!validation.valid) {
      setInputError(validation.message || '올바른 숫자 이름을 입력해 주세요.')
      return
    }

    // Check duplicate among today's leaderboard entries
    if (isDuplicateNumericName(numericName)) {
      setInputError(
        `숫자 이름 [${numericName}]은(는) 이미 오늘 리더보드에 등록되어 있습니다! 다른 번호(예: 학번+PIN)로 참가해 주세요.`
      )
      return
    }

    setInputError('')
    setScore(0)
    setCorrectCount(0)
    setCombo(0)
    setMaxCombo(0)
    setTimeLeft(45)
    setSubmittedResult(null)
    setCurrentQ(generateQuestion())
    setGameState('playing')

    playSound('start')

    // Start 45s countdown
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          endGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // End Game & Auto Submit Score
  const endGame = () => {
    setGameState('gameover')
    playSound('gameover')

    // Auto submit to leaderboard
    setScore((finalScore) => {
      setCorrectCount((finalCorrect) => {
        setMaxCombo((finalMaxCombo) => {
          const res = submitGameScore({
            numericName,
            score: finalScore,
            correctCount: finalCorrect,
            maxCombo: finalMaxCombo,
          })
          if (res.success && res.entry) {
            setSubmittedResult(res.entry)
            if (onScoreSubmitted) onScoreSubmitted()
          }
          return finalMaxCombo
        })
        return finalCorrect
      })
      return finalScore
    })
  }

  // Answer Option Click
  const handleAnswerSelect = (option: number) => {
    if (!currentQ || gameState !== 'playing') return

    if (option === currentQ.correctAnswer) {
      // Correct!
      playSound('correct')
      setFeedback('correct')
      const newCombo = combo + 1
      const points = 100 + newCombo * 20
      setScore((s) => s + points)
      setCorrectCount((c) => c + 1)
      setCombo(newCombo)
      if (newCombo > maxCombo) setMaxCombo(newCombo)
    } else {
      // Wrong!
      playSound('wrong')
      setFeedback('wrong')
      setCombo(0)
    }

    // Reset feedback effect & load next question
    setTimeout(() => {
      setFeedback(null)
      setCurrentQ(generateQuestion())
    }, 300)
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/60 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* IDLE / REGISTRATION SCREEN */}
      {gameState === 'idle' && (
        <div className="space-y-8 py-4">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>미적분1 연계 스피드 구구단 & 수학 챌린지</span>
            </div>

            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              ⚡ 스피드 연산 & 미적분 순발력 게임
            </h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              회원가입 없이 오직 <strong className="text-indigo-300 font-bold">숫자 이름 (학번 5자리 or PIN)</strong>만 입력하고 <br />
              45초간 연산 콤보 점수를 쌓아 오늘의 리더보드 1위에 도전하세요!
            </p>
          </div>

          {/* Numeric Name Registration Box */}
          <div className="max-w-md mx-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-inner">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-indigo-400" />
                <span>참가자 숫자 이름 입력 (학번/PIN)</span>
                <span className="text-[10px] text-indigo-400 font-normal ml-auto">*숫자만 허용</span>
              </label>
              <input
                type="text"
                value={numericName}
                onChange={handleNumericInput}
                placeholder="예: 20301 또는 4자리 PIN (20301)"
                maxLength={10}
                className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-lg tracking-wider placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-center"
              />
            </div>

            {inputError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300 font-medium">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{inputError}</span>
              </div>
            )}

            <div className="text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
              <div className="font-semibold text-slate-300">💡 참가 정밀 규칙:</div>
              <div>• 문자와 특수문자는 자동 차단되며 오직 숫자만 입력됩니다.</div>
              <div>• 이미 당일 리더보드에 존재하는 동일한 숫자 이름은 중복 입력이 차단됩니다.</div>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-base shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>게임 시작하기 (45초 챌린지)</span>
            </button>
          </div>

        </div>
      )}

      {/* PLAYING SCREEN */}
      {gameState === 'playing' && currentQ && (
        <div className="space-y-6">
          
          {/* Top Status Bar */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            {/* Player Info */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">참가자:</span>
              <span className="text-sm font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                #{numericName}
              </span>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${timeLeft <= 10 ? 'text-red-400 animate-bounce' : 'text-cyan-400'}`} />
              <span className={`font-mono text-2xl font-black ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
                {timeLeft}s
              </span>
            </div>

            {/* Score & Combo */}
            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-[10px] text-slate-400">SCORE</div>
                <div className="text-xl font-mono font-bold text-emerald-400">{score}</div>
              </div>

              {combo > 1 && (
                <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-xl animate-pulse">
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold">{combo} COMBO!</span>
                </div>
              )}
            </div>
          </div>

          {/* Time Progress Bar */}
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft <= 10 ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
              }`}
              style={{ width: `${(timeLeft / 45) * 100}%` }}
            />
          </div>

          {/* Question Card Box */}
          <div
            className={`p-8 rounded-3xl bg-slate-950/90 border transition-all text-center space-y-4 shadow-inner relative overflow-hidden ${
              feedback === 'correct'
                ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-950/20'
                : feedback === 'wrong'
                ? 'border-red-500 ring-2 ring-red-500/30 bg-red-950/20'
                : 'border-slate-800'
            }`}
          >
            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {currentQ.category}
            </div>

            <div className="text-3xl sm:text-4xl font-mono font-black text-white tracking-wider py-4">
              {currentQ.questionText}
            </div>

            {feedback === 'correct' && (
              <div className="text-emerald-400 font-bold text-sm flex items-center justify-center gap-1.5 animate-bounce">
                <CheckCircle2 className="w-5 h-5" /> 정답입니다! (+점수)
              </div>
            )}
            {feedback === 'wrong' && (
              <div className="text-red-400 font-bold text-sm flex items-center justify-center gap-1.5 animate-pulse">
                <XCircle className="w-5 h-5" /> 오답! 콤보 리셋
              </div>
            )}
          </div>

          {/* Answer Options Grid */}
          <div className="grid grid-cols-2 gap-4">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswerSelect(opt)}
                className="py-5 px-6 rounded-2xl bg-slate-950 hover:bg-indigo-600/30 border border-slate-800 hover:border-indigo-500/60 text-white font-mono font-bold text-2xl active:scale-[0.97] transition-all shadow-md"
              >
                {opt}
              </button>
            ))}
          </div>

        </div>
      )}

      {/* GAME OVER & SUMMARY SCREEN */}
      {gameState === 'gameover' && (
        <div className="space-y-6 text-center py-4">
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mx-auto">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white tracking-tight">게임 종료!</h2>
            <p className="text-sm text-slate-400">
              숫자 이름 <strong className="text-indigo-300 font-mono font-bold">#{numericName}</strong> 님의 최종 기록입니다.
            </p>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400">최종 점수</div>
              <div className="text-2xl font-mono font-black text-emerald-400">{score}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400">맞힌 문제</div>
              <div className="text-2xl font-mono font-black text-cyan-300">{correctCount}개</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400">최대 콤보</div>
              <div className="text-2xl font-mono font-black text-amber-400">{maxCombo} Combo</div>
            </div>
          </div>

          {/* Leaderboard Result Notification */}
          {submittedResult ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 max-w-lg mx-auto text-emerald-300 text-xs font-medium space-y-1">
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>오늘의 실시간 리더보드에 정상 등록되었습니다!</span>
              </div>
              <p className="text-emerald-400/80">
                자정(00:00)까지 1위를 유지하면 '명예의 전당'에 최종 등재됩니다.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-lg mx-auto text-xs text-slate-400">
              기록 저장이 완료되었습니다.
            </div>
          )}

          {/* Retry & New Number Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
            <button
              onClick={handleStartGame}
              className="w-full sm:flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>같은 번호로 재도전</span>
            </button>

            <button
              onClick={() => {
                setGameState('idle')
                setNumericName('')
              }}
              className="w-full sm:flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
            >
              <span>다른 번호로 참가</span>
            </button>
          </div>

        </div>
      )}

    </div>
  )
}
