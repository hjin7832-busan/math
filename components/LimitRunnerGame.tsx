'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import MathView from './MathView'
import {
  validateNumericName,
  submitScore,
  getUserDailyPlayStatus,
  MAX_DAILY_PLAY_COUNT,
} from '@/lib/leaderboardManager'
import GameLeaderboard from './GameLeaderboard'

// ── Web Audio API Sound Synthesizer ───────────────────────────────
function playAudioSound(type: 'jump' | 'crash' | 'villain' | 'shoot' | 'ng' | 'end' | 'praise') {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const now = ctx.currentTime

    if (type === 'praise') {
      const notes = [523.25, 659.25, 783.99] // C5, E5, G5 major arpeggio
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'triangle'
        osc.frequency.value = freq
        const t = now + i * 0.06
        gain.gain.setValueAtTime(0.2, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
        osc.start(t)
        osc.stop(t + 0.18)
      })
    } else if (type === 'jump') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(300, now)
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.12)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12)
      osc.start(now)
      osc.stop(now + 0.12)
    } else if (type === 'crash') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, now)
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3)
      gain.gain.setValueAtTime(0.35, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
      osc.start(now)
      osc.stop(now + 0.3)
    } else if (type === 'villain') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.2)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.2)
    } else if (type === 'shoot') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now)
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)
    } else if (type === 'ng') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(200, now)
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.2)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.2)
    } else {
      const notes = [440, 554.37, 659.25, 880]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        const t = now + i * 0.1
        gain.gain.setValueAtTime(0.18, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
        osc.start(t)
        osc.stop(t + 0.3)
      })
    }
  } catch {
    /* Autoplay block ignore */
  }
}

// ── 수학 문제 구조 (눈으로 푸는 직관적 함수의 극한) ────────────────
export interface MentalLimitQuestion {
  id: string
  exprLatex: string
  targetLatex: string
  questionText: string
  answer: string
  choices: string[]
  choicesLatex: string[]
  explanation: string
  explanationLatex: string
}

export interface WrongNote {
  q: MentalLimitQuestion
  userChoice: string
}

const GAME_SECS = 60
const GAME_ID = 'limit-runner'

const OBSTACLE_PRAISES = ['Good!', 'Nice Jump!', 'Great!', 'Awesome!', '나이스 점프!', 'Perfect!']
const QUIZ_PRAISES = ['Great Job!', 'Excellent!', 'Brilliant!', '정답!', 'Superb!', 'Perfect Solved!']

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function makeUniqueChoices(correct: string, altCandidates: string[]): string[] {
  const set = new Set<string>([correct])
  for (const c of altCandidates) {
    if (set.size >= 4) break
    if (c !== correct) set.add(c)
  }
  let fallback = -5
  while (set.size < 4) {
    const s = `${fallback}`
    if (s !== correct) set.add(s)
    fallback++
  }
  return shuffle(Array.from(set))
}

