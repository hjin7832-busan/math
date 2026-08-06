'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function QRWidget() {
  const [url, setUrl] = useState('')

  useEffect(() => {
    setUrl(window.location.origin)
  }, [])

  if (!url) return null

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="p-2.5 border border-gray-100 rounded-xl bg-white shadow-sm">
        <QRCodeSVG value={url} size={96} bgColor="#ffffff" fgColor="#111827" level="M" />
      </div>
      <p className="text-[11px] text-gray-400 font-mono">{url}</p>
    </div>
  )
}
