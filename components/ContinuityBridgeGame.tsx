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
function playAudioSound(type: 'ok' | 'ng' | 'bridge' | 'end' | 'laser' | 'jump') {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const now = ctx.currentTime

    if (type === 'laser') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12)
      osc.start(now)
      osc.stop(now + 0.12)
    } else if (type === 'jump') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(250, now)
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)
    } else if (type === 'ok') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12) // G5
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)
    } else if (type === 'ng') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, now)
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.2)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.2)
    } else if (type === 'bridge') {
      const freqs = [523.25, 659.25, 783.99, 1046.5]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'triangle'
        osc.frequency.value = freq
        const t = now + i * 0.06
        gain.gain.setValueAtTime(0.18, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
        osc.start(t)
        osc.stop(t + 0.2)
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
        gain.gain.setValueAtTime(0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
        osc.start(t)
        osc.stop(t + 0.3)
      })
    }
  } catch {
    /* Autoplay ignore */
  }
}

// ── 수학 문제 구조 ──────────────────────────────────────────────────
export type Difficulty = 'easy' | 'normal' | 'hard'
export type QuestionType = 'typeA' | 'typeB' | 'typeC'

export interface Segment {
  domain: [number, number]
  fn: (x: number) => number
}

export interface GraphData {
  targetX: number
  xDomain: [number, number]
  yDomain: [number, number]
  segments: Segment[]
  holes: { x: number; y: number }[]
  dots: { x: number; y: number }[]
  bridgePoint?: { x: number; y: number }
}

export interface BridgeQuestion {
  id: string
  type: QuestionType
  typeName: string
  exprLatex: string
  targetLatex: string
  questionLatex: string
  questionText: string
  answer: string
  choices: string[]
  choicesLatex: string[]
  explanation: string
  explanationLatex: string
  graphData: GraphData
}

export interface WrongNote {
  q: BridgeQuestion
  userChoice: string
}

const GAME_SECS = 60
const GAME_ID = 'bridge-of-continuity'

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

