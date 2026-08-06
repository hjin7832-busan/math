import GraphWidget from '@/components/MathGraphCanvas'
import QRWidget from '@/components/QRWidget'

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-start px-6 pt-16 pb-12 max-w-3xl mx-auto w-full">

      {/* 타이틀 + QR */}
      <div className="w-full flex items-start justify-between mb-12">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          수학공부HYO
        </h1>
        <QRWidget />
      </div>

      {/* 그래프 영역 */}
      <div className="w-full">
        <GraphWidget />
      </div>

    </div>
  )
}
