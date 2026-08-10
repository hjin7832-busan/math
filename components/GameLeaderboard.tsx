'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getTodayLeaderboard,
  getHallOfFame,
  LeaderboardEntry,
  HallOfFameEntry,
} from '@/lib/leaderboardManager'

interface GameLeaderboardProps {
  gameId: string
  refreshTrigger?: number
}

export default function GameLeaderboard({ gameId, refreshTrigger }: GameLeaderboardProps) {
  const [tab, setTab] = useState<'today' | 'hof'>('today')
  const [todayList, setTodayList] = useState<LeaderboardEntry[]>([])
  const [hofList, setHofList] = useState<HallOfFameEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadLeaderboardData = useCallback(async () => {
    setLoading(true)
    try {
      const [todayData, hofData] = await Promise.all([
        getTodayLeaderboard(gameId),
        getHallOfFame(gameId),
      ])
      setTodayList(todayData)
      setHofList(hofData)
    } catch (err) {
      console.error('Failed to load game leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    loadLeaderboardData()
  }, [loadLeaderboardData, refreshTrigger])

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
      {/* 탭 헤더 및 새로고침 버튼 */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === 'today'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🏆 오늘의 순위 ({todayList.length})
          </button>
          <button
            onClick={() => setTab('hof')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === 'hof'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            👑 명예의 전당 (주간)
          </button>
        </div>

        <button
          onClick={loadLeaderboardData}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          새로고침
        </button>
      </div>

      {/* 로딩 표시 */}
      {loading && (
        <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
          Supabase DB에서 기록을 불러오는 중...
        </div>
      )}

      {/* ── 탭 1: 오늘의 순위 ────────────────────────────────────────── */}
      {!loading && tab === 'today' && (
        <div>
          {todayList.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 space-y-1">
              <p>오늘의 첫 번째 도전자가 되어 보세요! 🚀</p>
              <p className="text-[11px] text-gray-300">실시간으로 순위표에 등록됩니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayList.map((entry, idx) => {
                const rank = idx + 1
                return (
                  <div
                    key={entry.id || idx}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-mono transition-all ${
                      rank === 1
                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                        : rank === 2
                        ? 'bg-slate-50 border-slate-200 text-slate-800'
                        : rank === 3
                        ? 'bg-orange-50/40 border-orange-200 text-orange-900'
                        : 'bg-white border-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold w-6 text-center text-sm">
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`}
                      </span>
                      <div>
                        <span className="font-bold">#{entry.numericName}</span>
                        <span className="text-[10px] text-gray-400 ml-2">
                          (정답 {entry.correctCount}개 · {entry.maxCombo}콤보)
                        </span>
                      </div>
                    </div>

                    <span className="font-extrabold text-sm text-indigo-600">
                      {entry.score.toLocaleString()}점
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 탭 2: 명예의 전당 ────────────────────────────────────────── */}
      {!loading && tab === 'hof' && (
        <div>
          {hofList.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 space-y-1">
              <p>아직 명예의 전당에 등재된 1위 기록이 없습니다. 👑</p>
              <p className="text-[11px] text-gray-300">지난 7일간 일자별 최고 득점자가 표시됩니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hofList.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50/50 to-orange-50/30 border border-amber-200/60 rounded-xl text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">👑</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">#{entry.numericName}</span>
                        <span className="text-[10px] text-amber-700 font-semibold px-1.5 py-0.2 bg-amber-100 rounded">
                          {entry.date} 1위
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        정답 {entry.correctCount}개 · Max Combo {entry.maxCombo}
                      </p>
                    </div>
                  </div>

                  <span className="font-extrabold text-sm text-amber-700">
                    {entry.score.toLocaleString()}점
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
