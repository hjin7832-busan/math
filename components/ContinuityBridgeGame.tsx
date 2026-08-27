'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  validateNumericName,
  submitScore,
  getUserDailyPlayStatus,
  MAX_DAILY_PLAY_COUNT,
} from '@/lib/leaderboardManager'
import GameLeaderboard from './GameLeaderboard'

// ── Web Audio API Sound Synthesizer ───────────────────────────────
function playAudioSound(type: 'ok' | 'ng' | 'bridge' | 'end') {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const now = ctx.currentTime

    if (type === 'ok') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12) // G5
      gain.gain.setValueAtTime(0.18, now)
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
      // 다리 연결 특별 사운드 (3음 아르페지오)
      const freqs = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'triangle'
        osc.frequency.value = freq
        const t = now + i * 0.06
        gain.gain.setValueAtTime(0.15, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
        osc.start(t)
        osc.stop(t + 0.2)
      })
    } else {
      // 게임 완료 엔딩음
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
    /* 자동재생 차단 무시 */
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
  expr: string
  targetText: string
  questionText: string
  answer: string
  choices: string[]
  explanation: string
  graphData: GraphData
}

export interface WrongNote {
  q: BridgeQuestion
  userChoice: string
}

const GAME_SECS = 60
const GAME_ID = 'bridge-of-continuity'

// ── 문제 생성을 위한 유틸 ──────────────────────────────────────────
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

