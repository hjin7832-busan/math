'use client'

import { useState, useEffect } from 'react'
import GugudanGame from '@/components/GugudanGame'
import LimitGame from '@/components/LimitGame'
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
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all')

  const [todayList, setTodayList] = useState<LeaderboardEntry[]>([])
  const [hofList, setHofList] = useState<HallOfFameEntry[]>([])

  const refresh = () => {
    const filterId = selectedGameFilter === 'all' ? undefined : selectedGameFilter
    setTodayList(getTodayLeaderboard(filterId))
    setHofList(getHallOfFame(filterId))
  }

  useEffect(() => {
    refresh()
  }, [selectedGameFilter])

  const activeGames = GAMES.filter(g => g.status === 'active')
  const soonGames = GAMES.filter(g => g.status === 'soon')

  const getGameTitle = (gId: string) => {
    const found = GAMES.find(g => g.id === gId)
    return found ? found.title : gId
  }

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-6 py-12 space-y-10">

      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">2026 미적분1 게임 존</h1>
        <p className="text-sm text-gray-400 mt-1">
          수업 내용과 연계된 게임을 플레이하고 게임별 순위 및 명예의 전당 기록에 도전해보세요!
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-100">
        {([
          { key: 'games', label: '🎮 게임 목록' },
          { key: 'today', label: '🏆 오늘의 순위' },
          { key: 'hof',   label: '🏛️ 명예의 전당' },
        ] as { key: Tab; label: string }[]).map(it => (
          <button
            key={it.key}
            onClick={() => {
              setTab(it.key)
              if (it.key !== 'games') refresh()
              if (it.key === 'games') setActiveGameId(null)
            }}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
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
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">🔥 플레이 가능 게임</p>
            <div className="grid gap-4">
              {activeGames.map(game => (
                <button
                  key={game.id}
                  onClick={() => setActiveGameId(game.id)}
                  className="w-full text-left flex items-center justify-between p-5 border border-gray-200 bg-white rounded-2xl hover:border-gray-900 hover:shadow-md active:scale-[0.99] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-indigo-50 text-2xl shrink-0 group-hover:scale-110 transition-transform">
                      {game.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-bold text-gray-900">{game.title}</p>
                        {game.category && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            {game.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{game.description}</p>
                    </div>
                  </div>
                  <div className="shrink-0 pl-3">
                    <span className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl group-hover:bg-indigo-600 transition-colors">
                      도전하기
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 준비 중 게임 */}
          {soonGames.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">⏳ 오픈 예정 게임</p>
              <div className="grid gap-3">
                {soonGames.map(game => (
                  <div
                    key={game.id}
                    className="flex items-center gap-4 p-4 border border-gray-100 bg-gray-50/50 rounded-2xl opacity-70 cursor-not-allowed"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-xl shrink-0">
                      {game.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-600">{game.title}</p>
                        <span className="text-[10px] font-bold text-gray-400 border border-gray-200 bg-white rounded px-1.5 py-0.5">
                          COMING SOON
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
          <button
            onClick={() => { setActiveGameId(null); refresh() }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            다른 게임 선택하기
          </button>

          {activeGameId === 'gugudan' && (
            <GugudanGame onDone={refresh} />
          )}

          {activeGameId === 'limit-concept' && (
            <LimitGame onDone={refresh} />
          )}
        </div>
      )}

      {/* ── 오늘의 순위 탭 ──────────────────────────────────────── */}
      {tab === 'today' && (
        <div className="space-y-6">
          {/* 게임별 필터 버튼 */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedGameFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  selectedGameFilter === 'all'
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                전체 보기
              </button>
              {GAMES.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGameFilter(g.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 shrink-0 ${
                    selectedGameFilter === g.id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <span>{g.emoji}</span>
                  <span>{g.title}</span>
                </button>
              ))}
            </div>

            <button onClick={refresh} className="text-xs font-medium text-gray-400 hover:text-gray-700">
              🔄 새로고침
            </button>
          </div>

          <div className="text-xs text-gray-400 flex items-center justify-between">
            <span>📅 {todayStr()} (매일 자정 리셋)</span>
            <span>상태 유지: LocalStorage 안전 보존</span>
          </div>

          {todayList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-gray-200 rounded-2xl">
              <p className="text-sm text-gray-400">아직 오늘의 기록이 없습니다. 지금 첫 번째 도전자가 되어보세요!</p>
            </div>
          ) : (
            <div className="border border-gray-100 bg-white rounded-2xl divide-y divide-gray-50 shadow-sm overflow-hidden">
              {todayList.map((e, i) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-extrabold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-slate-100 text-slate-700' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {i + 1}
                    </span>
                    <div>
                      <span className="font-mono text-sm font-bold text-gray-900">#{e.numericName}</span>
                      <span className="ml-2.5 text-[11px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">
                        {getGameTitle(e.gameId)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm font-mono">
                    <span className="text-indigo-600 font-extrabold text-base">{e.score}점</span>
                    <span className="text-xs text-gray-400">{e.correctCount}개 정답 ({e.maxCombo}×콤보)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 명예의 전당 탭 ──────────────────────────────────────── */}
      {tab === 'hof' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedGameFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  selectedGameFilter === 'all'
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                전체 보기
              </button>
              {GAMES.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGameFilter(g.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 shrink-0 ${
                    selectedGameFilter === g.id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <span>{g.emoji}</span>
                  <span>{g.title}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400">
            👑 매일 자정 각 게임별 1위 레코드가 전당에 등재되며, 7일 동안 보존된 후 일주일 단위로 리셋됩니다.
          </p>

          {hofList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-gray-200 rounded-2xl">
              <p className="text-sm text-gray-400">아직 명예의 전당에 등록된 챔피언 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="border border-gray-100 bg-white rounded-2xl divide-y divide-gray-50 shadow-sm overflow-hidden">
              {hofList.map(e => (
                <div key={e.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-md">{e.date}</span>
                    <div>
                      <span className="font-mono text-sm font-bold text-gray-900">#{e.numericName}</span>
                      <span className="ml-2.5 text-[11px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
                        {getGameTitle(e.gameId)} 1위
                      </span>
                    </div>
                  </div>

                  <span className="font-mono text-base font-extrabold text-amber-600">{e.score}점</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