// ── 눈으로 푸는 암산용 함수의 극한 문제 생성기 (단일 난이도) ─────────
function generateMentalLimitQuestion(): MentalLimitQuestion {
  const types = ['poly_direct', 'const_limit', 'zero_simple', 'reciprocal_inf']
  const selectedType = types[Math.floor(Math.random() * types.length)]
  const id = Math.random().toString(36).substring(2, 9)

  if (selectedType === 'poly_direct') {
    const a = Math.floor(Math.random() * 5) - 1
    const b = Math.floor(Math.random() * 6) + 1
    const ans = a + b
    const ansStr = `${ans}`

    const choices = makeUniqueChoices(ansStr, [`${ans + 1}`, `${ans - 1}`, `${b}`, '0'])
    const exprLatex = `\\lim_{x \\to ${a}} (x + ${b})`

    return {
      id,
      exprLatex,
      targetLatex: `x \\to ${a}`,
      questionText: `눈으로 직접 대입하여 극한값을 빠르게 암산하세요!`,
      answer: ansStr,
      choices,
      choicesLatex: choices,
      explanation: `다항함수이므로 x = ${a}를 그대로 대입합니다.`,
      explanationLatex: `\\lim_{x \\to ${a}} (x + ${b}) = ${a} + ${b} = ${ans}`,
    }
  } else if (selectedType === 'const_limit') {
    const c = Math.floor(Math.random() * 9) + 1
    const a = Math.floor(Math.random() * 4) + 1
    const ansStr = `${c}`

    const choices = makeUniqueChoices(ansStr, [`${c + a}`, '0', `${a}`, '1'])
    const exprLatex = `\\lim_{x \\to ${a}} ${c}`

    return {
      id,
      exprLatex,
      targetLatex: `x \\to ${a}`,
      questionText: `상수함수의 극한값을 암산하여 악당을 물리치세요!`,
      answer: ansStr,
      choices,
      choicesLatex: choices,
      explanation: `상수함수의 극한값은 x값에 관계없이 항상 그 상수 자체입니다.`,
      explanationLatex: `\\lim_{x \\to ${a}} ${c} = ${c}`,
    }
  } else if (selectedType === 'zero_simple') {
    const a = Math.floor(Math.random() * 3) + 1
    const ans = 2 * a
    const ansStr = `${ans}`

    const choices = makeUniqueChoices(ansStr, [`${a}`, '0', '\\infty', `${ans + 1}`])
    const exprLatex = `\\lim_{x \\to ${a}} \\frac{x^2 - ${a * a}}{x - ${a}}`

    return {
      id,
      exprLatex,
      targetLatex: `x \\to ${a}`,
      questionText: `약분 후 대입하여 극한값을 암산하세요!`,
      answer: ansStr,
      choices,
      choicesLatex: choices,
      explanation: `(x^2 - a^2)/(x - a) = x + a -> 2a 입니다.`,
      explanationLatex: `\\lim_{x \\to ${a}} (x + ${a}) = ${ans}`,
    }
  } else {
    const k = Math.floor(Math.random() * 5) + 1
    const isZero = Math.random() > 0.3
    const ansStr = isZero ? '0' : `${k}`
    const exprLatex = isZero
      ? `\\lim_{x \\to \\infty} \\frac{${k}}{x}`
      : `\\lim_{x \\to \\infty} \\frac{${k}x}{x}`

    const choices = makeUniqueChoices(ansStr, ['0', '1', '\\infty', `${k}`])

    return {
      id,
      exprLatex,
      targetLatex: `x \\to \\infty`,
      questionText: `x → ∞ 일 때 분수식의 극한값을 판별하세요!`,
      answer: ansStr,
      choices,
      choicesLatex: choices,
      explanation: isZero
        ? `x → ∞ 일 때 분모가 무한히 커지므로 0에 수렴합니다.`
        : `분모 분자의 최고차항 계수비가 극한값입니다.`,
      explanationLatex: exprLatex + ` = ${ansStr}`,
    }
  }
}

