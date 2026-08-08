import GraphWidget from '@/components/MathGraphCanvas'
import QRWidget from '@/components/QRWidget'

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-start px-6 pt-16 pb-12 max-w-3xl mx-auto w-full">

      {/* 타이틀 + QR */}
      <div className="w-full flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            수학공부HYO
          </h1>
          <p className="text-sm text-gray-400 mt-1">함수 그래프 탐구 & 미적분 학습</p>
        </div>
        <QRWidget />
      </div>

      {/* 그래프 영역 */}
      <div className="w-full">
        <GraphWidget />
      </div>

    </div>
  )
}
