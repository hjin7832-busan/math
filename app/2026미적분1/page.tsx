'use client'

import { useState } from 'react'
import GugudanGame from '@/components/GugudanGame'
import { GAMES } from '@/lib/games'

// ─────────────────────────────────────────────────────────────────
// 2026미적분1 페이지
//
// 구조: 게임 목록 → 게임 선택 → 게임 컴포넌트 (기록 포함)
// 각 게임 컴포넌트가 자체적으로 오늘 순위 + 명예의 전당을 표시
// 추후 게임 추가 시: GAMES 배열에 항목 추가 + 컴포넌트 import + renderGame 분기 추가
// ─────────────────────────────────────────────────────────────────

export default function Calculus2026() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null)

  const activeGames = GAMES.filter(g => g.status === 'active')
  const soonGames = GAMES.filter(g => g.status === 'soon')

  // ── 게임 컴포넌트 분기 렌더링 ─────────────────────────────────
  // 추후 게임 추가 시 여기에 case 추가
  const renderGame = (gameId: string) => {
    switch (gameId) {
      case 'gugudan':
        return <GugudanGame />
      // case 'limit-concept':
      //   return <LimitGame />
      // case 'derivative-quiz':
      //   return <DerivativeGame />
      default:
        return <p className="text-sm text-gray-400">해당 게임을 찾을 수 없습니다.</p>
    }
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-6 py-12 space-y-8">

      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">2026 미적분1</h1>
        <p className="text-sm text-gray-400 mt-1">
          수업과 연계된 미니 게임을 플레이하고 기록에 도전하세요!
        </p>
      </div>

      {/* ── 게임 선택 중 ──────────────────────────────────────────── */}
      {!activeGameId && (
        <div className="space-y-8">

          {/* 플레이 가능한 게임 */}
          {activeGames.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">🎮 플레이 가능</p>
              <div className="grid gap-3">
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
                        <p className="text-base font-bold text-gray-900">{game.title}</p>
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
          )}

          {/* 준비 중 게임 */}
          {soonGames.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">⏳ 준비 중</p>
              <div className="grid gap-3">
                {soonGames.map(game => (
                  <div
                    key={game.id}
                    className="flex items-center gap-4 p-4 border border-gray-100 bg-gray-50/50 rounded-2xl opacity-60 cursor-not-allowed"
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

      {/* ── 게임 플레이 화면 ──────────────────────────────────────── */}
      {activeGameId && (
        <div className="space-y-6">
          <button
            onClick={() => setActiveGameId(null)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            게임 목록으로
          </button>

          {renderGame(activeGameId)}
        </div>
      )}

    </div>
  )
}
