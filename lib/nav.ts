export interface NavItem {
  title: string
  href: string
  badge?: string
}

// ── 확장형 네비게이션 배열 ────────────────────────────────────────
// 추후 2027미적분1, 2028미적분1 등 한 줄 추가로 메뉴 확장 가능
export const NAVIGATION_ITEMS: NavItem[] = [
  { title: '2026미적분1', href: '/2026미적분1' },
  // { title: '2027미적분1', href: '/2027미적분1' },
  // { title: '2028미적분1', href: '/2028미적분1' },
]
