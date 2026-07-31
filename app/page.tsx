import { Plus } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 lg:p-24">
      <div className="max-w-3xl w-full text-center space-y-8 flex flex-col items-center">
        {/* 영웅(Hero) 섹션 환영 문구 */}
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 pb-2">
          나만의 교육용 웹앱 만들기
        </h1>
        
        <p className="text-lg lg:text-xl text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
          애플 스타일의 부드럽고 세련된 디자인으로 시작하세요.
          여기에서 새로운 교육 경험을 디자인할 수 있습니다.
        </p>

        {/* 가짜(Placeholder) 기능 추가 버튼 */}
        <button className="group mt-8 flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span>새 프로젝트 시작하기</span>
        </button>
      </div>
    </main>
  )
}