// ── 문제 생성기 (LaTeX 지수, 극한, 분수 내장) ───────────────────────
function generateBridgeQuestion(difficulty: Difficulty): BridgeQuestion {
  const types: QuestionType[] = ['typeA', 'typeB', 'typeC']
  const selectedType = types[Math.floor(Math.random() * types.length)]
  const id = Math.random().toString(36).substring(2, 9)

  if (selectedType === 'typeA') {
    // ── 유형 A: 좌극한 vs 우극한 판단 (LaTeX 지수 함수 포함) ───────────────
    const targetX = Math.floor(Math.random() * 5) - 2 // -2 ~ 2
    const isLeft = Math.random() > 0.5
    const targetDir = isLeft ? '-' : '+'

    // 난이도가 어려움일 때 지수함수 2^x / 3^x 등장!
    const isExpProblem = difficulty === 'hard' || (difficulty === 'normal' && Math.random() > 0.5)

    let leftY: number, rightY: number
    let exprLatex = ''
    let segLeft: Segment
    let segRight: Segment

    if (isExpProblem && targetX >= 0 && targetX <= 2) {
      // 2^x 지수 표현
      const base = 2
      const offsetL = Math.floor(Math.random() * 3) - 1
      leftY = Math.pow(base, targetX) + offsetL
      rightY = leftY + (Math.random() > 0.5 ? 3 : -3)

      segLeft = {
        domain: [targetX - 4, targetX],
        fn: (x) => Math.pow(base, x) + offsetL,
      }
      segRight = {
        domain: [targetX, targetX + 4],
        fn: (x) => -(x - targetX) + rightY,
      }

      exprLatex = `f(x) = \\begin{cases} 2^x ${offsetL >= 0 ? '+ ' + offsetL : '- ' + Math.abs(offsetL)} & (x < ${targetX}) \\\\ -x + ${rightY + targetX} & (x \\ge ${targetX}) \\end{cases}`
    } else {
      leftY = Math.floor(Math.random() * 5) - 1
      rightY = leftY + (Math.random() > 0.5 ? 2 : -2)
      const m1 = difficulty === 'hard' ? 2 : 1
      const m2 = difficulty === 'hard' ? -1 : 1

      segLeft = {
        domain: [targetX - 4, targetX],
        fn: (x) => m1 * (x - targetX) + leftY,
      }
      segRight = {
        domain: [targetX, targetX + 4],
        fn: (x) => m2 * (x - targetX) + rightY,
      }

      const constL = leftY - m1 * targetX
      const constR = rightY - m2 * targetX
      exprLatex = `f(x) = \\begin{cases} ${m1 === 1 ? '' : m1}x ${constL >= 0 ? '+ ' + constL : '- ' + Math.abs(constL)} & (x < ${targetX}) \\\\ ${m2 === 1 ? '' : m2 === -1 ? '-' : m2}x ${constR >= 0 ? '+ ' + constR : '- ' + Math.abs(constR)} & (x \\ge ${targetX}) \\end{cases}`
    }

    const ansY = isLeft ? leftY : rightY
    const answerStr = `${ansY}`

    const holeOnLeft = isLeft
    const holes = holeOnLeft ? [{ x: targetX, y: leftY }] : [{ x: targetX, y: rightY }]
    const dots = holeOnLeft ? [{ x: targetX, y: rightY }] : [{ x: targetX, y: leftY }]

    const rawChoices = makeUniqueChoices(answerStr, [
      `${ansY + 1}`,
      `${ansY - 1}`,
      `${isLeft ? rightY : leftY}`,
      '0',
      '\\text{존재하지 않음}',
    ])

    const targetLatex = `\\lim_{x \\to ${targetX}^{${targetDir}}} f(x)`
    const questionText = `x → ${targetX}^${targetDir} 방향 접근 시 극한값을 구하세요.`

    return {
      id,
      type: 'typeA',
      typeName: '유형 A: 좌극한 · 우극한 판단',
      exprLatex,
      targetLatex,
      questionLatex: `\\lim_{x \\to ${targetX}^{${targetDir}}} f(x) = ?`,
      questionText,
      answer: answerStr,
      choices: rawChoices,
      choicesLatex: rawChoices,
      explanation: `x → ${targetX}^${targetDir} 방향으로 그래프를 따라 접근할 때 y의 값은 ${ansY}에 수렴합니다. (좌극한 = ${leftY}, 우극한 = ${rightY})`,
      explanationLatex: `\\lim_{x \\to ${targetX}^-} f(x) = ${leftY}, \\quad \\lim_{x \\to ${targetX}^+} f(x) = ${rightY}`,
      graphData: {
        targetX,
        xDomain: [targetX - 3.5, targetX + 3.5],
        yDomain: [Math.min(leftY, rightY) - 3, Math.max(leftY, rightY) + 3],
        segments: [segLeft, segRight],
        holes,
        dots,
      },
    }
  } else if (selectedType === 'typeB') {
    // ── 유형 B: 극한값 존재 여부 판별 (OX) ──────────────────────────
    const targetX = Math.floor(Math.random() * 5) - 2
    const exists = Math.random() > 0.4

    let leftY: number, rightY: number
    if (exists) {
      leftY = Math.floor(Math.random() * 5) - 2
      rightY = leftY
    } else {
      leftY = Math.floor(Math.random() * 4) - 1
      rightY = leftY + (Math.random() > 0.5 ? 3 : -2)
    }

    const answerStr = exists ? 'O (존재함)' : 'X (존재하지 않음)'
    const choices = ['O (존재함)', 'X (존재하지 않음)']

    const segLeft: Segment = {
      domain: [targetX - 4, targetX],
      fn: (x) => (x - targetX) + leftY,
    }
    const segRight: Segment = {
      domain: [targetX, targetX + 4],
      fn: (x) => -(x - targetX) + rightY,
    }

    const holes = [{ x: targetX, y: leftY }]
    const dots = exists ? [{ x: targetX, y: leftY + 2 }] : [{ x: targetX, y: rightY }]

    return {
      id,
      type: 'typeB',
      typeName: '유형 B: 극한값 존재 여부 (OX)',
      exprLatex: `f(x) \\quad (x = ${targetX} \\text{ 근방})`,
      targetLatex: `\\lim_{x \\to ${targetX}} f(x)`,
      questionLatex: `\\lim_{x \\to ${targetX}} f(x) \\text{ 가 존재하는가?}`,
      questionText: `x = ${targetX}에서 극한값이 존재하는지 판별하세요.`,
      answer: answerStr,
      choices,
      choicesLatex: ['O \\text{ (존재함)}', 'X \\text{ (존재하지 않음)}'],
      explanation: exists
        ? `좌극한(${leftY})과 우극한(${leftY})이 일치하므로 극한값이 존재합니다.`
        : `좌극한(${leftY})과 우극한(${rightY})이 다르므로 극한값이 존재하지 않습니다.`,
      explanationLatex: exists
        ? `\\lim_{x \\to ${targetX}^-} f(x) = \\lim_{x \\to ${targetX}^+} f(x) = ${leftY}`
        : `\\lim_{x \\to ${targetX}^-} f(x) = ${leftY} \\neq \\lim_{x \\to ${targetX}^+} f(x) = ${rightY}`,
      graphData: {
        targetX,
        xDomain: [targetX - 3.5, targetX + 3.5],
        yDomain: [Math.min(leftY, rightY) - 3, Math.max(leftY, rightY) + 4],
        segments: [segLeft, segRight],
        holes,
        dots,
      },
    }
  } else {
    // ── 유형 C: 끊어진 다리 잇기 (지수 / 분수식 연속성 완성) ───────────
    const targetX = Math.floor(Math.random() * 5) - 2
    const targetY = Math.floor(Math.random() * 5) - 1

    const isExpType = Math.random() > 0.5
    let exprLatex = ''

    if (isExpType && targetX >= 0) {
      exprLatex = `f(x) = \\begin{cases} 2^{x} ${targetY - Math.pow(2, targetX) >= 0 ? '+ ' + (targetY - Math.pow(2, targetX)) : '- ' + Math.abs(targetY - Math.pow(2, targetX))} & (x \\neq ${targetX}) \\\\ f(${targetX}) & (x = ${targetX}) \\end{cases}`
    } else {
      exprLatex = `f(x) = \\begin{cases} \\frac{x^2 - ${targetX * targetX}}{x - ${targetX}} & (x \\neq ${targetX}) \\\\ f(${targetX}) & (x = ${targetX}) \\end{cases}`
    }

    const answerStr = `${targetY}`

    const segLeft: Segment = {
      domain: [targetX - 4, targetX - 0.001],
      fn: (x) => (x - targetX) + targetY,
    }
    const segRight: Segment = {
      domain: [targetX + 0.001, targetX + 4],
      fn: (x) => (x - targetX) + targetY,
    }

    const rawChoices = makeUniqueChoices(answerStr, [
      `${targetY + 2}`,
      `${targetY - 2}`,
      `${targetX}`,
      '0',
      '-1',
    ])

    return {
      id,
      type: 'typeC',
      typeName: '유형 C: 끊어진 다리 잇기 (연속 조건)',
      exprLatex,
      targetLatex: `x = ${targetX}`,
      questionLatex: `f(${targetX}) = ? \\quad (x = ${targetX} \\text{에서 연속})`,
      questionText: `x = ${targetX}에서 연속이 되도록 다리를 이을 함숫값 f(${targetX})의 구체적인 값은?`,
      answer: answerStr,
      choices: rawChoices,
      choicesLatex: rawChoices,
      explanation: `x = ${targetX}에서 연속이 되려면 함숫값 f(${targetX})가 극한값과 일치해야 끊어진 다리가 메꿔집니다.`,
      explanationLatex: `f(${targetX}) = \\lim_{x \\to ${targetX}} f(x) = ${targetY}`,
      graphData: {
        targetX,
        xDomain: [targetX - 3.5, targetX + 3.5],
        yDomain: [targetY - 3, targetY + 3],
        segments: [segLeft, segRight],
        holes: [{ x: targetX, y: targetY }],
        dots: [],
        bridgePoint: { x: targetX, y: targetY },
      },
    }
  }
}

