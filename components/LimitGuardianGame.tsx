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
function playAudioSound(type: 'attack' | 'hit' | 'bossAttack' | 'victory' | 'ng' | 'end') {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const now = ctx.currentTime

    if (type === 'attack') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(300, now)
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)
    } else if (type === 'hit') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(160, now)
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.2)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.2)
    } else if (type === 'bossAttack') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(120, now)
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25)
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
      osc.start(now)
      osc.stop(now + 0.25)
    } else if (type === 'ng') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(240, now)
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.2)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.2)
    } else if (type === 'victory') {
      const freqs = [523.25, 659.25, 783.99, 1046.5]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        const t = now + i * 0.08
        gain.gain.setValueAtTime(0.2, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
        osc.start(t)
        osc.stop(t + 0.25)
      })
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

// ── 수학 문제 구조 ──────────────────────────────────────────────────
export type Difficulty = 'easy' | 'normal' | 'hard'

export interface LimitQuestion {
  id: string
  categoryName: string
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
  q: LimitQuestion
  userChoice: string
}

const GAME_SECS = 60
const GAME_ID = 'limit-guardian'
const BOSS_MAX_HP = 1000

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

// ── 부정형 및 함수 극한 문제 생성기 ────────────────────────────────
function generateLimitQuestion(difficulty: Difficulty): LimitQuestion {
  const categories = ['direct', 'zero_over_zero', 'infinity_over_infinity', 'onesided']
  const selectedCat = categories[Math.floor(Math.random() * categories.length)]
  const id = Math.random().toString(36).substring(2, 9)

  if (selectedCat === 'direct') {
    // ── 1. 다항함수의 직대입 극한 ──────────────────────────────────────
    const a = Math.floor(Math.random() * 5) - 2 // -2 ~ 2
    const m = Math.floor(Math.random() * 3) + 1
    const b = Math.floor(Math.random() * 7) - 3

    const ans = m * a * a + b
    const ansStr = `${ans}`

    const choices = makeUniqueChoices(ansStr, [
      `${ans + 2}`,
      `${ans - 2}`,
      `${ans + m}`,
      '0',
    ])

    const polyStr = `${m === 1 ? '' : m}x^2 ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}`
    const exprLatex = `\\lim_{x \\to ${a}} (${polyStr})`

    return {
      id,
      categoryName: '기본 다항함수 극한',
      exprLatex,
      targetLatex: `x \\to ${a}`,
      questionText: `다음 다항함수의 극한값을 계산하여 마왕을 공격하세요!`,
      answer: ansStr,
      choices,
      choicesLatex: choices,
      explanation: `다항함수는 모든 실수에서 연속이므로 x = ${a}를 직접 대입합니다.`,
      explanationLatex: `\\lim_{x \\to ${a}} (${polyStr}) = ${m}(${a})^2 ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)} = ${ans}`,
    }
  } else if (selectedCat === 'zero_over_zero') {
    // ── 2. 0/0 꼴 부정형 극한 (인수분해 및 약분) ───────────────────────
    const a = Math.floor(Math.random() * 4) + 1 // 1 ~ 4
    const isRootType = difficulty === 'hard' && Math.random() > 0.5

    if (isRootType) {
      // 유리화 0/0 꼴: lim_{x -> a} (sqrt(x) - sqrt(a)) / (x - a) or similar
      const squareA = a * a
      const ansStr = `\\frac{1}{${2 * a}}`
      const rawChoices = makeUniqueChoices(ansStr, [
        `\\frac{1}{${a}}`,
        `${2 * a}`,
        '0',
        '\\infty',
      ])

      const exprLatex = `\\lim_{x \\to ${squareA}} \\frac{\\sqrt{x} - ${a}}{x - ${squareA}}`

      return {
        id,
        categoryName: '0/0 꼴 유리화 극한 (어려움)',
        exprLatex,
        targetLatex: `x \\to ${squareA}`,
        questionText: `분모 분자를 유리화하여 0/0 꼴 부정형의 극한값을 구하세요!`,
        answer: ansStr,
        choices: rawChoices,
        choicesLatex: rawChoices,
        explanation: `분자를 유리화: (sqrt(x)-a)(sqrt(x)+a)/(x-a^2)(sqrt(x)+a) = 1/(sqrt(x)+a) -> 1/(2a)`,
        explanationLatex: `\\lim_{x \\to ${squareA}} \\frac{1}{\\sqrt{x} + ${a}} = \\frac{1}{${2 * a}}`,
      }
    } else {
      // 인수분해 0/0 꼴: lim_{x -> a} (x^2 - a^2) / (x - a) = 2a
      const ans = 2 * a
      const ansStr = `${ans}`

      const choices = makeUniqueChoices(ansStr, [
        `${a}`,
        '0',
        '\\infty',
        `${ans + 2}`,
      ])

      const exprLatex = `\\lim_{x \\to ${a}} \\frac{x^2 - ${a * a}}{x - ${a}}`

      return {
        id,
        categoryName: '0/0 꼴 인수분해 극한',
        exprLatex,
        targetLatex: `x \\to ${a}`,
        questionText: `분자를 인수분해하여 약분한 후 극한값을 구하세요!`,
        answer: ansStr,
        choices,
        choicesLatex: choices,
        explanation: `(x^2 - a^2)/(x - a) = (x - a)(x + a)/(x - a) = x + a -> 2a`,
        explanationLatex: `\\lim_{x \\to ${a}} (x + ${a}) = ${ans}`,
      }
    }
  } else if (selectedCat === 'infinity_over_infinity') {
    // ── 3. 무한대 / 무한대 꼴 부정형 (최고차항 비교) ───────────────────
    const numCoeff = Math.floor(Math.random() * 4) + 1
    const denCoeff = Math.floor(Math.random() * 3) + 1
    const subType = Math.random()

    if (subType < 0.4) {
      // 동차식: 계수비
      let ansStr: string
      if (numCoeff % denCoeff === 0) {
        ansStr = `${numCoeff / denCoeff}`
      } else {
        ansStr = `\\frac{${numCoeff}}{${denCoeff}}`
      }

      const choices = makeUniqueChoices(ansStr, [
        '0',
        '\\infty',
        `${numCoeff}`,
        '1',
      ])

      const exprLatex = `\\lim_{x \\to \\infty} \\frac{${numCoeff === 1 ? '' : numCoeff}x^2 + 3}{${denCoeff === 1 ? '' : denCoeff}x^2 - 2}`

      return {
        id,
        categoryName: '∞/∞ 꼴 계수비 극한',
        exprLatex,
        targetLatex: `x \\to \\infty`,
        questionText: `x → ∞ 일 때 분모와 분자의 최고차항 계수비를 구하세요!`,
        answer: ansStr,
        choices,
        choicesLatex: choices,
        explanation: `분모 분자 최고차항 차수가 같으므로 최고차항 계수의 비가 극한값입니다.`,
        explanationLatex: `\\lim_{x \\to \\infty} \\frac{${numCoeff}x^2}{${denCoeff}x^2} = ${ansStr}`,
      }
    } else if (subType < 0.7) {
      // 분모 차수 > 분자 차수 -> 0
      const ansStr = '0'
      const choices = ['0', '1', '\\infty', `${numCoeff}`]
      const exprLatex = `\\lim_{x \\to \\infty} \\frac{${numCoeff === 1 ? '' : numCoeff}x + 5}{x^2 + 2}`

      return {
        id,
        categoryName: '∞/∞ 꼴 (분모 차수 > 분자 차수)',
        exprLatex,
        targetLatex: `x \\to \\infty`,
        questionText: `분모의 차수가 더 클 때 x → ∞ 의 극한값을 판별하세요!`,
        answer: ansStr,
        choices,
        choicesLatex: choices,
        explanation: `분모의 차수가 분자의 차수보다 크므로 0에 수렴합니다.`,
        explanationLatex: `\\lim_{x \\to \\infty} \\frac{${numCoeff}x+5}{x^2+2} = 0`,
      }
    } else {
      // 분자 차수 > 분모 차수 -> 무한대 발산
      const ansStr = '\\infty'
      const choices = ['\\infty', '0', '1', `${numCoeff}`]
      const exprLatex = `\\lim_{x \\to \\infty} \\frac{${numCoeff === 1 ? '' : numCoeff}x^2 + 1}{x + 3}`

      return {
        id,
        categoryName: '∞/∞ 꼴 (분자 차수 > 분모 차수)',
        exprLatex,
        targetLatex: `x \\to \\infty`,
        questionText: `분자의 차수가 더 클 때 x → ∞ 의 극한값을 판별하세요!`,
        answer: ansStr,
        choices,
        choicesLatex: choices,
        explanation: `분자의 차수가 분모보다 크므로 양의 무한대(∞)로 발산합니다.`,
        explanationLatex: `\\lim_{x \\to \\infty} \\frac{${numCoeff}x^2+1}{x+3} = \\infty`,
      }
    }
  } else {
    // ── 4. 좌/우극한 및 절댓값 기호 극한 ─────────────────────────────
    const a = Math.floor(Math.random() * 5) - 2
    const isRight = Math.random() > 0.5
    const dir = isRight ? '+' : '-'
    const ansY = isRight ? 1 : -1
    const ansStr = `${ansY}`

    const choices = makeUniqueChoices(ansStr, ['1', '-1', '0', '발산'])

    const exprLatex = `\\lim_{x \\to ${a}^{${dir}}} \\frac{|x - ${a}|}{x - ${a}}`

    return {
      id,
      categoryName: '절댓값 좌/우극한',
      exprLatex,
      targetLatex: `x \\to ${a}^{${dir}}`,
      questionText: `x → ${a}^${dir} 접근 시 절댓값 함수 극한값을 판단하세요!`,
      answer: ansStr,
      choices,
      choicesLatex: choices,
      explanation: isRight
        ? `x > ${a} 이므로 |x - ${a}| = x - ${a} 가 되어 약분하면 1 입니다.`
        : `x < ${a} 이므로 |x - ${a}| = -(x - ${a}) 가 되어 약분하면 -1 입니다.`,
      explanationLatex: `\\lim_{x \\to ${a}^{${dir}}} \\frac{|x - ${a}|}{x - ${a}} = ${ansY}`,
    }
  }
}