// ── 문제 생성기 (Easy / Normal / Hard) ──────────────────────────────
function generateBridgeQuestion(difficulty: Difficulty): BridgeQuestion {
  const types: QuestionType[] = ['typeA', 'typeB', 'typeC']
  const selectedType = types[Math.floor(Math.random() * types.length)]
  const id = Math.random().toString(36).substring(2, 9)

  if (selectedType === 'typeA') {
    // ── 유형 A: 좌극한 vs 우극한 맞히기 (그래프형) ─────────────────────
    const targetX = Math.floor(Math.random() * 5) - 2 // -2 ~ 2
    const isLeft = Math.random() > 0.5
    const targetDir = isLeft ? '-' : '+'

    // 계단형 단차 생성
    const leftY = Math.floor(Math.random() * 5) - 1  // e.g. 1
    const rightY = leftY + (Math.random() > 0.5 ? 2 : -2) // e.g. 3 or -1

    const ansY = isLeft ? leftY : rightY
    const answerStr = `${ansY}`

    const m1 = difficulty === 'hard' ? 2 : 1
    const m2 = difficulty === 'hard' ? -1 : 1

    const segLeft: Segment = {
      domain: [targetX - 4, targetX],
      fn: (x) => m1 * (x - targetX) + leftY,
    }
    const segRight: Segment = {
      domain: [targetX, targetX + 4],
      fn: (x) => m2 * (x - targetX) + rightY,
    }

    const holeOnLeft = isLeft
    const holes = holeOnLeft
      ? [{ x: targetX, y: leftY }]
      : [{ x: targetX, y: rightY }]
    const dots = holeOnLeft
      ? [{ x: targetX, y: rightY }]
      : [{ x: targetX, y: leftY }]

    const choices = makeUniqueChoices(answerStr, [
      `${ansY + 1}`,
      `${ansY - 1}`,
      `${isLeft ? rightY : leftY}`,
      '0',
      '존재하지 않음',
    ])

    return {
      id,
      type: 'typeA',
      typeName: '유형 A: 좌극한 · 우극한 판단',
      expr: `f(x) = \\begin{cases} ${m1 === 1 ? '' : m1}x ${leftY - m1 * targetX >= 0 ? '+ ' + (leftY - m1 * targetX) : '- ' + Math.abs(leftY - m1 * targetX)} & (x < ${targetX}) \\\\ ${m2 === 1 ? '' : m2 === -1 ? '-' : m2}x ${rightY - m2 * targetX >= 0 ? '+ ' + (rightY - m2 * targetX) : '- ' + Math.abs(rightY - m2 * targetX)} & (x \\ge ${targetX}) \\end{cases}`,
      targetText: `x → ${targetX}^${targetDir}`,
      questionText: `x → ${targetX}^${targetDir} 일 때의 극한값 lim_{x → ${targetX}^${targetDir}} f(x) 는?`,
      answer: answerStr,
      choices,
      explanation: `x → ${targetX}^${targetDir} 방향에서 그래프를 따라 접근할 때 y의 값은 ${ansY}에 수렴합니다. (좌극한 = ${leftY}, 우극한 = ${rightY})`,
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
    const exists = Math.random() > 0.4 // 60% 확률로 존재 또는 존재하지 않음

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

    const holes = exists ? [{ x: targetX, y: leftY }] : [{ x: targetX, y: leftY }]
    const dots = exists ? [{ x: targetX, y: leftY + 2 }] : [{ x: targetX, y: rightY }]

    return {
      id,
      type: 'typeB',
      typeName: '유형 B: 극한값 존재 여부 (OX)',
      expr: `x = ${targetX} 근방에서 정의된 함수 f(x)`,
      targetText: `x → ${targetX}`,
      questionText: `x → ${targetX} 일 때, 극한값 lim_{x → ${targetX}} f(x) 가 존재하는가?`,
      answer: answerStr,
      choices,
      explanation: exists
        ? `좌극한(${leftY})과 우극한(${leftY})이 같으므로 lim_{x → ${targetX}} f(x) = ${leftY} 로 존재합니다.`
        : `좌극한(${leftY})과 우극한(${rightY})이 다르므로(좌극한 ≠ 우극한) 극한값이 존재하지 않습니다.`,
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
    // ── 유형 C: 끊어진 다리 잇기 (연속성 조건 완성) ──────────────────
    const targetX = Math.floor(Math.random() * 5) - 2
    const targetY = Math.floor(Math.random() * 5) - 1 // 연속이 되기 위한 극한값

    const answerStr = `${targetY}`

    const segLeft: Segment = {
      domain: [targetX - 4, targetX - 0.001],
      fn: (x) => (x - targetX) + targetY,
    }
    const segRight: Segment = {
      domain: [targetX + 0.001, targetX + 4],
      fn: (x) => (x - targetX) + targetY,
    }

    const choices = makeUniqueChoices(answerStr, [
      `${targetY + 2}`,
      `${targetY - 2}`,
      `${targetX}`,
      '0',
      'undefined',
    ])

    return {
      id,
      type: 'typeC',
      typeName: '유형 C: 끊어진 다리 잇기 (연속 조건)',
      expr: `f(x) = \\begin{cases} \\frac{x^2 - ${targetX * targetX}}{x - ${targetX}} & (x \\neq ${targetX}) \\\\ f(${targetX}) & (x = ${targetX}) \\end{cases}`,
      targetText: `x = ${targetX}`,
      questionText: `x = ${targetX}에서 함수 f(x)가 연속이 되도록 다리를 이을 함숫값 f(${targetX})의 값은?`,
      answer: answerStr,
      choices,
      explanation: `x = ${targetX}에서 연속이 되려면 함숫값 f(${targetX})가 극한값 lim_{x → ${targetX}} f(x) = ${targetY} 와 같아야 끊어진 다리가 채워집니다.`,
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

// ── Canvas 그래프 렌더러 컴포넌트 ───────────────────────────────────
function GraphCanvas({
  graphData,
  isBridgeConnected,
}: {
  graphData: GraphData
  isBridgeConnected: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawGraph = useCallback(() => {
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

    const pad = 36
    const [xMin, xMax] = graphData.xDomain
    const [yMin, yMax] = graphData.yDomain

    const scaleX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad)
    const scaleY = (y: number) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad)

    // 배경
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)

    // Grid lines
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      const cx = scaleX(x)
      ctx.beginPath()
      ctx.moveTo(cx, pad)
      ctx.lineTo(cx, H - pad)
      ctx.stroke()
    }
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
      const cy = scaleY(y)
      ctx.beginPath()
      ctx.moveTo(pad, cy)
      ctx.lineTo(W - pad, cy)
      ctx.stroke()
    }

    // X, Y Coordinate Axes
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1.5

    const originX = scaleX(0)
    const originY = scaleY(0)

    if (originY >= pad && originY <= H - pad) {
      ctx.beginPath()
      ctx.moveTo(pad, originY)
      ctx.lineTo(W - pad, originY)
      ctx.stroke()
    }
    if (originX >= pad && originX <= W - pad) {
      ctx.beginPath()
      ctx.moveTo(originX, pad)
      ctx.lineTo(originX, H - pad)
      ctx.stroke()
    }

    // Target X Line (Dashed)
    const targetCX = scaleX(graphData.targetX)
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(targetCX, pad)
    ctx.lineTo(targetCX, H - pad)
    ctx.stroke()
    ctx.setLineDash([])

    // Label Target X
    ctx.fillStyle = '#eab308'
    ctx.font = 'bold 11px monospace'
    ctx.fillText(`x = ${graphData.targetX}`, targetCX + 4, pad + 12)

    // Plot Segments
    ctx.lineWidth = 3
    ctx.strokeStyle = '#38bdf8'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const seg of graphData.segments) {
      const steps = 80
      const [sMin, sMax] = seg.domain
      const dx = (sMax - sMin) / steps

      ctx.beginPath()
      let started = false
      for (let i = 0; i <= steps; i++) {
        const x = sMin + i * dx
        const y = seg.fn(x)
        if (isFinite(y) && y >= yMin - 5 && y <= yMax + 5) {
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

    // Draw Open Circles (Holes ∘)
    for (const hole of graphData.holes) {
      if (isBridgeConnected && graphData.bridgePoint && graphData.bridgePoint.x === hole.x) {
        continue
      }
      const cx = scaleX(hole.x)
      const cy = scaleY(hole.y)
      ctx.beginPath()
      ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#0f172a'
      ctx.fill()
      ctx.strokeStyle = '#f43f5e'
      ctx.lineWidth = 2.5
      ctx.stroke()
    }

    // Draw Defined Solid Dots (•)
    for (const dot of graphData.dots) {
      const cx = scaleX(dot.x)
      const cy = scaleY(dot.y)
      ctx.beginPath()
      ctx.arc(cx, cy, 5.5, 0, Math.PI * 2)
      ctx.fillStyle = '#38bdf8'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // 🌟 Bridge Connected Glow Animation Effect
    if (isBridgeConnected && graphData.bridgePoint) {
      const cx = scaleX(graphData.bridgePoint.x)
      const cy = scaleY(graphData.bridgePoint.y)

      ctx.beginPath()
      ctx.arc(cx, cy, 14, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(cx, cy, 7, 0, Math.PI * 2)
      ctx.fillStyle = '#22c55e'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#4ade80'
      ctx.font = 'bold 12px monospace'
      ctx.fillText('✨ Bridge Connected!', cx - 55, cy - 20)
    }
  }, [graphData, isBridgeConnected])

  useEffect(() => {
    drawGraph()
  }, [drawGraph])

  return (
    <div className="w-full h-56 sm:h-64 rounded-2xl overflow-hidden border border-slate-700 shadow-inner bg-slate-900 relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-2 left-3 text-[11px] font-mono text-slate-400 pointer-events-none">
        y = f(x) Graph
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

  // ── 정답 제출 처리 ──────────────────────────────────────────────────
  const handleChoice = useCallback((choice: string) => {
    if (phaseRef.current !== 'playing') return

    const isOk = choice === currentQ.answer
    setTotalCount((t) => t + 1)

    if (isOk) {
      playAudioSound(currentQ.type === 'typeC' ? 'bridge' : 'ok')
      setFlash('ok')
      setIsBridgeAnim(true)

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
      playAudioSound('ng')
      setFlash('ng')
      comboRef.current = 0
      setCombo(0)

      // 오답 노트 추가
      setWrongNotes((prev) => [...prev, { q: currentQ, userChoice: choice }])
    }

    setTimeout(() => {
      setFlash(null)
      setIsBridgeAnim(false)
      setCurrentQ(generateBridgeQuestion(difficulty))
    }, 350)
  }, [currentQ, difficulty])

  // ── 키보드 단축키 지원 (1~4번, O/X 키) ──────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return
      const key = e.key.toLowerCase()

      if (currentQ.type === 'typeB') {
        if (key === 'o' || key === '1') handleChoice('O (존재함)')
        if (key === 'x' || key === '2') handleChoice('X (존재하지 않음)')
      } else {
        if (key === '1' && currentQ.choices[0]) handleChoice(currentQ.choices[0])
        if (key === '2' && currentQ.choices[1]) handleChoice(currentQ.choices[1])
        if (key === '3' && currentQ.choices[2]) handleChoice(currentQ.choices[2])
        if (key === '4' && currentQ.choices[3]) handleChoice(currentQ.choices[3])
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
      <div className="space-y-8 max-w-lg mx-auto">
        <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌉</span>
              <h2 className="text-xl font-bold text-gray-900">
                연속의 다리 (Bridge of Continuity)
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              함수의 그래프에서 끊어진 지점(불연속점)을 발견하고, 좌극한·우극한 및 함숫값을 비교하여 연속 함수를 완성하세요!
            </p>
          </div>

          {/* 게임 규칙 요약 카키 */}
          <div className="p-4 bg-slate-900 text-slate-200 rounded-xl space-y-2 text-xs">
            <p className="font-bold text-indigo-400 border-b border-slate-700 pb-1.5 flex items-center justify-between">
              <span>🎮 게임 방식 & 단축키</span>
              <span className="text-[10px] text-slate-400">제한시간 60초</span>
            </p>
            <ul className="space-y-1 text-slate-300">
              <li>• <span className="text-emerald-400 font-bold">유형 A</span>: 그래프 좌/우극한 값 구하기 (숫자 1~4)</li>
              <li>• <span className="text-amber-400 font-bold">유형 B</span>: 극한값 존재 여부 판정 (키보드 <code className="bg-slate-800 px-1 rounded text-amber-300">O</code> / <code className="bg-slate-800 px-1 rounded text-amber-300">X</code>)</li>
              <li>• <span className="text-sky-400 font-bold">유형 C</span>: 끊어진 다리를 잇는 연속 함숫값 f(a) 채우기</li>
            </ul>
          </div>

          {/* 난이도 선택 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500">난이도 선택</label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    difficulty === d
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {d === 'easy' ? '🌱 쉬움' : d === 'normal' ? '⚡ 보통' : '🔥 어려움'}
                </button>
              ))}
            </div>
          </div>

          {/* 학번 / PIN 번호 입력 */}
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
            {!playStatus.canPlay ? (playStatus.msg || '도전을 시작할 수 없습니다') : `다리 잇기 게임 시작 (60초)`}
          </button>
        </div>

        {/* Supabase 랭킹 & 명예의 전당 */}
        <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. 플레이 화면 (그래프 + 스피드 퀴즈 + 타이머)
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'playing') {
    return (
      <div className="space-y-4 max-w-md w-full mx-auto">
        {/* 상단 정보바 */}
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-100 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-gray-500">#{name}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
              {difficulty === 'easy' ? '쉬움' : difficulty === 'normal' ? '보통' : '어려움'}
            </span>
          </div>
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

        {/* 제한시간 프로그레스바 */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft <= 10 ? 'bg-red-500' : 'bg-indigo-600'
            }`}
            style={{ width: `${(timeLeft / GAME_SECS) * 100}%` }}
          />
        </div>

        {/* 콤보 표시 */}
        <div className="h-5 flex items-center justify-center">
          {combo > 1 && (
            <span className="text-xs font-bold text-orange-500 tracking-wider animate-bounce">
              ⚡ {combo} COMBO! (+{30 * combo}점 추가)
            </span>
          )}
        </div>

        {/* Canvas 수학 그래프 */}
        <GraphCanvas graphData={currentQ.graphData} isBridgeConnected={isBridgeAnim} />

        {/* 문제 제시 카드 */}
        <div
          className={`p-4 border rounded-2xl transition-all ${
            flash === 'ok'
              ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-400'
              : flash === 'ng'
              ? 'border-red-300 bg-red-50 animate-shake'
              : 'border-gray-100 bg-white shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-indigo-600">{currentQ.typeName}</span>
            <span className="font-mono text-gray-400">목표: {currentQ.targetText}</span>
          </div>
          <p className="text-base font-extrabold text-gray-900 leading-snug">
            {currentQ.questionText}
          </p>
          <div className="mt-2 text-xs font-mono text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
            {currentQ.expr}
          </div>
        </div>

        {/* 보기 버튼 / 선택지 (키보드 1~4 / OX 키 지원) */}
        {currentQ.type === 'typeB' ? (
          <div className="grid grid-cols-2 gap-3">
            {currentQ.choices.map((c, i) => (
              <button
                key={i}
                onClick={() => handleChoice(c)}
                className={`py-4 border rounded-2xl text-lg font-bold transition-all shadow-sm ${
                  c.startsWith('O')
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 active:scale-95'
                    : 'border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100 hover:border-rose-400 active:scale-95'
                }`}
              >
                <div className="text-2xl font-black">{c.startsWith('O') ? '⭕ O' : '❌ X'}</div>
                <div className="text-xs font-semibold mt-1">({c.startsWith('O') ? '존재함' : '존재하지 않음'})</div>
                <span className="text-[10px] text-gray-400 block mt-1">키보드: {c.startsWith('O') ? 'O 또는 1' : 'X 또는 2'}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {currentQ.choices.map((c, i) => (
              <button
                key={i}
                onClick={() => handleChoice(c)}
                className="py-3.5 px-3 border border-gray-200 bg-white rounded-2xl text-lg font-mono font-bold text-gray-800 hover:border-gray-900 hover:bg-gray-50 active:scale-95 transition-all shadow-sm flex items-center justify-between"
              >
                <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500 font-sans">
                  {i + 1}
                </span>
                <span className="flex-1 text-center font-extrabold">{c}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. 종료 화면 (최종 점수 + 정답률 + 오답 노트 + DB 순위표)
  // ─────────────────────────────────────────────────────────────────
  const accuracy = totalCount > 0 ? Math.round((correct / totalCount) * 100) : 0

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">🎉 연속의 다리 완성!</h2>
            <p className="text-sm font-mono text-gray-400">학번/PIN: #{name}</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
            {difficulty === 'easy' ? '쉬움' : difficulty === 'normal' ? '보통' : '어려움'}
          </span>
        </div>

        {/* 탭 구분 (결과 및 랭킹 vs 오답 노트) */}
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <button
            onClick={() => setResultTab('score')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              resultTab === 'score'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📊 결과 통계
          </button>
          <button
            onClick={() => setResultTab('wrong')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              resultTab === 'wrong'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📝 오답 노트 ({wrongNotes.length}개)
          </button>
        </div>

        {/* ── 탭 1: 결과 통계 ────────────────────────────────────────── */}
        {resultTab === 'score' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="py-3 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="text-[11px] text-gray-400">최종 점수</div>
                <div className="text-lg font-extrabold font-mono text-indigo-600 mt-0.5">{score}점</div>
              </div>
              <div className="py-3 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="text-[11px] text-gray-400">정답 수</div>
                <div className="text-lg font-bold font-mono text-gray-900 mt-0.5">{correct}/{totalCount}</div>
              </div>
              <div className="py-3 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="text-[11px] text-gray-400">정답률</div>
                <div className="text-lg font-bold font-mono text-emerald-600 mt-0.5">{accuracy}%</div>
              </div>
              <div className="py-3 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="text-[11px] text-gray-400">최대 콤보</div>
                <div className="text-lg font-bold font-mono text-orange-500 mt-0.5">{maxCombo}×</div>
              </div>
            </div>

            {resultMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-700">
                {resultMsg}
              </div>
            )}
          </div>
        )}

        {/* ── 탭 2: 오답 노트 ────────────────────────────────────────── */}
        {resultTab === 'wrong' && (
          <div className="space-y-4">
            {wrongNotes.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 space-y-1">
                <p>🎉 모든 문제를 맞추셨습니다! 오답이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {wrongNotes.map((wn, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Q{idx + 1}. {wn.q.typeName}</span>
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {wn.q.targetText}
                      </span>
                    </div>
                    <p className="text-slate-700 font-semibold">{wn.q.questionText}</p>
                    <div className="font-mono text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200">
                      {wn.q.expr}
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="px-2.5 py-1 bg-red-100 text-red-700 font-bold rounded-md">
                        내가 선택한 답: {wn.userChoice}
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-md">
                        정답: {wn.q.answer}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 bg-emerald-50/60 p-2 rounded border border-emerald-100 mt-1 leading-relaxed">
                      💡 <strong>풀이 해설:</strong> {wn.q.explanation}
                    </p>
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
          className="w-full py-3 bg-gray-900 text-white font-semibold text-sm rounded-xl hover:bg-gray-800 transition-colors"
        >
          다시 도전하기
        </button>
      </div>

      {/* DB 순위표 */}
      <GameLeaderboard gameId={GAME_ID} refreshTrigger={refreshTrigger} />
    </div>
  )
}
