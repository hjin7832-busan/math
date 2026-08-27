'use client'

import React, { useMemo } from 'react'
import katex from 'katex'

interface MathViewProps {
  math: string
  inline?: boolean
  className?: string
}

/**
 * MathView - Renders LaTeX mathematical expressions beautifully using KaTeX.
 */
export default function MathView({ math, inline = false, className = '' }: MathViewProps) {
  const html = useMemo(() => {
    if (!math) return ''
    try {
      return katex.renderToString(math, {
        displayMode: !inline,
        throwOnError: false,
      })
    } catch (err) {
      console.warn('KaTeX render error:', err)
      return math
    }
  }, [math, inline])

  return (
    <span
      className={`inline-flex items-center ${inline ? 'px-1' : 'py-1 px-2'} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
