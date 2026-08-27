'use client'

import ContinuityBridgeGame from '@/components/ContinuityBridgeGame'
import Link from 'next/link'

export default function BridgeOfContinuityPage() {
  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/2026미적분1"
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          2026 미적분1 목록으로
        </Link>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
          수학 II · 함수의 극한과 연속
        </span>
      </div>

      <ContinuityBridgeGame />
    </div>
  )
}
