'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Copy, Check, ExternalLink } from 'lucide-react'

export default function QRCodeWidget() {
  const [currentUrl, setCurrentUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }, [])

  const handleCopy = () => {
    if (!currentUrl) return
    navigator.clipboard.writeText(currentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-indigo-950/40 relative overflow-hidden group hover:border-slate-700 transition-all">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">모바일 QR 접속</h3>
            <p className="text-[11px] text-slate-400">카메라로 스캔하여 접속하세요</p>
          </div>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          실시간 연동
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* QR Code Canvas */}
        <div className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 flex items-center justify-center shrink-0">
          {currentUrl ? (
            <QRCodeSVG
              value={currentUrl}
              size={120}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="H"
              includeMargin={false}
            />
          ) : (
            <div className="w-[120px] h-[120px] bg-slate-100 rounded animate-pulse" />
          )}
        </div>

        {/* Info & Copy Button */}
        <div className="flex-1 flex flex-col justify-between h-full space-y-3 w-full text-center sm:text-left">
          <div className="space-y-1">
            <div className="text-xs text-slate-400">현재 웹사이트 URL</div>
            <div className="text-xs font-mono text-indigo-300 truncate max-w-[200px] bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              {currentUrl || 'https://math-hyo.vercel.app'}
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>페이지 URL 복사하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
