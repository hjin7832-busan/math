import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { NAVIGATION_ITEMS } from '@/lib/nav'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: '수학공부 HYO | 시각화 & 미적분 수학 탐구',
  description: '수학공부 HYO와 함께하는 인터랙티브 함수 그래프 시각화 및 재미있는 수학 게임 탐구',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="dark scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white`}>
        
        {/* Background Math Ambient Glow */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
        </div>

        {/* Header / Navigation */}
        <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-slate-950/75 border-b border-slate-800/80 shadow-lg shadow-slate-950/50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <Link 
                href="/" 
                className="group flex items-center gap-2 text-xl font-bold tracking-tight text-white transition-all duration-300 hover:opacity-90"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                  <span className="font-serif italic font-black text-lg">∫</span>
                </div>
                <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent group-hover:from-indigo-300 group-hover:to-cyan-300 transition-colors">
                  수학공부 HYO
                </span>
              </Link>
            </div>

            {/* Navigation Menu (Exclusively 2026미적분1, extensible array structure) */}
            <nav className="flex items-center gap-2">
              {NAVIGATION_ITEMS.map((item) => (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-slate-200 bg-slate-900/90 border border-slate-700/60 hover:bg-slate-800 hover:border-indigo-500/60 hover:text-white transition-all shadow-sm hover:shadow-indigo-500/10"
                  >
                    <span>{item.title}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold tracking-wider bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-full uppercase">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </div>
              ))}
            </nav>

          </div>
        </header>

        {/* Main Content */}
        <div className="relative z-10 flex-1 flex flex-col">
          {children}
        </div>

        {/* Footer */}
        <footer className="relative z-10 w-full py-8 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md text-center mt-20">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>수학공부 HYO — 시각적 수학 탐구 & 미적분 학습</span>
            </div>
            <p>
              © {new Date().getFullYear()} <span className="text-slate-300 font-semibold">수학공부 HYO</span>. All rights reserved.
            </p>
          </div>
        </footer>

      </body>
    </html>
  )
}
