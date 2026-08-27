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
  {
    id: 'limit-guardian',
    title: '함수의 극한 마왕 대결 (Limit Guardian)',
    description: '0/0 꼴, ∞/∞ 꼴 등 부정형 극한 문제를 신속히 풀어 마왕 몬스터를 격파하는 쾌감 RPG 미니게임!',
    emoji: '🐉',
    status: 'active',
    category: '수학II · 함수의 극한',
  },
]
