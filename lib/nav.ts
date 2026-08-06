export interface NavItem {
  title: string
  href: string
  isHot?: boolean
  badge?: string
  subItems?: { title: string; href: string }[]
}

// Extensible Navigation Structure (배열 기반 확장 네비게이션)
export const NAVIGATION_ITEMS: NavItem[] = [
  {
    title: '2026미적분1',
    href: '/2026미적분1',
    isHot: true,
    badge: 'NEW',
  },
  // Future year items can be uncommented or added here easily:
  // { title: '2027미적분1', href: '/2027미적분1' },
  // { title: '2028미적분1', href: '/2028미적분1' },
]
