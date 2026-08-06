// ─────────────────────────────────────────────────────────────────
// 게임 레지스트리 — 2026미적분1
//
// 새 게임을 추가하려면 GAMES 배열에 항목 한 개만 추가하면 됩니다.
// status: 'active'  → 플레이 가능
//         'soon'    → Coming Soon 표시
// ─────────────────────────────────────────────────────────────────

export interface GameMeta {
  id: string
  title: string
  description: string
  emoji: string
  status: 'active' | 'soon'
}

export const GAMES: GameMeta[] = [
  {
    id: 'gugudan',
    title: '구구단 스피드',
    description: '45초 안에 구구단 문제를 최대한 많이 맞혀 점수를 쌓으세요.',
    emoji: '✖️',
    status: 'active',
  },
  {
    id: 'derivative-quiz',
    title: '미분계수 순발력 퀴즈',
    description: '다항함수의 특정 점에서 순간변화율(미분계수)을 빠르게 계산하세요.',
    emoji: "f'",
    status: 'soon',
  },
  {
    id: 'integral-area',
    title: '적분 넓이 맞추기',
    description: '함수 그래프 아래의 정적분 넓이를 직관적으로 추정하는 퀴즈입니다.',
    emoji: '∫',
    status: 'soon',
  },
  {
    id: 'limit-concept',
    title: '극한값 퀴즈',
    description: '함수의 극한값을 계산하고 연속성을 판별하는 개념 퀴즈입니다.',
    emoji: 'lim',
    status: 'soon',
  },
]
