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
    title: '구구단 스피드 챌린지',
    description: '45초 동안 신속하게 구구단 문제를 맞춰 콤보 점수를 획득하는 미니 게임입니다.',
    emoji: '🎯',
    status: 'active',
  },
  // 추후 미적분 관련 게임(극한, 미분, 적분 등)이 완성될 때 여기에 활성화하여 추가
]
