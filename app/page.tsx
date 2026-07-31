'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { evaluate } from 'mathjs'
import { supabase } from '@/lib/supabase'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

type GraphData = {
  id: string
  created_at: string
  expression: string
}

export default function Home() {
  const [expression, setExpression] = useState('x^2')
  const [dataPoints, setDataPoints] = useState<{ x: number; y: number }[]>([])
  const [history, setHistory] = useState<GraphData[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // 초기 렌더링 시 그래프 그리기 및 히스토리 불러오기
  useEffect(() => {
    generateData(expression)
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('saved_graphs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (data) {
      setHistory(data)
    }
  }

  const generateData = (expr: string) => {
    try {
      setError('')
      const points = []
      // x: -10 to 10
      for (let x = -10; x <= 10; x += 0.5) {
        const y = evaluate(expr, { x })
        points.push({ x, y })
      }
      setDataPoints(points)
      return true
    } catch (err) {
      setError('수식이 올바르지 않습니다. (예: x^2, sin(x), 2*x + 1)')
      return false
    }
  }

  const handlePlotAndSave = async () => {
    if (!expression.trim()) return
    
    // 1. 그래프 데이터 생성
    const isValid = generateData(expression)
    if (!isValid) return

    // 2. Supabase 저장
    setIsSaving(true)
    const { error } = await supabase
      .from('saved_graphs')
      .insert([{ expression }])
    
    setIsSaving(false)

    if (error) {
      setError('저장에 실패했습니다. 데이터베이스 설정을 확인해주세요.')
      console.error(error)
    } else {
      fetchHistory()
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center py-12 px-6 lg:px-24">
      <div className="max-w-4xl w-full space-y-12 flex flex-col items-center">
        
        {/* 헤더 섹션 */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 pb-2">
            2026학년도 2학기 수업 with HJ at DADAE High School
          </h1>
        </div>

        {/* 메인 컨트롤러 (Glassmorphism) */}
        <div className="w-full max-w-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                함수식 (y = )
              </label>
              <input 
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="예: x^2 + 2*x - 1"
                className="w-full px-5 py-4 rounded-2xl bg-white border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-lg font-medium text-gray-800"
                onKeyDown={(e) => e.key === 'Enter' && handlePlotAndSave()}
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={handlePlotAndSave}
                disabled={isSaving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl font-semibold hover:bg-gray-800 hover:shadow-lg transition-all duration-300 disabled:opacity-70"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                <span>그리기 & 저장</span>
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
        </div>

        {/* 그래프 렌더링 영역 */}
        <div className="w-full h-[400px] bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataPoints} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tick={{ fill: '#888' }} />
              <YAxis tick={{ fill: '#888' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line 
                type="monotone" 
                dataKey="y" 
                stroke="#111827" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 최근 저장된 그래프 내역 */}
        <div className="w-full max-w-2xl text-left space-y-4">
          <h3 className="text-xl font-bold tracking-tight text-gray-900">최근 저장된 식</h3>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">저장된 내역이 없습니다.</p>
          ) : (
            <div className="grid gap-3">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
                  onClick={() => {
                    setExpression(item.expression)
                    generateData(item.expression)
                  }}
                >
                  <span className="font-semibold text-gray-800 text-lg">y = {item.expression}</span>
                  <span className="text-sm text-gray-400">
                    {new Date(item.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
