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
    <div className="inline-flex flex-col items-center gap-2 bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
      <QRCodeSVG value={url} size={180} bgColor="#ffffff" fgColor="#111827" level="M" />
      <p className="text-xs text-gray-400 font-mono mt-1">{url}</p>
    </div>
  )
}