// ── Canvas RPG Boss Battle Engine ──────────────────────────────────
function BossBattleCanvas({
  bossHp,
  maxHp,
  isHit,
  isAttacking,
  spellColor,
}: {
  bossHp: number
  maxHp: number
  isHit: boolean
  isAttacking: boolean
  spellColor: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)
  const tickRef = useRef(0)

  const drawScene = useCallback(() => {
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
    tickRef.current += 0.05
    const t = tickRef.current

    // 1. Dark Cyber Fantasy RPG Background
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#020617')
    bg.addColorStop(0.6, '#0f172a')
    bg.addColorStop(1, '#1e1b4b')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Background Magic Circle Grid
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, 140, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, 180, 0, Math.PI * 2)
    ctx.stroke()

    // 2. Boss Position (Infinity Dragon Floating)
    const bossBaseX = W * 0.72
    const floatY = Math.sin(t * 2) * 10
    const bossBaseY = H * 0.45 + floatY

    const shakeX = isHit ? (Math.random() - 0.5) * 20 : 0
    const shakeY = isHit ? (Math.random() - 0.5) * 20 : 0

    const bossX = bossBaseX + shakeX
    const bossY = bossBaseY + shakeY

    // Boss Aura Glow
    ctx.shadowColor = isHit ? '#f43f5e' : '#8b5cf6'
    ctx.shadowBlur = isHit ? 30 : 20
    ctx.beginPath()
    ctx.arc(bossX, bossY, 65, 0, Math.PI * 2)
    ctx.fillStyle = isHit ? 'rgba(244, 63, 94, 0.4)' : 'rgba(139, 92, 246, 0.25)'
    ctx.fill()
    ctx.shadowBlur = 0

    // Boss Dragon Body (SVG / Path Drawing)
    ctx.fillStyle = isHit ? '#f43f5e' : '#6d28d9'
    ctx.strokeStyle = '#a78bfa'
    ctx.lineWidth = 3

    ctx.beginPath()
    // Main Dragon Head & Horns
    ctx.moveTo(bossX - 45, bossY - 10)
    ctx.lineTo(bossX - 75, bossY - 45) // Left Horn
    ctx.lineTo(bossX - 30, bossY - 35)
    ctx.lineTo(bossX, bossY - 65)     // Crown Horn
    ctx.lineTo(bossX + 30, bossY - 35)
    ctx.lineTo(bossX + 75, bossY - 45) // Right Horn
    ctx.lineTo(bossX + 45, bossY - 10)
    ctx.lineTo(bossX + 60, bossY + 30) // Jaw right
    ctx.lineTo(bossX, bossY + 60)      // Chin
    ctx.lineTo(bossX - 60, bossY + 30) // Jaw left
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Boss Eyes (Glowing Red / Cyan)
    ctx.fillStyle = isHit ? '#ffffff' : '#06b6d4'
    ctx.beginPath()
    ctx.arc(bossX - 20, bossY - 5, 8, 0, Math.PI * 2)
    ctx.arc(bossX + 20, bossY - 5, 8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.arc(bossX - 20, bossY - 5, 3, 0, Math.PI * 2)
    ctx.arc(bossX + 20, bossY - 5, 3, 0, Math.PI * 2)
    ctx.fill()

    // Boss Symbol (Infinity ∞ on Chest)
    ctx.strokeStyle = '#e0e7ff'
    ctx.lineWidth = 4
    ctx.font = 'bold 32px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#c7d2fe'
    ctx.fillText('∞', bossX, bossY + 32)

    // 3. Player Hero Avatar (Left Side Warrior)
    const heroX = W * 0.22
    const heroY = H * 0.55

    // Hero Aura
    ctx.shadowColor = '#38bdf8'
    ctx.shadowBlur = 15
    ctx.beginPath()
    ctx.arc(heroX, heroY, 32, 0, Math.PI * 2)
    ctx.fillStyle = '#0284c7'
    ctx.fill()
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.shadowBlur = 0

    // Hero Shield / Sword Icon
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⚡', heroX, heroY + 8)

    // 4. Magic Spell Attack Beam (Player -> Boss)
    if (isAttacking) {
      ctx.strokeStyle = spellColor || '#38bdf8'
      ctx.lineWidth = 8
      ctx.shadowColor = spellColor || '#38bdf8'
      ctx.shadowBlur = 25
      ctx.beginPath()
      ctx.moveTo(heroX + 20, heroY)
      ctx.lineTo(bossX - 30, bossY)
      ctx.stroke()

      // Explosive Particles on Hit Point
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 8; i++) {
        const px = bossX - 30 + (Math.random() - 0.5) * 40
        const py = bossY + (Math.random() - 0.5) * 40
        ctx.beginPath()
        ctx.arc(px, py, Math.random() * 6 + 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
    }

    // 5. Boss HP Bar (Top Right)
    const hpBarW = 220
    const hpBarH = 16
    const hpBarX = W - hpBarW - 24
    const hpBarY = 24

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
    ctx.fillRect(hpBarX - 4, hpBarY - 4, hpBarW + 8, hpBarH + 8)

    const hpPercent = Math.max(0, bossHp / maxHp)
    const hpGradient = ctx.createLinearGradient(hpBarX, 0, hpBarX + hpBarW, 0)
    hpGradient.addColorStop(0, '#f43f5e')
    hpGradient.addColorStop(1, '#8b5cf6')

    ctx.fillStyle = hpGradient
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPercent, hpBarH)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1.5
    ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`BOSS HP: ${bossHp} / ${maxHp}`, hpBarX + hpBarW, hpBarY - 8)

    animRef.current = requestAnimationFrame(drawScene)
  }, [bossHp, maxHp, isHit, isAttacking, spellColor])

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawScene)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [drawScene])

  return (
    <div className="w-full h-[320px] sm:h-[380px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-3 left-4 text-xs font-mono font-bold text-cyan-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        <span>🐉 Limit Boss: Infinity Dragon</span>
      </div>
    </div>
  )
}

