'use client'

import Link from 'next/link'
import QRCodeWidget from '@/components/QRCodeWidget'
import MathGraphCanvas from '@/components/MathGraphCanvas'
import { ArrowRight, BookOpen, Compass, Award, Sparkles, Brain, Code, Layers } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-12 space-y-16 max-w-7xl mx-auto w-full">
      
      {/* HERO SECTION */}
      <section className="w-full flex flex-col lg:flex-row items-center justify-between gap-10 pt-4 pb-6">
        
        {/* Left Hero Title & CTA */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>수학적 통찰과 재미를 나누는 공간</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-none">
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                수학공부 HYO
              </span>
            </h1>
            <p className="text-lg sm:text-xl font-medium text-slate-300 max-w-2xl">
              아름다운 함수 그래프 시각화부터 미적분 개념 게임까지, <br className="hidden sm:inline" />
              수학을 눈으로 확인하고 직관적으로 탐구하세요.
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
            <Link
              href="/2026미적분1"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 active:scale-[0.98] transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>2026미적분1 바로가기</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#interactive-graph"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm transition-all"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>함수 시각화 탐구</span>
            </a>
          </div>

          {/* Key Feature Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 max-w-lg mx-auto lg:mx-0">
            <div>
              <div className="text-xl font-bold text-white">Interactive</div>
              <div className="text-xs text-slate-400">실시간 그래프 시각화</div>
            </div>
            <div>
              <div className="text-xl font-bold text-cyan-300">2026</div>
              <div className="text-xs text-slate-400">미적분1 과정 연동</div>
            </div>
            <div>
              <div className="text-xl font-bold text-emerald-400">Daily Reset</div>
              <div className="text-xs text-slate-400">자정 리더보드 리셋</div>
            </div>
          </div>
        </div>

        {/* Right QR Code Widget */}
        <div className="w-full max-w-md shrink-0">
          <QRCodeWidget />
        </div>

      </section>

      {/* SECTION 2: INTERACTIVE FUNCTION GRAPH VISUALIZER */}
      <section id="interactive-graph" className="w-full flex flex-col items-center space-y-6 pt-4 scroll-mt-24">
        <div className="text-center space-y-2 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            <span>🎨 인터랙티브 수학 함수 시각화</span>
          </h2>
          <p className="text-sm text-slate-400">
            버튼을 눌러 다채로운 수식을 랜덤으로 그리거나 자신만의 수식을 직접 테스트해 보세요.
          </p>
        </div>

        {/* Math Graph Canvas Component */}
        <MathGraphCanvas />
      </section>

      {/* SECTION 3: COURSE & GAME HIGHLIGHT CARDS */}
      <section className="w-full pt-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            📚 탐구 강좌 & 수학 게임 하이라이트
          </h2>
          <p className="text-sm text-slate-400">
            회원가입 없이 숫자 이름(학번/PIN)만으로 간편하게 게임을 즐기고 기록을 남기세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: 2026 Calculus 1 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-indigo-500/50 transition-all group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/30">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300">
                ACTIVE COURSE
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                2026미적분1
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                미적분의 기초 개념부터 극값, 적분 넓이, 미분계수 순발력 퀴즈까지 연계된 수학 탐구 공간입니다.
              </p>
            </div>
            <Link
              href="/2026미적분1"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-semibold text-xs border border-indigo-500/30 transition-all"
            >
              <span>강좌 및 게임 이동</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Numeric Registration */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-cyan-500/50 transition-all group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/30">
                <Brain className="w-6 h-6" />
              </div>
              <div className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300">
                NO SIGNUP NEEDED
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                숫자 이름(학번/PIN) 참가
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                번거로운 회원가입 없이 4~5자리 숫자로 이루어진 나만의 전용 식별 번호로 챌린지에 도전하세요.
              </p>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-950 text-xs text-slate-400 border border-slate-800 font-mono text-center">
              예: 学番 20301 / PIN 1234
            </div>
          </div>

          {/* Card 3: Midnight Hall of Fame */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-amber-500/50 transition-all group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-500/30">
                <Award className="w-6 h-6" />
              </div>
              <div className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300">
                AUTOMATIC RESET
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                자정 리셋 & 명예의 전당
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                매일 자정(00:00)에 순위가 자동 초기화되며, 전날의 1위 기록은 날짜와 함께 '명예의 전당'에 영구 보존됩니다.
              </p>
            </div>
            <Link
              href="/2026미적분1?tab=hof"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-semibold text-xs border border-amber-500/30 transition-all"
            >
              <span>명예의 전당 보기</span>
              <Award className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </section>

    </main>
  )
}