// ── 2D Canvas Runner Game Engine Component ───────────────────────────
function RunnerCanvas({
  isJumping,
  onJumpReq,
  onHitObstacle,
  onClearObstacle,
  hasVillain,
  isGameOver,
  praiseText,
}: {
  isJumping: boolean
  onJumpReq: () => void
  onHitObstacle: () => void
  onClearObstacle: () => void
  hasVillain: boolean
  isGameOver: boolean
  praiseText: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)

  // Runner state refs
  const heroYRef = useRef<number>(0)
  const heroVyRef = useRef<number>(0)
  const isGroundedRef = useRef<boolean>(true)

  const obstacleXRef = useRef<number>(600)
  const obstacleTypeRef = useRef<'single' | 'double' | 'tall'>('single')
  const villainXRef = useRef<number>(800)
  const scrollRef = useRef<number>(0)
  const hasCollidedRef = useRef<boolean>(false)
  const hasClearedRef = useRef<boolean>(false)

  const onJumpReqRef = useRef(onJumpReq)
  onJumpReqRef.current = onJumpReq

  const onHitObstacleRef = useRef(onHitObstacle)
  onHitObstacleRef.current = onHitObstacle

  const onClearObstacleRef = useRef(onClearObstacle)
  onClearObstacleRef.current = onClearObstacle

  // Trigger Jump Logic
  const triggerJump = useCallback(() => {
    if (isGroundedRef.current && !isGameOver) {
      heroVyRef.current = -13.5
      isGroundedRef.current = false
      onJumpReqRef.current()
    }
  }, [isGameOver])

  useEffect(() => {
    if (isJumping && isGroundedRef.current) {
      triggerJump()
    }
  }, [isJumping, triggerJump])

  const drawRunnerScene = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const W = rect.width
    const H = rect.height

    const groundY = H - 50
    const heroRadius = 18
    const heroX = W * 0.22

    // 1. Update Physics (Gravity & Jump)
    if (!isGroundedRef.current) {
      heroYRef.current += heroVyRef.current
      heroVyRef.current += 0.75

      if (heroYRef.current >= 0) {
        heroYRef.current = 0
        heroVyRef.current = 0
        isGroundedRef.current = true
      }
    }

    const currentHeroY = groundY - heroRadius + heroYRef.current

    // 2. Runner speed
    const speed = hasVillain || isGameOver ? 0 : 8
    scrollRef.current += speed

    // Update Obstacle position
    obstacleXRef.current -= speed
    if (obstacleXRef.current < -80) {
      obstacleXRef.current = W + Math.random() * 220 + 200
      hasCollidedRef.current = false
      hasClearedRef.current = false

      const rand = Math.random()
      if (rand < 0.4) obstacleTypeRef.current = 'single'
      else if (rand < 0.75) obstacleTypeRef.current = 'double'
      else obstacleTypeRef.current = 'tall'
    }

    // Update Villain position
    if (hasVillain) {
      if (villainXRef.current > W * 0.65) {
        villainXRef.current -= 5
      }
    } else {
      villainXRef.current = W + 300
    }

    // 3. Render Background
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#020617')
    bg.addColorStop(0.7, '#0f172a')
    bg.addColorStop(1, '#1e293b')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Parallax Speed Grid Lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)'
    ctx.lineWidth = 2
    const gridOffset = (scrollRef.current % 40)
    for (let x = -gridOffset; x < W; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, groundY)
      ctx.lineTo(x - 20, H)
      ctx.stroke()
    }

    // Ground Line
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(0, groundY)
    ctx.lineTo(W, groundY)
    ctx.stroke()

    ctx.fillStyle = '#0284c7'
    ctx.fillRect(0, groundY + 2, W, H - groundY)

    // 4. Render Hero Runner Avatar
    ctx.shadowColor = '#38bdf8'
    ctx.shadowBlur = 15
    ctx.beginPath()
    ctx.arc(heroX, currentHeroY, heroRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#38bdf8'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.shadowBlur = 0

    // Hero Face / Eyes
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.arc(heroX + 5, currentHeroY - 3, 3, 0, Math.PI * 2)
    ctx.fill()

    // 5. Render Higher-Difficulty Obstacles (Single / Double / Tall Spikes)
    const obsX = obstacleXRef.current
    let obsW = 34
    let obsH = 44

    if (obstacleTypeRef.current === 'double') {
      obsW = 60
      obsH = 44
    } else if (obstacleTypeRef.current === 'tall') {
      obsW = 38
      obsH = 55
    }

    const obsY = groundY - obsH

    ctx.fillStyle = '#f43f5e'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5

    if (obstacleTypeRef.current === 'double') {
      ctx.beginPath()
      ctx.moveTo(obsX, groundY)
      ctx.lineTo(obsX + 15, obsY)
      ctx.lineTo(obsX + 30, groundY)
      ctx.lineTo(obsX + 45, obsY)
      ctx.lineTo(obsX + 60, groundY)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(obsX, groundY)
      ctx.lineTo(obsX + obsW / 2, obsY)
      ctx.lineTo(obsX + obsW, groundY)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }

    // Precise Collision Detection
    const heroLeftX = heroX - heroRadius + 4
    const heroRightX = heroX + heroRadius - 4
    const heroBottomY = currentHeroY + heroRadius - 2

    if (
      heroRightX > obsX &&
      heroLeftX < obsX + obsW &&
      heroBottomY > obsY + 4 &&
      !isGameOver &&
      !hasCollidedRef.current
    ) {
      hasCollidedRef.current = true
      onHitObstacleRef.current()
    }

    // 🌟 Obstacle Cleared Detection (Praise trigger for successful jump)
    if (obsX + obsW < heroLeftX && !hasClearedRef.current && !hasCollidedRef.current) {
      hasClearedRef.current = true
      onClearObstacleRef.current()
    }

    // 6. Render Villain Monster (if encountered)
    if (hasVillain || villainXRef.current < W) {
      const vX = villainXRef.current
      const vY = groundY - 45

      ctx.shadowColor = '#a855f7'
      ctx.shadowBlur = 20
      ctx.fillStyle = '#a855f7'
      ctx.beginPath()
      ctx.arc(vX, vY, 28, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      ctx.stroke()
      ctx.shadowBlur = 0

      ctx.fillStyle = '#e9d5ff'
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('😈', vX, vY + 8)

      ctx.fillStyle = '#f43f5e'
      ctx.font = 'bold 12px monospace'
      ctx.fillText('⚠️ 악당 출현! 수식을 풀어라!', vX, vY - 40)
    }

    animRef.current = requestAnimationFrame(drawRunnerScene)
  }, [hasVillain, isGameOver])

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawRunnerScene)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [drawRunnerScene])

  return (
    <div
      onClick={triggerJump}
      className="w-full h-[320px] sm:h-[360px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 relative cursor-pointer select-none group"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* 🌟 Encouraging Praise Toast Popup Banner */}
      {praiseText && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 text-slate-950 px-6 py-2 rounded-full font-black text-xl shadow-2xl animate-bounce border-2 border-white flex items-center gap-2 pointer-events-none z-20">
          <span>✨</span>
          <span>{praiseText}</span>
          <span>✨</span>
        </div>
      )}

      <div className="absolute top-3 left-4 text-xs font-mono font-bold text-cyan-400 bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-800 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
        <span>🏃 Jump: Space / Touch Anywhere!</span>
      </div>
      <div className="absolute bottom-3 right-4 text-[11px] font-mono text-rose-400 bg-slate-900/90 px-3.5 py-1 rounded-full border border-rose-900/40 pointer-events-none font-bold">
        ⚠️ 장애물 충돌 시 즉시 Game Over!
      </div>
    </div>
  )
}

