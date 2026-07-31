import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'BusanHYO | Education Web App',
  description: '나만의 교육용 웹앱 만들기',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* 상단 헤더: 애플 감성의 반투명 유리 효과 (Glassmorphism) 적용 */}
        <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex-1 flex justify-start text-xl font-semibold tracking-tighter text-gray-900">
              <a href="/">BusanHYO</a>
            </div>
            <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
              <a href="/2026미적분1" className="hover:text-gray-900 transition-colors">2026미적분1</a>
              <a href="/2026인간과심리" className="hover:text-gray-900 transition-colors">2026인간과심리</a>
              <a href="/2026창체진로" className="hover:text-gray-900 transition-colors">2026창체진로</a>
            </nav>
            <div className="flex-1 flex justify-end items-center gap-4 text-sm font-medium text-gray-600">
              <a href="/login" className="hover:text-gray-900 transition-colors">로그인</a>
              <a href="/signup" className="hover:text-gray-900 transition-colors">가입</a>
            </div>
          </div>
        </header>

        {children}

        {/* 하단 푸터 */}
        <footer className="w-full py-8 mt-20 border-t border-gray-200/50 bg-white/30 text-center">
          <p className="text-sm text-gray-500 font-medium">
            © {new Date().getFullYear()} BusanHYO. All rights reserved.
          </p>
        </footer>
      </body>
    </html>
  )
}
