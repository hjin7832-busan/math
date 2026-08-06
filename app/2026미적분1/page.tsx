'use client'

import { useState, useEffect } from 'react'
import MathGame from '@/components/MathGame'
import {
  getTodayLeaderboard,
  getHallOfFame,
  seedSampleDataIfEmpty,
  LeaderboardEntry,
  HallOfFameEntry,
  getTodayDateString,
} from '@/lib/leaderboardManager'
import {
  Trophy,
  Award,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  Flame,
  CheckCircle2,
  Lock,
  Zap,
} from 'lucide-react'

export default function Calculus2026Page() {
  const [activeTab, setActiveTab] = useState<'game' | 'today' | 'hof'>('game')
  const [todayLeaderboard, setTodayLeaderboard] = useState<LeaderboardEntry[]>([])
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([])
  const [todayDateStr, setTodayDateStr] = useState('')

  const refreshLeaderboardData = () => {
    seedSampleDataIfEmpty()
    setTodayLeaderboard(getTodayLeaderboard())
    setHallOfFame(getHallOfFame())
    setTodayDateStr(getTodayDateString())
  }

  useEffect(() => {
    refreshLeaderboardData()
  }, [])

  return (
    <main className="flex-1 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-12 space-y-12 max-w-6xl mx-auto w-full">
      
      {/* COURSE BANNER */}
      <section className="w-full text-center space-y-4 pt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>2026학년도 미적분1 탐구 학습 공간</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
          2026 미적분1 & 수학 게임 챌린지
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
          미적분 개념을 활용한 실시간 게임부터 스피드 연산 퀴즈까지, <br className="hidden sm:inline" />
          숫자 이름(학번/PIN)으로 순위에 등록하고 명예의 전당에 이름을 올리세요!
        </p>
      </section>

      {/* EXTENSIBLE GAME CARDS HUB */}
      <section className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>수학 게임 탐구 허브</span>
          </h2>
          <span className="text-xs text-slate-400">추후 지속 추가되는 게임 목록</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Active Game 1 */}
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-5 space-y-3 relative overflow-hidden shadow-lg shadow-indigo-950/40">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PLAYABLE NOW
              </span>
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white">⚡ 스피드 구구단 & 수학 퀴즈</h3>
            <p className="text-xs text-slate-400">
              45초간 순발력 구구단과 미적분 간단 퀴즈를 해결하여 점수를 획득하는 게임
            </p>
          </div>

          {/* Upcoming Game 2 */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-3 relative opacity-75">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                <Lock className="w-3 h-3" /> COMING SOON
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-300">📐 적분 영역 넓이 맞추기</h3>
            <p className="text-xs text-slate-400">
              다항함수 정적분 구간의 면적을 직관적으로 추정하고 맞히는 퀴즈 (업데이트 예정)
            </p>
          </div>

          {/* Upcoming Game 3 */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-3 relative opacity-75">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                <Lock className="w-3 h-3" /> COMING SOON
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-300">⚡ 미분계수 순발력 퀴즈</h3>
            <p className="text-xs text-slate-400">
              접선의 기울기와 도함수 함숫값을 순간적으로 계산하는 스피드 퀴즈 (업데이트 예정)
            </p>
          </div>

        </div>
      </section>

      {/* NAVIGATION TABS */}
      <section className="w-full space-y-8">
        
        {/* Tab Buttons */}
        <div className="flex items-center justify-center p-1.5 bg-slate-900 border border-slate-800 rounded-2xl max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('game')}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'game'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>게임 플레이</span>
          </button>

          <button
            onClick={() => {
              refreshLeaderboardData()
              setActiveTab('today')
            }}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'today'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>오늘의 순위</span>
          </button>

          <button
            onClick={() => {
              refreshLeaderboardData()
              setActiveTab('hof')
            }}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'hof'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>명예의 전당</span>
          </button>
        </div>

        {/* TAB CONTENT 1: GAME PLAY */}
        {activeTab === 'game' && (
          <div className="w-full">
            <MathGame onScoreSubmitted={refreshLeaderboardData} />
          </div>
        )}

        {/* TAB CONTENT 2: TODAY'S LEADERBOARD */}
        {activeTab === 'today' && (
          <div className="w-full max-w-3xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>오늘의 실시간 순위 ({todayDateStr})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  매일 자정(00:00)에 초기화되며 1위 기록은 '명예의 전당'으로 이관됩니다.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 shrink-0">
                <Clock className="w-3.5 h-3.5" /> 자정 자동 리셋
              </span>
            </div>

            {todayLeaderboard.length === 0 ? (
              <div className="text-center py-12 space-y-2 text-slate-400">
                <p>오늘의 참가 기록이 아직 없습니다.</p>
                <p className="text-xs text-slate-500">첫 번째 챌린저가 되어 순위에 등록하세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayLeaderboard.map((item, index) => {
                  const isTop1 = index === 0
                  const isTop2 = index === 1
                  const isTop3 = index === 2

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isTop1
                          ? 'bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-amber-500/50 shadow-md shadow-amber-500/10'
                          : isTop2
                          ? 'bg-slate-950 border-slate-700'
                          : isTop3
                          ? 'bg-slate-950 border-slate-800'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank Badge */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                            isTop1
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                              : isTop2
                              ? 'bg-slate-300 text-slate-950'
                              : isTop3
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {index + 1}
                        </div>

                        {/* Numeric Name */}
                        <div>
                          <div className="text-base font-mono font-extrabold text-white flex items-center gap-2">
                            <span>#{item.numericName}</span>
                            {isTop1 && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-sans font-bold">
                                👑 현재 1위
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            맞힌 개수: {item.correctCount}개 | 최대 콤보: {item.maxCombo} Combo
                          </div>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <div className="text-xl font-mono font-black text-emerald-400">
                          {item.score.toLocaleString()} <span className="text-xs text-slate-400 font-sans font-normal">점</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {new Date(item.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT 3: HALL OF FAME */}
        {activeTab === 'hof' && (
          <div className="w-full max-w-3xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="pb-4 border-b border-slate-800 space-y-1">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>명예의 전당 (Hall of Fame)</span>
              </h3>
              <p className="text-xs text-slate-400">
                매일 자정 00:00에 기록된 역대 전날의 최고 점수 1위 챔피언 목록입니다.
              </p>
            </div>

            {hallOfFame.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                명예의 전당 기록이 아직 축적되지 않았습니다.
              </div>
            ) : (
              <div className="grid gap-3">
                {hallOfFame.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/20 border border-amber-500/30 gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{item.date} 챔피언</span>
                        </div>
                        <div className="text-lg font-mono font-bold text-white">
                          숫자 이름: <span className="text-amber-300">#{item.numericName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                      <div className="text-xl font-mono font-black text-amber-300">
                        {item.score.toLocaleString()} 점
                      </div>
                      <div className="text-xs text-slate-400">
                        맞힌 문제: {item.correctCount}개 | {item.maxCombo} Combo
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </section>

    </main>
  )
}
