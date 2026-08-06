import GraphWidget from '@/components/MathGraphCanvas'

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-start px-6 pt-16 pb-12 max-w-3xl mx-auto w-full">

      {/* 타이틀 */}
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-12">
        수학공부HYO
      </h1>

      {/* 그래프 영역 */}
      <div className="w-full">
        <GraphWidget />
      </div>

    </div>
  )
}