// ── 함수의 극한 마왕 대결 메인 컴포넌트 ───────────────────────────────
export default function LimitGuardianGame({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')

  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')

  const [bossHp, setBossHp] = useState(BOSS_MAX_HP)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_SECS)

  const [currentQ, setCurrentQ] = useState<LimitQuestion>(generateLimitQuestion('normal'))
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([])
  const [flash, setFlash] = useState<'ok' | 'ng' | null>(null)

  const [isBossHit, setIsBossHit] = useState(false)
  const [isAttacking, setIsAttacking] = useState(false)

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
      setNameErr(status.msg ?? '도전을 시작할 수 없습니다.')
    }
  }, [])

  useEffect(() => {
    if (name.trim().length >= 2) {
      checkUserLimit(name)
    }
  }, [name, checkUserLimit])

  // ── 게임 종료 & Supabase 점수 등록 ─────────────────────────────────
  const endGame = useCallback(async () => {
    clearTimer()
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
        `🎉 마왕 대결 점수가 Supabase DB에 등록되었습니다! (오늘 남은 도전: ${res.remaining ?? 0}회)`
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
      setNameErr(status.msg ?? '도전을 시작할 수 없습니다.')
      return
    }

    setNameErr('')
    setBossHp(BOSS_MAX_HP)
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
    setCurrentQ(generateLimitQuestion(difficulty))
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

  // ── 정답 및 공격 처리 ──────────────────────────────────────────────
  const handleChoice = useCallback(
    (choice: string) => {
      if (phaseRef.current !== 'playing') return

      const isOk = choice === currentQ.answer
      setTotalCount((t) => t + 1)

      if (isOk) {
        playAudioSound('attack')
        setIsAttacking(true)

        setTimeout(() => {
          playAudioSound('hit')
          setIsBossHit(true)
          setFlash('ok')

          const dmg = difficulty === 'hard' ? 120 : difficulty === 'normal' ? 90 : 70
          setBossHp((prev) => Math.max(0, prev - dmg))
        }, 120)

        const basePts = difficulty === 'hard' ? 200 : difficulty === 'normal' ? 150 : 100
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
      } else {
        playAudioSound('bossAttack')
        playAudioSound('ng')
        setFlash('ng')
        comboRef.current = 0
        setCombo(0)
        setWrongNotes((prev) => [...prev, { q: currentQ, userChoice: choice }])
      }

      setTimeout(() => {
        setIsAttacking(false)
        setIsBossHit(false)
        setFlash(null)
        setCurrentQ(generateLimitQuestion(difficulty))
      }, 400)
    },
    [currentQ, difficulty]
  )

  // ── 키보드 단축키 (1~4 키) ─────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return
      const key = e.key

      if (key === '1' && currentQ.choices[0]) handleChoice(currentQ.choices[0])
      if (key === '2' && currentQ.choices[1]) handleChoice(currentQ.choices[1])
      if (key === '3' && currentQ.choices[2]) handleChoice(currentQ.choices[2])
      if (key === '4' && currentQ.choices[3]) handleChoice(currentQ.choices[3])
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQ, handleChoice])

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
              <span className="text-4xl">🐉</span>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  함수의 극한 마왕 대결 (Limit Guardian)
                </h2>
                <p className="text-xs text-rose-400 font-mono mt-0.5">
                  Indeterminate Form Boss Battle RPG
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              0/0 꼴, $\infty/\infty$ 꼴 등 다양한 부정형 극한 문제를 마법으로 신속히 풀어 마왕 몬스터(Infinity Dragon)를 격파하세요!
            </p>
          </div>

          {/* 게임 규칙 안내 */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs">
            <p className="font-bold text-rose-400 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>🎮 전투 조작법 & 보스 레이드</span>
              <span className="text-[10px] text-slate-400">제한시간 60초</span>
            </p>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono font-bold">1~4 키</span>
                <span>정답 보기 번호를 조준하여 마왕 몬스터에게 마법 공격 발사</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold">부정형 극한</span>
                <span>0/0 꼴 인수분해/유리화, $\infty/\infty$ 꼴 계수비, 절댓값 좌/우극한 문제 출제</span>
              </li>
            </ul>
          </div>

          {/* 난이도 선택 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">난이도 선택</label>
            <div className="grid grid-cols-3 gap-3">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`py-3 rounded-2xl text-xs font-bold transition-all border ${
                    difficulty === d
                      ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20 scale-[1.02]'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {d === 'easy' ? '🌱 쉬움' : d === 'normal' ? '⚡ 보통' : '🔥 어려움 (유리화)'}
                </button>
              ))}
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
              className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-2xl text-lg font-mono text-white focus:outline-none focus:border-rose-500 transition-colors"
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
                : 'bg-rose-500 text-white hover:bg-rose-400 active:scale-[0.99] shadow-rose-500/25'
            }`}
          >
            {!playStatus.canPlay ? (playStatus.msg || '도전을 시작할 수 없습니다') : `⚔️ 마왕 대결 시작 (60초)`}
          </button>
        </div>

        {/* Supabase 랭킹 */}
        <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. 플레이 화면 (보스 애니메이션 캔버스 + LaTeX 질문 카드)
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'playing') {
    return (
      <div className="space-y-4 max-w-4xl w-full mx-auto">
        {/* 상단 정보바 */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-5 py-3.5 rounded-2xl text-slate-100 shadow-md">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-rose-400">#{name}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {difficulty === 'easy' ? '쉬움' : difficulty === 'normal' ? '보통' : '어려움'}
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
            <span className="font-mono font-extrabold text-lg text-rose-400">{score}점</span>
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
              ⚡ {combo} COMBO HIT! (+{30 * combo}점 추가)
            </span>
          )}
        </div>

        {/* Boss RPG Battle Canvas Engine */}
        <BossBattleCanvas
          bossHp={bossHp}
          maxHp={BOSS_MAX_HP}
          isHit={isBossHit}
          isAttacking={isAttacking}
          spellColor="#38bdf8"
        />

        {/* 문제 제시 카드 (LaTeX MathView 사용) */}
        <div
          className={`p-5 border rounded-3xl transition-all ${
            flash === 'ok'
              ? 'border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500'
              : flash === 'ng'
              ? 'border-rose-500 bg-rose-950/40 animate-shake'
              : 'border-slate-800 bg-slate-900 text-slate-100 shadow-lg'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-rose-400 bg-rose-950/60 px-3 py-1 rounded-full border border-rose-800">
              {currentQ.categoryName}
            </span>
            <span className="font-mono text-slate-400 flex items-center gap-1">
              목표: <MathView math={currentQ.targetLatex} inline />
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <p className="text-base font-bold text-white">
              {currentQ.questionText}
            </p>
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-center">
              <MathView math={currentQ.exprLatex} className="text-xl font-black text-cyan-300" />
            </div>
          </div>
        </div>

        {/* 보기 선택지 버튼 (키보드 1~4 대응) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {currentQ.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => handleChoice(c)}
              className="py-4 px-3 border border-slate-700 bg-slate-900 rounded-2xl text-white hover:border-rose-400 hover:bg-slate-800 active:scale-95 transition-all shadow-md flex flex-col items-center justify-center gap-1 group"
            >
              <div className="flex items-center gap-1">
                <span className="w-5 h-5 flex items-center justify-center rounded-lg bg-slate-800 text-xs text-rose-400 font-mono group-hover:bg-rose-500 group-hover:text-white transition-colors">
                  {i + 1}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">SPELL #{i + 1}</span>
              </div>
              <MathView math={currentQ.choicesLatex[i]} inline className="text-lg font-black text-cyan-300" />
            </button>
          ))}
        </div>
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
              <span>🎉 마왕 대결 전투 완료!</span>
            </h2>
            <p className="text-sm font-mono text-rose-400 mt-1">학번/PIN: #{name}</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
            {difficulty === 'easy' ? '쉬움' : difficulty === 'normal' ? '보통' : '어려움'}
          </span>
        </div>

        {/* 탭 구분 */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <button
            onClick={() => setResultTab('score')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              resultTab === 'score'
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            📊 전투 결과
          </button>
          <button
            onClick={() => setResultTab('wrong')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              resultTab === 'wrong'
                ? 'bg-rose-500 text-white shadow-md'
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
                <div className="text-xl font-black font-mono text-rose-400 mt-1">{score}점</div>
              </div>
              <div className="py-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400">정답 공격</div>
                <div className="text-xl font-bold font-mono text-white mt-1">{correct}/{totalCount}</div>
              </div>
              <div className="py-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-xs text-slate-400">명중률</div>
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

        {/* ── 탭 2: 오답 분석 노트 (LaTeX 렌더링 내장) ────────────────────── */}
        {resultTab === 'wrong' && (
          <div className="space-y-4">
            {wrongNotes.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                <p>🎉 모든 문제에 완벽한 마법 공격을 명중시켰습니다! 오답이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {wrongNotes.map((wn, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span>Q{idx + 1}. {wn.q.categoryName}</span>
                      <MathView math={wn.q.targetLatex} inline className="text-rose-400" />
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
          className="w-full py-4 bg-rose-500 text-white font-extrabold text-base rounded-2xl hover:bg-rose-400 transition-colors shadow-lg shadow-rose-500/20"
        >
          마왕에게 다시 도전하기
        </button>
      </div>

      {/* DB 순위표 */}
      <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
    </div>
  )
}
