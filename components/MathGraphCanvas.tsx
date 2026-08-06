'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { evaluate } from 'mathjs'
import { Sparkles, Play, Pause, RefreshCw, Info, Sliders, CheckCircle2 } from 'lucide-react'

export interface MathFunctionItem {
  id: string
  name: string
  formulaDisplay: string
  type: 'cartesian' | 'parametric' | 'polar'
  expr?: string // for mathjs cartesian
  parametricFunc?: (t: number) => { x: number; y: number }
  polarFunc?: (theta: number) => number
  description: string
  domain: [number, number] // [min, max]
  scaleX?: number
  scaleY?: number
}

const MATH_PRESETS: MathFunctionItem[] = [
  {
    id: 'sin_x',
    name: '진동 증폭 함수',
    formulaDisplay: 'y = sin(x) · x',
    type: 'cartesian',
    expr: 'sin(x) * x',
    description: 'x의 원점 진폭이 증가하며 조화롭게 진동하는 다이나믹 함수',
    domain: [-4 * Math.PI, 4 * Math.PI],
  },
  {
    id: 'cubic_poly',
    name: '3차 극값 함수',
    formulaDisplay: 'y = x³ - 3x',
    type: 'cartesian',
    expr: 'x^3 - 3*x',
    description: 'x = -1에서 극댓값 2, x = 1에서 극솟값 -2를 갖는 3차 함수의 대표 수식',
    domain: [-2.5, 2.5],
  },
  {
    id: 'heart_curve',
    name: '하트 방정식 (Heart Curve)',
    formulaDisplay: 'x(t) = 16 sin³(t), y(t) = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)',
    type: 'parametric',
    parametricFunc: (t: number) => {
      const x = 16 * Math.pow(Math.sin(t), 3)
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      return { x: x / 16, y: y / 16 }
    },
    description: '매개변수 t를 활용해 완성되는 수학적 정교함의 상징, 로맨틱 하트 방정식',
    domain: [0, 2 * Math.PI],
  },
  {
    id: 'rose_curve',
    name: '8엽 장미 곡선 (Rose Curve)',
    formulaDisplay: 'r = cos(4θ)',
    type: 'polar',
    polarFunc: (theta: number) => Math.cos(4 * theta),
    description: '극방정식 극좌표계 상에서 8개의 대칭적인 꽃잎을 그리는 아름다운 장미 곡선',
    domain: [0, 2 * Math.PI],
  },
  {
    id: 'damped_sine',
    name: '감쇠 파동 함수 (Damped Sine Wave)',
    formulaDisplay: 'y = e^(-0.15x) · sin(3x)',
    type: 'cartesian',
    expr: 'e^(-0.15*x) * sin(3*x)',
    description: '물리학과 공학에서 파동의 에너지가 시간에 따라 감소하는 현상을 나타내는 함수',
    domain: [-1, 4 * Math.PI],
  },
  {
    id: 'lissajous',
    name: '리사주 조화 곡선 (Lissajous 3:4)',
    formulaDisplay: 'x(t) = sin(3t), y(t) = sin(4t)',
    type: 'parametric',
    parametricFunc: (t: number) => ({
      x: Math.sin(3 * t),
      y: Math.sin(4 * t),
    }),
    description: '두 직교하는 진동 수의 비율이 3:4일 때 형성되는 복합 파형 궤적',
    domain: [0, 2 * Math.PI],
  },
  {
    id: 'butterfly',
    name: '나비 곡선 (Butterfly Curve)',
    formulaDisplay: 'r = e^(sin θ) - 2 cos(4θ) + sin⁵((2θ - π)/24)',
    type: 'polar',
    polarFunc: (theta: number) => {
      return Math.exp(Math.sin(theta)) - 2 * Math.cos(4 * theta) + Math.pow(Math.sin((2 * theta - Math.PI) / 24), 5)
    },
    description: '템플 페이(Temple H. Fay)에 의해 발견된 우아한 나비 모양의 극곡선',
    domain: [0, 12 * Math.PI],
  },
  {
    id: 'sinc_wave',
    name: '수학적 싱크 변형 (Sinc Wave)',
    formulaDisplay: 'y = sin(2x) / (1 + 0.1x²)',
    type: 'cartesian',
    expr: 'sin(2*x) / (1 + 0.1*x^2)',
    description: '신호 처리 및 신호 복원에 핵심적으로 응용되는 감쇠 샌드위치 수식',
    domain: [-4 * Math.PI, 4 * Math.PI],
  },
]

