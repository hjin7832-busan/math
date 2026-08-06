'use client'

import { useState, useEffect } from 'react'
import MathGame from '@/components/MathGame'
import { GAMES } from '@/lib/games'
import {
  getTodayLeaderboard,
  getHallOfFame,
  todayStr,
  LeaderboardEntry,
  HallOfFameEntry,
} from '@/lib/leaderboardManager'

type Tab = 'games' | 'today' | 'hof'

export default function Calculus2026() {
  const [tab, setTab] = useState<Tab>('games')
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [todayList, setTodayList] = useState<LeaderboardEntry[]>([])
  const [hofList, setHofList] = useState<HallOfFameEntry[]>([])

  const refresh = () => {
    setTodayList(getTodayLeaderboard())
    setHofList(getHallOfFame())
  }

  useEffect(refresh, [])

  const activeGames = GAMES.filter(g => g.status === 'active')
  const soonGames = GAMES.filter(g => g.status === 'soon')

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-6 py-12 space-y-10">

      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">2026미적분1</h1>
        <p className="text-sm text-gray-400 mt-1">
          수업 내용과 연계된 게임을 플레이하고 순위를 확인하세요.
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-100">
        {([
          { key: 'games', label: '게임 목록' },
          { key: 'today', label: '오늘의 순위' },
          { key: 'hof',   label: '명예의 전당' },
        ] as { key: Tab; label: string }[]).map(it => (
          <button
            key={it.key}
            onClick={() => {
              setTab(it.key)
              if (it.key !== 'games') refresh()
              // 게임 탭으로 돌아오면 게임 목록으로
              if (it.key === 'games') setActiveGameId(null)
            }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === it.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>

      {/* ── 게임 목록 탭 ────────────────────────────────────────── */}
      {tab === 'games' && !activeGameId && (
        <div className="space-y-8">

          {/* 플레이 가능한 게임 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">플레이 가능</p>
            <div className="grid gap-3">
              {activeGames.map(game => (
                <button
                  key={game.id}
                  onClick={() => setActiveGameId(game.id)}
                  className="w-full text-left flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 active:scale-[0.99] transition-all"
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700 shrink-0">
                    {game.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{game.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{game.description}</p>
                  </div>
                  <div className="shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 준비 중 게임 */}
          {soonGames.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">준비 중</p>
              <div className="grid gap-3">
                {soonGames.map(game => (
                  <div
                    key={game.id}
                    className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl opacity-60 cursor-not-allowed"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 text-sm font-bold text-gray-400 shrink-0">
                      {game.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-500">{game.title}</p>
                        <span className="text-[10px] font-bold text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                          SOON
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{game.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── 게임 플레이 화면 ────────────────────────────────────── */}
      {tab === 'games' && activeGameId && (
        <div className="space-y-6">
          {/* 뒤로가기 */}
          <button
            onClick={() => setActiveGameId(null)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            게임 목록으로
          </button>

          {/* 게임 렌더 (id 기반 분기 — 추후 게임 추가 시 여기에 case 추가) */}
          {activeGameId === 'gugudan' && (
            <MathGame onDone={refresh} />
          )}
        </div>
      )}

      {/* ── 오늘의 순위 탭 ──────────────────────────────────────── */}
      {tab === 'today' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{todayStr()} · 자정 자동 초기화</p>
            <button onClick={refresh} className="text-xs text-gray-400 hover:text-gray-700">
              새로고침
            </button>
          </div>

          {todayList.length === 0 ? (
            <p className="text-sm text-gray-400">아직 오늘의 기록이 없습니다.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayList.map((e, i) => (
                <div key={e.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <span className={`w-6 text-center text-sm font-bold ${
                      i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="font-mono text-sm text-gray-700">{e.numericName}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm font-mono">
                    <span className="text-gray-700 font-semibold">{e.score}점</span>
                    <span className="text-xs text-gray-300">{e.correctCount}개 정답</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 명예의 전당 탭 ──────────────────────────────────────── */}
      {tab === 'hof' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            매일 자정 1위 기록 보존 · 7일 후 자동 삭제
          </p>

          {hofList.length === 0 ? (
            <p className="text-sm text-gray-400">아직 명예의 전당 기록이 없습니다.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {hofList.map(e => (
                <div key={e.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400 font-mono w-24">{e.date}</span>
                    <span className="font-mono text-sm text-gray-800 font-semibold">{e.numericName}</span>
                  </div>
                  <span className="font-mono text-sm text-gray-600">{e.score}점</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