// ── 2D Canvas Interactive Game Canvas Renderer ───────────────────────
function InteractiveGraphCanvas({
  graphData,
  choices,
  selectedChoice,
  isBridgeConnected,
  laserTargetIdx,
  onTargetClick,
}: {
  graphData: GraphData
  choices: string[]
  selectedChoice: string | null
  isBridgeConnected: boolean
  laserTargetIdx: number | null
  onTargetClick: (choice: string, idx: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)
  const heroXRef = useRef<number>(-3)

  // Target Orb Position on Canvas Screen
  const orbCoordsRef = useRef<{ x: number; y: number; w: number; h: number }[]>([])

  const renderCanvas = useCallback(() => {
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

    const pad = 44
    const [xMin, xMax] = graphData.xDomain
    const [yMin, yMax] = graphData.yDomain

    const scaleX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad)
    const scaleY = (y: number) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad)

    // 1. Dark High-Tech Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, H)
    bgGradient.addColorStop(0, '#020617')
    bgGradient.addColorStop(1, '#0f172a')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, W, H)

    // 2. High-Contrast Grid Lines (Minor & Major)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)'
    ctx.lineWidth = 1
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += 0.5) {
      const cx = scaleX(x)
      ctx.beginPath()
      ctx.moveTo(cx, pad)
      ctx.lineTo(cx, H - pad)
      ctx.stroke()
    }
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += 0.5) {
      const cy = scaleY(y)
      ctx.beginPath()
      ctx.moveTo(pad, cy)
      ctx.lineTo(W - pad, cy)
      ctx.stroke()
    }

    // 3. X and Y Axes with Arrows & Bold Ticks
    const originX = scaleX(0)
    const originY = scaleY(0)

    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2.5

    // X Axis
    if (originY >= pad && originY <= H - pad) {
      ctx.beginPath()
      ctx.moveTo(pad - 10, originY)
      ctx.lineTo(W - pad + 10, originY)
      ctx.stroke()

      // Arrow head right
      ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.moveTo(W - pad + 14, originY)
      ctx.lineTo(W - pad + 6, originY - 5)
      ctx.lineTo(W - pad + 6, originY + 5)
      ctx.fill()

      // X Numbers and Tick Marks
      ctx.font = 'bold 12px monospace'
      for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
        if (x === 0) continue
        const cx = scaleX(x)
        ctx.strokeStyle = '#cbd5e1'
        ctx.beginPath()
        ctx.moveTo(cx, originY - 4)
        ctx.lineTo(cx, originY + 4)
        ctx.stroke()

        // Badge background for text legibility
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
        ctx.fillRect(cx - 10, originY + 8, 20, 14)

        ctx.fillStyle = '#38bdf8'
        ctx.textAlign = 'center'
        ctx.fillText(`${x}`, cx, originY + 19)
      }
      ctx.fillText('x', W - pad + 20, originY + 4)
    }

    // Y Axis
    if (originX >= pad && originX <= W - pad) {
      ctx.beginPath()
      ctx.moveTo(originX, H - pad + 10)
      ctx.lineTo(originX, pad - 10)
      ctx.stroke()

      // Arrow head top
      ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.moveTo(originX, pad - 14)
      ctx.lineTo(originX - 5, pad - 6)
      ctx.lineTo(originX + 5, pad - 6)
      ctx.fill()

      // Y Numbers and Tick Marks
      ctx.font = 'bold 12px monospace'
      for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
        if (y === 0) continue
        const cy = scaleY(y)
        ctx.strokeStyle = '#cbd5e1'
        ctx.beginPath()
        ctx.moveTo(originX - 4, cy)
        ctx.lineTo(originX + 4, cy)
        ctx.stroke()

        // Badge background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
        ctx.fillRect(originX - 26, cy - 7, 20, 14)

        ctx.fillStyle = '#38bdf8'
        ctx.textAlign = 'right'
        ctx.fillText(`${y}`, originX - 9, cy + 4)
      }
      ctx.textAlign = 'center'
      ctx.fillText('y', originX + 12, pad - 14)
    }

    // Origin (0,0) Marker
    if (originX >= pad && originX <= W - pad && originY >= pad && originY <= H - pad) {
      ctx.fillStyle = '#38bdf8'
      ctx.beginPath()
      ctx.arc(originX, originY, 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 11px monospace'
      ctx.fillText('0', originX - 10, originY + 14)
    }

    // 4. Target X Line (Glowing Dashed Line)
    const targetCX = scaleX(graphData.targetX)
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    ctx.moveTo(targetCX, pad)
    ctx.lineTo(targetCX, H - pad)
    ctx.stroke()
    ctx.setLineDash([])

    // Target Line Top Label Badge
    ctx.fillStyle = '#eab308'
    ctx.fillRect(targetCX - 32, pad - 24, 64, 18)
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`x = ${graphData.targetX}`, targetCX, pad - 11)

    // 5. Function Curve Segments
    ctx.lineWidth = 4
    ctx.strokeStyle = '#06b6d4'
    ctx.shadowColor = '#06b6d4'
    ctx.shadowBlur = 8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const seg of graphData.segments) {
      const steps = 100
      const [sMin, sMax] = seg.domain
      const dx = (sMax - sMin) / steps

      ctx.beginPath()
      let started = false
      for (let i = 0; i <= steps; i++) {
        const x = sMin + i * dx
        const y = seg.fn(x)
        if (isFinite(y) && y >= yMin - 10 && y <= yMax + 10) {
          const cx = scaleX(x)
          const cy = scaleY(y)
          if (!started) {
            ctx.moveTo(cx, cy)
            started = true
          } else {
            ctx.lineTo(cx, cy)
          }
        }
      }
      ctx.stroke()
    }
    ctx.shadowBlur = 0 // Reset shadow

    // 6. Draw Holes (∘) and Solid Dots (•)
    for (const hole of graphData.holes) {
      if (isBridgeConnected && graphData.bridgePoint && graphData.bridgePoint.x === hole.x) {
        continue
      }
      const cx = scaleX(hole.x)
      const cy = scaleY(hole.y)

      // Outer Halo Pulse
      ctx.beginPath()
      ctx.arc(cx, cy, 9, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(244, 63, 94, 0.25)'
      ctx.fill()

      // Hole Circle
      ctx.beginPath()
      ctx.arc(cx, cy, 6.5, 0, Math.PI * 2)
      ctx.fillStyle = '#0f172a'
      ctx.fill()
      ctx.strokeStyle = '#f43f5e'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    for (const dot of graphData.dots) {
      const cx = scaleX(dot.x)
      const cy = scaleY(dot.y)
      ctx.beginPath()
      ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#38bdf8'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // 7. Bridge Connected Plasma Beam (Energy Repair Animation)
    if (isBridgeConnected && graphData.bridgePoint) {
      const cx = scaleX(graphData.bridgePoint.x)
      const cy = scaleY(graphData.bridgePoint.y)

      // Expanding Energy Ring
      ctx.beginPath()
      ctx.arc(cx, cy, 18, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.35)'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#22c55e'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Sparkles
      ctx.fillStyle = '#4ade80'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('⚡ BRIDGE CONNECTED!', cx, cy - 26)
    }

    // 8. Math Hero Runner Avatar on Curve
    heroXRef.current += 0.015
    if (heroXRef.current > xMax - 0.5) heroXRef.current = xMin + 0.5

    const hX = heroXRef.current
    let hY = yMin + 1
    // Find segment function for hX
    for (const seg of graphData.segments) {
      if (hX >= seg.domain[0] && hX <= seg.domain[1]) {
        hY = seg.fn(hX)
        break
      }
    }

    const heroCX = scaleX(hX)
    const heroCY = scaleY(hY)

    // Draw Hero Sprite (Energy Orb / Jumper)
    ctx.shadowColor = '#38bdf8'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(heroCX, heroCY, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#38bdf8'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.shadowBlur = 0

    // Hero Character Eyes
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.arc(heroCX + 2, heroCY - 2, 2, 0, Math.PI * 2)
    ctx.fill()

    // 9. Floating Answer Target Orbs (Shooting Targets 1 ~ 4)
    const coords: { x: number; y: number; w: number; h: number }[] = []
    const orbY = pad + 32
    const totalOrbWidth = W - 2 * pad
    const orbGap = totalOrbWidth / Math.max(choices.length, 1)

    choices.forEach((choiceText, idx) => {
      const orbX = pad + orbGap * idx + orbGap / 2
      const isTargeted = laserTargetIdx === idx
      const isChosen = selectedChoice === choiceText

      const orbWidth = Math.min(orbGap - 12, 110)
      const orbHeight = 36
      const drawX = orbX - orbWidth / 2
      const drawY = orbY - orbHeight / 2

      coords.push({ x: drawX, y: drawY, w: orbWidth, h: orbHeight })

      // Laser Beam firing from Hero to Target Orb!
      if (isTargeted) {
        ctx.strokeStyle = '#f43f5e'
        ctx.lineWidth = 4
        ctx.shadowColor = '#f43f5e'
        ctx.shadowBlur = 14
        ctx.beginPath()
        ctx.moveTo(heroCX, heroCY)
        ctx.lineTo(orbX, orbY)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Orb Card Container
      ctx.fillStyle = isChosen
        ? '#0284c7'
        : isTargeted
        ? '#e11d48'
        : 'rgba(15, 23, 42, 0.92)'
      ctx.strokeStyle = isChosen ? '#38bdf8' : isTargeted ? '#fda4af' : '#334155'
      ctx.lineWidth = isTargeted || isChosen ? 2.5 : 1.5

      ctx.beginPath()
      ctx.roundRect(drawX, drawY, orbWidth, orbHeight, 10)
      ctx.fill()
      ctx.stroke()

      // Target Number Badge
      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 12px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`[${idx + 1}]`, drawX + 8, drawY + 22)

      // Choice Answer Text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(choiceText, orbX + 8, drawY + 22)
    })

    orbCoordsRef.current = coords

    // Request next animation frame
    animRef.current = requestAnimationFrame(renderCanvas)
  }, [graphData, choices, selectedChoice, isBridgeConnected, laserTargetIdx])

  useEffect(() => {
    animRef.current = requestAnimationFrame(renderCanvas)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [renderCanvas])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    orbCoordsRef.current.forEach((coord, idx) => {
      if (
        clickX >= coord.x &&
        clickX <= coord.x + coord.w &&
        clickY >= coord.y &&
        clickY <= coord.y + coord.h
      ) {
        onTargetClick(choices[idx], idx)
      }
    })
  }

  return (
    <div className="w-full h-[400px] sm:h-[460px] rounded-3xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950 relative group">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full block cursor-crosshair"
      />
      <div className="absolute top-3 left-4 text-xs font-mono font-bold text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700 pointer-events-none flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>🎯 Target Laser Crosshair System</span>
      </div>
      <div className="absolute bottom-3 right-4 text-[11px] font-mono text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800 pointer-events-none">
        타겟 구체를 직접 클릭하거나 1~4 키로 레이저 발사!
      </div>
    </div>
  )
}

// ── 연속의 다리 메인 컴포넌트 ─────────────────────────────────────────
export default function ContinuityBridgeGame({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')

  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')

  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_SECS)

  const [currentQ, setCurrentQ] = useState<BridgeQuestion>(generateBridgeQuestion('normal'))
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([])
  const [flash, setFlash] = useState<'ok' | 'ng' | null>(null)
  const [isBridgeAnim, setIsBridgeAnim] = useState(false)
  const [laserIdx, setLaserIdx] = useState<number | null>(null)

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
      setNameErr(status.msg ?? '도전을 시작할 수 없습니다.')
      return
    }

    setNameErr('')
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
    setCurrentQ(generateBridgeQuestion(difficulty))
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

  // ── 정답 및 슈팅 처리 ──────────────────────────────────────────────
  const handleChoice = useCallback(
    (choice: string, choiceIdx?: number) => {
      if (phaseRef.current !== 'playing') return

      const idx = choiceIdx ?? currentQ.choices.indexOf(choice)
      setLaserIdx(idx >= 0 ? idx : 0)
      playAudioSound('laser')

      const isOk = choice === currentQ.answer
      setTotalCount((t) => t + 1)

      if (isOk) {
        setTimeout(() => {
          playAudioSound(currentQ.type === 'typeC' ? 'bridge' : 'ok')
          setFlash('ok')
          setIsBridgeAnim(true)
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
        setTimeout(() => {
          playAudioSound('ng')
          setFlash('ng')
        }, 120)
        comboRef.current = 0
        setCombo(0)
        setWrongNotes((prev) => [...prev, { q: currentQ, userChoice: choice }])
      }

      setTimeout(() => {
        setLaserIdx(null)
        setFlash(null)
        setIsBridgeAnim(false)
        setCurrentQ(generateBridgeQuestion(difficulty))
      }, 400)
    },
    [currentQ, difficulty]
  )

  // ── 키보드 컨트롤 (1~4 키, O/X 키, Space Jump/Shoot) ─────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return
      const key = e.key.toLowerCase()

      if (currentQ.type === 'typeB') {
        if (key === 'o' || key === '1') handleChoice('O (존재함)', 0)
        if (key === 'x' || key === '2') handleChoice('X (존재하지 않음)', 1)
      } else {
        if (key === '1' && currentQ.choices[0]) handleChoice(currentQ.choices[0], 0)
        if (key === '2' && currentQ.choices[1]) handleChoice(currentQ.choices[1], 1)
        if (key === '3' && currentQ.choices[2]) handleChoice(currentQ.choices[2], 2)
        if (key === '4' && currentQ.choices[3]) handleChoice(currentQ.choices[3], 3)
      }
      if (key === ' ' || key === 'arrowup') {
        playAudioSound('jump')
      }
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
              <span className="text-3xl">🌉</span>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  연속의 다리 (Bridge of Continuity)
                </h2>
                <p className="text-xs text-cyan-400 font-mono mt-0.5">
                  Laser Aim & Shoot Arcade Math Game
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              함수 <MathView math="y = f(x)" inline />의 좌표평면 위 끊어진 불연속 지점을 파악하고, 레이저로 타겟 수식 구체를 격파하여 끊어진 다리를 에너지 빔으로 완성하세요!
            </p>
          </div>

          {/* 게임 규칙 안내 */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs">
            <p className="font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>🎮 조작법 & 슈팅 메카닉</span>
              <span className="text-[10px] text-slate-400">제한시간 60초</span>
            </p>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold">1~4 / 클릭</span>
                <span>화면의 타겟 구체 1~4번을 키보드 번호키 또는 직접 터치/클릭하여 레이저 발사</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">LaTeX 수식</span>
                <span className="flex items-center gap-1 flex-wrap">지수 <MathView math="2^x" inline />, 극한 <MathView math="\lim_{x \to a^-} f(x)" inline />, 분수 등 자연스러운 교과서 수식 제공</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">좌표평면</span>
                <span>고대비 X축, Y축 눈금 및 숫자가 또렷하게 표시된 대형 캔버스 지원</span>
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
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-[1.02]'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {d === 'easy' ? '🌱 쉬움' : d === 'normal' ? '⚡ 보통' : '🔥 어려움 (지수포함)'}
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
            {!playStatus.canPlay ? (playStatus.msg || '도전을 시작할 수 없습니다') : `🎯 슈팅 다리 잇기 시작 (60초)`}
          </button>
        </div>

        {/* Supabase 랭킹 */}
        <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. 플레이 화면 (LaTeX + 캔버스 타겟 슈팅 + 컨트롤 바)
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'playing') {
    return (
      <div className="space-y-4 max-w-4xl w-full mx-auto">
        {/* 상단 정보바 */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-5 py-3.5 rounded-2xl text-slate-100 shadow-md">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-cyan-400">#{name}</span>
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

        {/* 대형 2D 그래프 캔버스 (타겟 슈팅 포함) */}
        <InteractiveGraphCanvas
          graphData={currentQ.graphData}
          choices={currentQ.choices}
          selectedChoice={null}
          isBridgeConnected={isBridgeAnim}
          laserTargetIdx={laserIdx}
          onTargetClick={(c, idx) => handleChoice(c, idx)}
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
            <span className="font-bold text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800">
              {currentQ.typeName}
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
              <MathView math={currentQ.questionLatex} inline className="text-lg font-bold text-cyan-300" />
            </div>
          </div>

          <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-center">
            <MathView math={currentQ.exprLatex} className="text-slate-200" />
          </div>
        </div>

        {/* 하단 아케이드 슈팅 컨트롤러 버튼 (1~4번 조준 발사) */}
        {currentQ.type === 'typeB' ? (
          <div className="grid grid-cols-2 gap-4">
            {currentQ.choices.map((c, i) => (
              <button
                key={i}
                onClick={() => handleChoice(c, i)}
                className={`py-4 border rounded-2xl text-lg font-bold transition-all shadow-lg ${
                  c.startsWith('O')
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 active:scale-95'
                    : 'border-rose-500/50 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 active:scale-95'
                }`}
              >
                <div className="text-2xl font-black flex items-center justify-center gap-2">
                  <span>{c.startsWith('O') ? '⭕' : '❌'}</span>
                  <MathView math={currentQ.choicesLatex[i]} inline />
                </div>
                <span className="text-xs text-slate-400 block mt-1">키보드: {c.startsWith('O') ? 'O 또는 1' : 'X 또는 2'}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {currentQ.choices.map((c, i) => (
              <button
                key={i}
                onClick={() => handleChoice(c, i)}
                className="py-4 px-3 border border-slate-700 bg-slate-900 rounded-2xl text-white hover:border-cyan-400 hover:bg-slate-800 active:scale-95 transition-all shadow-md flex flex-col items-center justify-center gap-1 group"
              >
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 flex items-center justify-center rounded-lg bg-slate-800 text-xs text-cyan-400 font-mono group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                    {i + 1}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">LASER #{i + 1}</span>
                </div>
                <MathView math={c} inline className="text-lg font-black text-cyan-300" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. 종료 화면 (결과 + 오답 노트 + DB 랭킹)
  // ─────────────────────────────────────────────────────────────────
  const accuracy = totalCount > 0 ? Math.round((correct / totalCount) * 100) : 0

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span>🎉 연속의 다리 미션 완료!</span>
            </h2>
            <p className="text-sm font-mono text-cyan-400 mt-1">학번/PIN: #{name}</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
            {difficulty === 'easy' ? '쉬움' : difficulty === 'normal' ? '보통' : '어려움'}
          </span>
        </div>

        {/* 탭 구분 (결과 및 랭킹 vs 오답 노트) */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <button
            onClick={() => setResultTab('score')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              resultTab === 'score'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            📊 결과 통계
          </button>
          <button
            onClick={() => setResultTab('wrong')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              resultTab === 'wrong'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            📝 오답 노트 ({wrongNotes.length}개)
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
                <div className="text-xs text-slate-400">정답 수</div>
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

        {/* ── 탭 2: 오답 노트 (LaTeX 렌더링 내장) ────────────────────── */}
        {resultTab === 'wrong' && (
          <div className="space-y-4">
            {wrongNotes.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                <p>🎉 모든 문제를 정답 타격하였습니다! 오답이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {wrongNotes.map((wn, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span>Q{idx + 1}. {wn.q.typeName}</span>
                      <MathView math={wn.q.targetLatex} inline className="text-cyan-400" />
                    </div>
                    <p className="text-slate-300 font-semibold">{wn.q.questionText}</p>
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex justify-center">
                      <MathView math={wn.q.exprLatex} />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="px-3 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold rounded-lg flex items-center gap-1">
                        선택한 답: <MathView math={wn.userChoice} inline />
                      </span>
                      <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold rounded-lg flex items-center gap-1">
                        정답: <MathView math={wn.q.answer} inline />
                      </span>
                    </div>
                    <div className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-800 text-slate-300 leading-relaxed">
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