export default function MathGraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [selectedFunc, setSelectedFunc] = useState<MathFunctionItem>(MATH_PRESETS[0])
  const [customExpr, setCustomExpr] = useState('')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customError, setCustomError] = useState('')
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(1.0)
  const animationRef = useRef<number | null>(null)

  // Random function selection
  const handleRandomSelect = () => {
    setIsCustomMode(false)
    setCustomError('')
    let nextIndex = Math.floor(Math.random() * MATH_PRESETS.length)
    if (MATH_PRESETS[nextIndex].id === selectedFunc.id) {
      nextIndex = (nextIndex + 1) % MATH_PRESETS.length
    }
    const nextFunc = MATH_PRESETS[nextIndex]
    setSelectedFunc(nextFunc)
    triggerAnimation()
  }

  // Trigger drawing animation from 0 to 1
  const triggerAnimation = useCallback(() => {
    setProgress(0)
    setIsPlaying(true)
  }, [])

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Handle high DPI crisp drawing
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const centerX = width / 2
    const centerY = height / 2

    // Clear background
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#090d16' // dark math slate
    ctx.fillRect(0, 0, width, height)

    // Draw Grid Lines & Axes
    ctx.lineWidth = 1
    ctx.strokeStyle = '#1e293b' // grid line
    const gridSize = 40

    for (let x = centerX % gridSize; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = centerY % gridSize; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1.5

    // X Axis
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(width, centerY)
    ctx.stroke()

    // Y Axis
    ctx.beginPath()
    ctx.moveTo(centerX, 0)
    ctx.lineTo(centerX, height)
    ctx.stroke()

    // Axis Labels & Origin
    ctx.fillStyle = '#64748b'
    ctx.font = '11px monospace'
    ctx.fillText('(0,0)', centerX + 6, centerY + 16)
    ctx.fillText('X', width - 16, centerY - 8)
    ctx.fillText('Y', centerX + 8, 16)

    // Calculate sample points
    const points: { x: number; y: number }[] = []
    const numSteps = 400

    if (isCustomMode) {
      // Evaluate custom expression
      const minX = -10
      const maxX = 10
      const step = (maxX - minX) / numSteps
      const scale = width / 24

      for (let i = 0; i <= numSteps; i++) {
        const xVal = minX + i * step
        try {
          const yVal = evaluate(customExpr, { x: xVal })
          if (typeof yVal === 'number' && !isNaN(yVal) && isFinite(yVal)) {
            const canvasX = centerX + xVal * scale
            const canvasY = centerY - yVal * scale
            points.push({ x: canvasX, y: canvasY })
          }
        } catch (e) {
          // ignore individual point errors
        }
      }
    } else {
      const [minVal, maxVal] = selectedFunc.domain
      const step = (maxVal - minVal) / numSteps

      if (selectedFunc.type === 'cartesian' && selectedFunc.expr) {
        const scale = width / (maxVal - minVal) * 0.85
        for (let i = 0; i <= numSteps; i++) {
          const xVal = minVal + i * step
          try {
            const yVal = evaluate(selectedFunc.expr, { x: xVal })
            if (typeof yVal === 'number' && !isNaN(yVal) && isFinite(yVal)) {
              const canvasX = centerX + xVal * scale
              const canvasY = centerY - yVal * scale
              points.push({ x: canvasX, y: canvasY })
            }
          } catch (e) {}
        }
      } else if (selectedFunc.type === 'parametric' && selectedFunc.parametricFunc) {
        const scale = Math.min(width, height) * 0.35
        for (let i = 0; i <= numSteps; i++) {
          const t = minVal + i * step
          const pt = selectedFunc.parametricFunc(t)
          const canvasX = centerX + pt.x * scale
          const canvasY = centerY - pt.y * scale
          points.push({ x: canvasX, y: canvasY })
        }
      } else if (selectedFunc.type === 'polar' && selectedFunc.polarFunc) {
        const scale = Math.min(width, height) * 0.22
        for (let i = 0; i <= numSteps; i++) {
          const theta = minVal + i * step
          const r = selectedFunc.polarFunc(theta)
          const xVal = r * Math.cos(theta)
          const yVal = r * Math.sin(theta)
          const canvasX = centerX + xVal * scale
          const canvasY = centerY - yVal * scale
          points.push({ x: canvasX, y: canvasY })
        }
      }
    }

    // Draw animated curve up to current progress
    if (points.length > 1) {
      const countToDraw = Math.floor(points.length * progress)

      // Glow effect background line
      ctx.shadowColor = '#6366f1'
      ctx.shadowBlur = 12
      ctx.strokeStyle = '#818cf8'
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)

      for (let i = 1; i < countToDraw; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.stroke()
      ctx.shadowBlur = 0 // Reset shadow

      // Draw active head glowing particle
      if (countToDraw > 0 && countToDraw < points.length) {
        const head = points[countToDraw - 1]
        ctx.fillStyle = '#38bdf8'
        ctx.shadowColor = '#38bdf8'
        ctx.shadowBlur = 16
        ctx.beginPath()
        ctx.arc(head.x, head.y, 6, 0, 2 * Math.PI)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }
  }, [selectedFunc, customExpr, isCustomMode, progress])

  // Animation frame loop
  useEffect(() => {
    if (!isPlaying) return

    let start: number | null = null
    const duration = 1500 // 1.5s animation

    const animate = (timestamp: number) => {
      if (!start) start = timestamp
      const elapsed = timestamp - start
      const nextProgress = Math.min(1.0, elapsed / duration)
      setProgress(nextProgress)

      if (nextProgress < 1.0) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsPlaying(false)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isPlaying])

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customExpr.trim()) return

    try {
      evaluate(customExpr, { x: 1 })
      setCustomError('')
      setIsCustomMode(true)
      triggerAnimation()
    } catch (err) {
      setCustomError('수식이 올바르지 않습니다. (예: sin(x) * x, x^2 - 4)')
    }
  }

  return (
    <div className="w-full max-w-5xl bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/50 space-y-6">
      
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        
        {/* Title & Badge */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              인터랙티브 함수 시각화 그래프
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            수학적 아름다움을 실시간 Canvas 애니메이션으로 관찰하세요.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleRandomSelect}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isPlaying ? 'animate-spin' : ''}`} />
            <span>🎲 랜덤 함수 그래프 그리기</span>
          </button>

          <button
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false)
              } else {
                triggerAnimation()
              }
            }}
            className="flex items-center justify-center p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title={isPlaying ? '일시정지' : '다시 재생'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <Sliders className="w-3.5 h-3.5" /> 추천 프리셋:
        </span>
        {MATH_PRESETS.map((item) => {
          const isActive = !isCustomMode && selectedFunc.id === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                setIsCustomMode(false)
                setSelectedFunc(item)
                setCustomError('')
                triggerAnimation()
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                isActive
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              {item.name}
            </button>
          )
        })}
      </div>

      {/* Formula Info Banner */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              {isCustomMode ? '커스텀 수식' : selectedFunc.type.toUpperCase()}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-sm font-bold text-slate-200">
              {isCustomMode ? '직접 입력한 함수' : selectedFunc.name}
            </span>
          </div>
          <div className="text-lg font-mono font-extrabold text-cyan-300 tracking-wide">
            {isCustomMode ? `y = ${customExpr}` : selectedFunc.formulaDisplay}
          </div>
          <p className="text-xs text-slate-400">
            {isCustomMode
              ? '사용자 정의 Cartesian 변수 x에 대한 y(x) 그래프'
              : selectedFunc.description}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>애니메이션 진행률: {Math.round(progress * 100)}%</span>
        </div>
      </div>

      {/* Canvas Visualization Box */}
      <div className="relative w-full h-[380px] sm:h-[420px] rounded-2xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Overlay Grid Tag */}
        <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-slate-900/80 backdrop-blur border border-slate-800 text-[11px] font-mono text-slate-400">
          Scale: Dynamic Auto-fit
        </div>
      </div>

      {/* Custom Formula Input Drawer */}
      <form onSubmit={handleCustomSubmit} className="space-y-2 pt-2">
        <label className="block text-xs font-semibold text-slate-300">
          직접 수식 입력하기 (y = f(x))
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customExpr}
            onChange={(e) => setCustomExpr(e.target.value)}
            placeholder="예: sin(x) * x, x^3 - 4*x, e^(-0.2*x) * cos(2*x)"
            className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-all shrink-0 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>적용 및 그리기</span>
          </button>
        </div>
        {customError && <p className="text-xs text-red-400 font-medium">{customError}</p>}
      </form>

    </div>
  )
}
