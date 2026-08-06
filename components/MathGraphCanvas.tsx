'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { evaluate } from 'mathjs'

// ── 수학 함수 프리셋 ──────────────────────────────────────────────
type FnType = 'cartesian' | 'parametric' | 'polar'

interface MathFn {
  name: string
  formula: string
  type: FnType
  domain: [number, number]
  cartesian?: (x: number) => number
  parametric?: (t: number) => { x: number; y: number }
  polar?: (theta: number) => number
}

const PRESETS: MathFn[] = [
  {
    name: '하트 곡선',
    formula: 'x(t)=16sin³t, y(t)=13cost−5cos2t−2cos3t−cos4t',
    type: 'parametric',
    domain: [0, 2 * Math.PI],
    parametric: (t) => ({
      x: 16 * Math.pow(Math.sin(t), 3),
      y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
    }),
  },
  {
    name: '8엽 장미 곡선',
    formula: 'r = cos(4θ)',
    type: 'polar',
    domain: [0, 2 * Math.PI],
    polar: (theta) => Math.cos(4 * theta),
  },
  {
    name: '감쇠 사인파',
    formula: 'y = e^(−0.15x) · sin(3x)',
    type: 'cartesian',
    domain: [-1, 4 * Math.PI],
    cartesian: (x) => Math.exp(-0.15 * x) * Math.sin(3 * x),
  },
  {
    name: '리사주 3:4',
    formula: 'x(t)=sin3t, y(t)=sin4t',
    type: 'parametric',
    domain: [0, 2 * Math.PI],
    parametric: (t) => ({ x: Math.sin(3 * t), y: Math.sin(4 * t) }),
  },
  {
    name: '나비 곡선',
    formula: 'r = e^sinθ − 2cos4θ + sin⁵((2θ−π)/24)',
    type: 'polar',
    domain: [0, 12 * Math.PI],
    polar: (theta) =>
      Math.exp(Math.sin(theta)) -
      2 * Math.cos(4 * theta) +
      Math.pow(Math.sin((2 * theta - Math.PI) / 24), 5),
  },
  {
    name: '3차 극값 함수',
    formula: 'y = x³ − 3x',
    type: 'cartesian',
    domain: [-2.5, 2.5],
    cartesian: (x) => x * x * x - 3 * x,
  },
  {
    name: '진동 증폭',
    formula: 'y = sin(x) · x',
    type: 'cartesian',
    domain: [-4 * Math.PI, 4 * Math.PI],
    cartesian: (x) => Math.sin(x) * x,
  },
  {
    name: '싱크 변형',
    formula: 'y = sin(2x) / (1 + 0.1x²)',
    type: 'cartesian',
    domain: [-4 * Math.PI, 4 * Math.PI],
    cartesian: (x) => Math.sin(2 * x) / (1 + 0.1 * x * x),
  },
]

// ── 색상 팔레트 ───────────────────────────────────────────────────
const COLORS = [
  '#e11d48', '#7c3aed', '#0ea5e9', '#059669', '#d97706', '#db2777'
]

function computePoints(fn: MathFn): { x: number; y: number }[] {
  const N = 600
  const [min, max] = fn.domain
  const step = (max - min) / N
  const pts: { x: number; y: number }[] = []

  if (fn.type === 'cartesian' && fn.cartesian) {
    for (let i = 0; i <= N; i++) {
      const xv = min + i * step
      const yv = fn.cartesian(xv)
      if (isFinite(yv)) pts.push({ x: xv, y: yv })
    }
  } else if (fn.type === 'parametric' && fn.parametric) {
    for (let i = 0; i <= N; i++) {
      const t = min + i * step
      pts.push(fn.parametric(t))
    }
  } else if (fn.type === 'polar' && fn.polar) {
    for (let i = 0; i <= N; i++) {
      const theta = min + i * step
      const r = fn.polar(theta)
      pts.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) })
    }
  }
  return pts
}

export default function GraphWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const [current, setCurrent] = useState<MathFn | null>(null)
  const [color, setColor] = useState(COLORS[0])
  const colorIdx = useRef(0)

  const draw = useCallback((fn: MathFn, clr: string) => {
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

    const pts = computePoints(fn)
    if (pts.length === 0) return

    // 자동 스케일
    const xs = pts.map(p => p.x)
    const ys = pts.map(p => p.y)
    const xMin = Math.min(...xs), xMax = Math.max(...xs)
    const yMin = Math.min(...ys), yMax = Math.max(...ys)
    const pad = 32

    const scaleX = (v: number) => pad + ((v - xMin) / (xMax - xMin)) * (W - 2 * pad)
    const scaleY = (v: number) => H - pad - ((v - yMin) / (yMax - yMin)) * (H - 2 * pad)

    // 배경 클리어
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    // 격자 (아주 옅게)
    ctx.strokeStyle = '#f3f4f6'
    ctx.lineWidth = 1
    const gridN = 6
    for (let i = 0; i <= gridN; i++) {
      const gx = pad + (i / gridN) * (W - 2 * pad)
      const gy = pad + (i / gridN) * (H - 2 * pad)
      ctx.beginPath(); ctx.moveTo(gx, pad); ctx.lineTo(gx, H - pad); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke()
    }

    // 애니메이션 드로잉
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    let progress = 0
    const duration = 1200 // ms
    let startTime: number | null = null

    const animate = (ts: number) => {
      if (!startTime) startTime = ts
      progress = Math.min((ts - startTime) / duration, 1)

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, H)

      // 격자 재그림
      ctx.strokeStyle = '#f3f4f6'
      ctx.lineWidth = 1
      for (let i = 0; i <= gridN; i++) {
        const gx = pad + (i / gridN) * (W - 2 * pad)
        const gy = pad + (i / gridN) * (H - 2 * pad)
        ctx.beginPath(); ctx.moveTo(gx, pad); ctx.lineTo(gx, H - pad); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke()
      }

      // 곡선
      const countToDraw = Math.floor(pts.length * progress)
      if (countToDraw > 1) {
        ctx.beginPath()
        ctx.strokeStyle = clr
        ctx.lineWidth = 2.5
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.moveTo(scaleX(pts[0].x), scaleY(pts[0].y))
        for (let i = 1; i < countToDraw; i++) {
          ctx.lineTo(scaleX(pts[i].x), scaleY(pts[i].y))
        }
        ctx.stroke()
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [])

  // 랜덤 선택 및 그리기
  const handleRandom = () => {
    let idx = Math.floor(Math.random() * PRESETS.length)
    // 같은 것 연속 방지
    if (current && PRESETS[idx].name === current.name) {
      idx = (idx + 1) % PRESETS.length
    }
    colorIdx.current = (colorIdx.current + 1) % COLORS.length
    const clr = COLORS[colorIdx.current]
    const fn = PRESETS[idx]
    setCurrent(fn)
    setColor(clr)
    draw(fn, clr)
  }

  // 초기 그리기
  useEffect(() => {
    const fn = PRESETS[0]
    setCurrent(fn)
    setColor(COLORS[0])
    draw(fn, COLORS[0])
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [draw])

  return (
    <div className="w-full space-y-4">
      {/* 버튼 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleRandom}
          className="px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all active:scale-95"
        >
          재미있는그래프
        </button>

        {current && (
          <div className="text-xs text-gray-400">
            <span className="font-semibold" style={{ color }}>{current.name}</span>
            <span className="ml-2 font-mono text-gray-400">{current.formula}</span>
          </div>
        )}
      </div>

      {/* 캔버스 */}
      <div className="w-full border border-gray-100 rounded-xl overflow-hidden bg-white" style={{ height: 340 }}>
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  )
}
