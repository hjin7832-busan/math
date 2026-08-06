'use client'

import { useState, useEffect } from 'react'
import MathGame from '@/components/MathGame'
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
    setTodayList(getTodayLeaderboard())
    setHofList(getHallOfFame())
  }

  useEffect(refresh, [])

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-6 py-12 space-y-10">

      {/* 페이지 타이틀 */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">2026미적분1</h1>
        <p className="text-sm text-gray-400">숫자 이름으로 구구단 게임에 참여하고 순위를 확인하세요.</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-100">
        {([
          { key: 'game',  label: '구구단 게임' },
          { key: 'today', label: '오늘의 순위' },
          { key: 'hof',   label: '명예의 전당' },
        ] as { key: Tab; label: string }[]).map(it => (
          <button
            key={it.key}
            onClick={() => { setTab(it.key); if (it.key !== 'game') refresh() }}
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

      {/* ── 구구단 게임 탭 ──────────────────────────────────────── */}
      {tab === 'game' && (
        <MathGame onDone={refresh} />
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
                  <div className="flex items-center gap-6 text-sm text-gray-500 font-mono">
                    <span>{e.score}점</span>
                    <span className="text-xs text-gray-300">{e.correctCount}개</span>
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
                    <span className="text-sm font-medium text-gray-400">{e.date}</span>
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