// ── 함수의 극한 장애물 러너 메인 컴포넌트 ──────────────────────────────
export default function LimitRunnerGame({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')

  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle')

  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_SECS)

  const [currentQ, setCurrentQ] = useState<MentalLimitQuestion>(generateMentalLimitQuestion())
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([])
  const [flash, setFlash] = useState<'ok' | 'ng' | null>(null)

  const [hasVillain, setHasVillain] = useState(false)
  const [isJumping, setIsJumping] = useState(false)
  const [gameOverReason, setGameOverReason] = useState<string>('')
  const [praiseText, setPraiseText] = useState<string | null>(null)

  const [resultMsg, setResultMsg] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [resultTab, setResultTab] = useState<'score' | 'wrong'>('score')

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

  // 최신 상태 refs
  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const nameRef = useRef('')
  const phaseRef = useRef<'idle' | 'playing' | 'done'>('idle')

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const villainTimerRef = useRef<NodeJS.Timeout | null>(null)
  const praiseTimerRef = useRef<NodeJS.Timeout | null>(null)

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (villainTimerRef.current) clearInterval(villainTimerRef.current)
    if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current)
  }

  const triggerPraise = useCallback((type: 'obstacle' | 'quiz') => {
    const list = type === 'obstacle' ? OBSTACLE_PRAISES : QUIZ_PRAISES
    const chosen = list[Math.floor(Math.random() * list.length)]
    setPraiseText(chosen)
    playAudioSound('praise')

    if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current)
    praiseTimerRef.current = setTimeout(() => {
      setPraiseText(null)
    }, 1200)
  }, [])

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
      setNameErr(status.msg ?? '도전을 시작할 수 없습니다.')
    }
  }, [])

  useEffect(() => {
    if (name.trim().length >= 2) {
      checkUserLimit(name)
    }
  }, [name, checkUserLimit])

  // ── 게임 종료 & Supabase 점수 등록 ─────────────────────────────────
  const endGame = useCallback(async (reason?: string) => {
    clearTimer()
    if (reason) setGameOverReason(reason)

    playAudioSound('end')
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

  // ── 장애물 충돌 시 즉시 Game Over 처리 ─────────────────────────────
  const handleHitObstacle = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    playAudioSound('crash')
    endGame('⚠️ 가시 장애물에 충돌하여 서바이벌 실패!')
  }, [endGame])

  // ── 장애물 성공 점프 통과 칭찬 이벤트 ─────────────────────────────
  const handleClearObstacle = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    triggerPraise('obstacle')
  }, [triggerPraise])

  // ── Periodic Villain Encounter Spawner ─────────────────────────────
  const scheduleVillainEncounter = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    const delay = Math.floor(Math.random() * 3000) + 4000
    villainTimerRef.current = setTimeout(() => {
      if (phaseRef.current === 'playing') {
        playAudioSound('villain')
        setHasVillain(true)
        setCurrentQ(generateMentalLimitQuestion())
      }
    }, delay)
  }, [])

  const startGame = async () => {
    const v = validateNumericName(name)
    if (!v.ok) {
      setNameErr(v.msg ?? '')
      return
    }

    const status = await getUserDailyPlayStatus(name, GAME_ID)
    setPlayStatus(status)
    if (!status.canPlay) {
      setNameErr(status.msg ?? '도전을 시작할 수 없습니다.')
      return
    }

    setNameErr('')
    setGameOverReason('')
    setHasVillain(false)
    setPraiseText(null)
    setScore(0)
    setCorrect(0)
    setTotalCount(0)
    setCombo(0)
    setMaxCombo(0)
    setWrongNotes([])

    scoreRef.current = 0
    correctRef.current = 0
    comboRef.current = 0
    maxComboRef.current = 0
    nameRef.current = name
    phaseRef.current = 'playing'

    setTimeLeft(GAME_SECS)
    setCurrentQ(generateMentalLimitQuestion())
    setPhase('playing')

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          setTimeout(() => endGame('⏱️ 60초 제한시간 완료!'), 0)
          return 0
        }
        return t - 1
      })
    }, 1000)
    timerRef.current = interval

    scheduleVillainEncounter()
  }

  // ── 악당 퀴즈 정답 처리 ─────────────────────────────────────────────
  const handleChoice = useCallback(
    (choice: string) => {
      if (phaseRef.current !== 'playing' || !hasVillain) return

      const isOk = choice === currentQ.answer
      setTotalCount((t) => t + 1)

      if (isOk) {
        playAudioSound('shoot')
        setFlash('ok')
        triggerPraise('quiz')

        const basePts = 150
        const newCombo = comboRef.current + 1
        const pts = basePts + newCombo * 30

        scoreRef.current += pts
        correctRef.current += 1
        comboRef.current = newCombo
        if (newCombo > maxComboRef.current) maxComboRef.current = newCombo

        setScore(scoreRef.current)
        setCorrect(correctRef.current)
        setCombo(newCombo)
        setMaxCombo(maxComboRef.current)

        setHasVillain(false)
        setFlash(null)
        scheduleVillainEncounter()
      } else {
        playAudioSound('ng')
        setFlash('ng')
        comboRef.current = 0
        setCombo(0)
        setWrongNotes((prev) => [...prev, { q: currentQ, userChoice: choice }])

        setTimeout(() => {
          endGame('😈 악당 퀴즈에 오답을 제출하여 격파 실패!')
        }, 300)
      }
    },
    [currentQ, hasVillain, scheduleVillainEncounter, endGame, triggerPraise]
  )

  // ── 키보드 단축키 (Space = Jump, 1~4 = Answer Choice) ────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return
      const key = e.key

      if (key === ' ' || key === 'ArrowUp' || key.toLowerCase() === 'w') {
        setIsJumping(true)
        setTimeout(() => setIsJumping(false), 100)
      }

      if (hasVillain) {
        if (key === '1' && currentQ.choices[0]) handleChoice(currentQ.choices[0])
        if (key === '2' && currentQ.choices[1]) handleChoice(currentQ.choices[1])
        if (key === '3' && currentQ.choices[2]) handleChoice(currentQ.choices[2])
        if (key === '4' && currentQ.choices[3]) handleChoice(currentQ.choices[3])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasVillain, currentQ, handleChoice])

  useEffect(() => () => clearTimer(), [])

  // ─────────────────────────────────────────────────────────────────
  // 1. 대기 화면 (시작 화면 & 규칙 설명)
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="space-y-8 max-w-xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6 text-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-4xl">🏃</span>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  함수의 극한 장애물 러너 (Limit Runner)
                </h2>
                <p className="text-xs text-cyan-400 font-mono mt-0.5">
                  Single Difficulty Infinite Runner Speed Quiz
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              장애물을 점프하여 회피하고, 달리다 마주치는 악당을 눈으로 푸는 암산용 극한 문제로 물리치는 서바이벌 미니 게임!
            </p>
          </div>

          {/* 게임 조작법 안내 */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
            <p className="font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>🎮 점프 조작법</span>
              <span className="text-[10px] text-slate-400">제한시간 60초</span>
            </p>
            <div className="flex flex-wrap items-center gap-2.5 text-slate-200 py-1">
              <span className="bg-cyan-500/20 text-cyan-300 px-2.5 py-1 rounded-xl font-mono font-bold border border-cyan-500/30 text-xs">
                Space 키 / 위쪽 방향키(↑) / 화면 클릭·터치
              </span>
              <span className="text-slate-300 font-medium">를 눌러 장애물을 점프하세요!</span>
            </div>
          </div>

          {/* 학번 / PIN 번호 입력 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400">학번 / PIN 번호</label>
              {name.trim().length >= 2 && (
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    playStatus.canPlay
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
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
              className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-2xl text-lg font-mono text-white focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {nameErr && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-400">
                ⚠️ {nameErr}
              </div>
            )}
          </div>

          <button
            onClick={startGame}
            disabled={!name.trim() || !playStatus.canPlay}
            className={`w-full py-4 text-base font-extrabold rounded-2xl transition-all shadow-lg ${
              !name.trim() || !playStatus.canPlay
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:scale-[0.99] shadow-cyan-500/25'
            }`}
          >
            {!playStatus.canPlay ? (playStatus.msg || '도전을 시작할 수 없습니다') : `🏃 장애물 러너 시작 (60초)`}
          </button>
        </div>

        {/* Supabase 랭킹 */}
        <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. 플레이 화면 (캔버스 러너 + 악당 퀴즈 팝업)
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'playing') {
    return (
      <div className="space-y-4 max-w-4xl w-full mx-auto">
        {/* 상단 정보바 */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-5 py-3.5 rounded-2xl text-slate-100 shadow-md">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-cyan-400">#{name}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800">
              단일 통합 난이도
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span
              className={`font-mono font-black text-xl ${
                timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-100'
              }`}
            >
              ⏱️ {timeLeft}s
            </span>
            <span className="font-mono font-extrabold text-lg text-cyan-400">{score}점</span>
          </div>
        </div>

        {/* 타이머 프로그레스바 */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft <= 10 ? 'bg-rose-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${(timeLeft / GAME_SECS) * 100}%` }}
          />
        </div>

        {/* 콤보 이펙트 */}
        <div className="h-6 flex items-center justify-center">
          {combo > 1 && (
            <span className="text-sm font-black text-amber-400 tracking-wider animate-bounce">
              ⚡ {combo} COMBO! (+{30 * combo}점 추가)
            </span>
          )}
        </div>

        {/* 2D Canvas Interactive Runner Engine (With Praise System) */}
        <RunnerCanvas
          isJumping={isJumping}
          onJumpReq={() => playAudioSound('jump')}
          onHitObstacle={handleHitObstacle}
          onClearObstacle={handleClearObstacle}
          hasVillain={hasVillain}
          isGameOver={false}
          praiseText={praiseText}
        />

        {/* 악당 출현 시 팝업 퀴즈 카드 */}
        {hasVillain ? (
          <div
            className={`p-5 border rounded-3xl transition-all shadow-2xl ${
              flash === 'ok'
                ? 'border-emerald-500 bg-emerald-950/50 ring-2 ring-emerald-500'
                : flash === 'ng'
                ? 'border-rose-500 bg-rose-950/50 animate-shake'
                : 'border-amber-500/80 bg-slate-900 text-slate-100 ring-2 ring-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800 flex items-center gap-1.5">
                <span>😈 악당 차단 퀴즈</span>
              </span>
              <span className="font-mono text-slate-400 flex items-center gap-1">
                목표: <MathView math={currentQ.targetLatex} inline />
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <p className="text-base font-bold text-white">
                {currentQ.questionText}
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                <MathView math={currentQ.exprLatex} className="text-xl font-black text-amber-300" />
              </div>
            </div>

            {/* 보기 선택지 버튼 (1~4 키 / 클릭) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {currentQ.choices.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleChoice(c)}
                  className="py-3.5 px-3 border border-slate-700 bg-slate-950 rounded-2xl text-white hover:border-amber-400 hover:bg-slate-800 active:scale-95 transition-all shadow-md flex items-center justify-between group"
                >
                  <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-800 text-xs text-amber-400 font-mono group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                    {i + 1}
                  </span>
                  <MathView math={currentQ.choicesLatex[i]} inline className="text-lg font-black text-amber-300 flex-1 text-center" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
            <span>🏃 열심히 장애물을 뛰며 달리는 중... (Space / 화면 클릭으로 점프!)</span>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. 종료 화면 (결과 통계 + 오답 노트 + DB 랭킹)
  // ─────────────────────────────────────────────────────────────────
  const accuracy = totalCount > 0 ? Math.round((correct / totalCount) * 100) : 0

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span>🎉 러너 미션 완료!</span>
            </h2>
            <p className="text-sm font-mono text-cyan-400 mt-1">학번/PIN: #{name}</p>
            {gameOverReason && (
              <p className="text-xs text-rose-400 mt-1 font-semibold">{gameOverReason}</p>
            )}
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
            단일 통합 난이도
          </span>
        </div>

        {/* 탭 구분 */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <button
            onClick={() => setResultTab('score')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              resultTab === 'score'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            📊 러닝 통계
          </button>
          <button
            onClick={() => setResultTab('wrong')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              resultTab === 'wrong'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            📝 오답 분석 노트 ({wrongNotes.length}개)
          </button>
        </div>

        {/* ── 탭 1: 결과 통계 ────────────────────────────────────────── */}
        {resultTab === 'score' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="py-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400">최종 점수</div>
                <div className="text-xl font-black font-mono text-cyan-400 mt-1">{score}점</div>
              </div>
              <div className="py-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400">악당 격파</div>
                <div className="text-xl font-bold font-mono text-white mt-1">{correct}/{totalCount}</div>
              </div>
              <div className="py-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400">정답률</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{accuracy}%</div>
              </div>
              <div className="py-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400">최대 콤보</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">{maxCombo}×</div>
              </div>
            </div>

            {resultMsg && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs font-semibold text-emerald-400">
                {resultMsg}
              </div>
            )}
          </div>
        )}

        {/* ── 탭 2: 오답 분석 노트 ───────────────────────────────────── */}
        {resultTab === 'wrong' && (
          <div className="space-y-4">
            {wrongNotes.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                <p>🎉 모든 악당 퀴즈를 완벽하게 퇴치하였습니다! 오답이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {wrongNotes.map((wn, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span>Q{idx + 1}. 암산 극한 퀴즈</span>
                      <MathView math={wn.q.targetLatex} inline className="text-cyan-400" />
                    </div>
                    <p className="text-slate-300 font-semibold">{wn.q.questionText}</p>
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex justify-center">
                      <MathView math={wn.q.exprLatex} />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="px-3 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold rounded-lg flex items-center gap-1">
                        내가 선택한 답: <MathView math={wn.userChoice} inline />
                      </span>
                      <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold rounded-lg flex items-center gap-1">
                        정답: <MathView math={wn.q.answer} inline />
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-300 leading-relaxed">
                      💡 <strong>풀이 해설:</strong> {wn.q.explanation}
                      <div className="mt-1">
                        <MathView math={wn.q.explanationLatex} inline />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => {
            clearTimer()
            phaseRef.current = 'idle'
            setPhase('idle')
            setNameErr('')
            setResultMsg('')
            setRefreshTrigger((prev) => prev + 1)
          }}
          className="w-full py-4 bg-cyan-500 text-slate-950 font-extrabold text-base rounded-2xl hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
        >
          다시 도전하기
        </button>
      </div>

      {/* DB 순위표 */}
      <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
    </div>
  )
}
