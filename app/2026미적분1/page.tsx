'use client'

import { useState, useEffect } from 'react'
import GugudanGame from '@/components/GugudanGame'
import {
  getTodayLeaderboard,
  getHallOfFame,
  todayStr,
  LeaderboardEntry,
  HallOfFameEntry,
} from '@/lib/leaderboardManager'

type Tab = 'game' | 'today' | 'hof'

export default function Calculus2026() {
  const [tab, setTab] = useState<Tab>('game')
  const [todayList, setTodayList] = useState<LeaderboardEntry[]>([])
  const [hofList, setHofList] = useState<HallOfFameEntry[]>([])

  const refresh = () => {
    setTodayList(getTodayLeaderboard('gugudan'))
    setHofList(getHallOfFame('gugudan'))
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-6 py-12 space-y-8">

      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">2026 미적분1 미니 게임</h1>
        <p className="text-sm text-gray-400 mt-1">
          수업 내용과 연결되는 신속한 수학 연산 챌린지에 도전하고 순위를 기록하세요!
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-100">
        {([
          { key: 'game',  label: '🎮 미니 게임' },
          { key: 'today', label: '🏆 오늘의 순위' },
          { key: 'hof',   label: '🏛️ 명예의 전당' },
        ] as { key: Tab; label: string }[]).map(it => (
          <button
            key={it.key}
            onClick={() => {
              setTab(it.key)
              refresh()
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

      {/* ── 1. 게임 플레이 탭 ────────────────────────────────────── */}
      {tab === 'game' && (
        <div className="w-full">
          <GugudanGame onDone={refresh} />
        </div>
      )}

      {/* ── 2. 오늘의 순위 탭 ────────────────────────────────────── */}
      {tab === 'today' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">📅 {todayStr()} (매일 자정 자동 초기화)</span>
            <button onClick={refresh} className="text-xs font-semibold text-gray-500 hover:text-gray-900">
              🔄 새로고침
            </button>
          </div>

          {todayList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-gray-200 rounded-2xl">
              <p className="text-sm text-gray-400">아직 오늘의 기록이 없습니다. 지금 첫 번째로 등록해보세요!</p>
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
                    <span className="font-mono text-sm font-bold text-gray-900">#{e.numericName}</span>
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

      {/* ── 3. 명예의 전당 탭 ────────────────────────────────────── */}
      {tab === 'hof' && (
        <div className="space-y-6">
          <p className="text-xs text-gray-400 leading-relaxed">
            👑 매일 자정 1위 챔피언 기록이 보존되며, 7일 동안 유지된 후 일주일 단위로 자동 업데이트됩니다.
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
                    <span className="font-mono text-sm font-bold text-gray-900">#{e.numericName}</span>
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
