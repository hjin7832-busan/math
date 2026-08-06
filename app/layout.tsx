import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { NAVIGATION_ITEMS } from '@/lib/nav'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: '수학공부HYO',
  description: '수학공부HYO — 재미있는 수학 탐구',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} font-sans antialiased bg-white text-gray-900 min-h-screen flex flex-col`}>

        {/* 헤더: 극도로 단순 */}
        <header className="border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold text-gray-900 tracking-tight">
              수학공부HYO
            </Link>
            <nav className="flex items-center gap-6">
              {NAVIGATION_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {/* 본문 */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* 푸터 */}
        <footer className="border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-6 h-12 flex items-center">
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} 수학공부HYO</p>
          </div>
        </footer>

      </body>
    </html>
  )
}
