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
  category?: string
}

export const GAMES: GameMeta[] = [
  {
    id: 'gugudan',
    title: '구구단 팡팡 (Speed & Blast)',
    description: '떨어지는 풍선/버블 속 정답을 조준하거나 빠르게 주관식/키패드로 타격하세요! 연속 정답 시 Fever 타임 발동!',
    emoji: '🎯',
    status: 'active',
    category: '기초연산',
  },
  {
    id: 'limit-concept',
    title: '극한의 도전 (Limit Master)',
    description: 'x→a로 접근할 때 좌극한·우극한·수렴값을 신속하게 판단하여 목표 점수를 달성하세요.',
    emoji: '♾️',
    status: 'active',
    category: '극한',
  },
  {
    id: 'derivative-quiz',
    title: '미분계수 순발력 레이스',
    description: 'f(x)의 특정 x값에서 미분계수 f\'(x)를 신속하게 계산하고 접선의 기울기를 구하세요.',
    emoji: '⚡',
    status: 'soon',
    category: '미분',
  },
  {
    id: 'integral-area',
    title: '정적분 넓이 사냥꾼',
    description: '그래프 아래 면적(정적분)을 직관적으로 추정하고 계산하는 챌린지입니다.',
    emoji: '📐',
    status: 'soon',
    category: '적분',
  },
]
