import {
  LayoutGrid,
  ListFilter,
  ListChecks,
  Timer,
  Focus,
  BarChart3,
  Sparkles,
  Wand2,
  PartyPopper,
  User,
  Users,
  Building2,
  Code2,
  Webhook,
  KeyRound,
  GitCommit,
  BookOpen,
  LifeBuoy,
  MessageCircle,
  Mail,
  Globe,
  Newspaper,
  type LucideIcon,
} from 'lucide-react';

export interface MenuItem {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  comingSoon?: boolean;
}

export interface MenuColumn {
  heading: string;
  items: MenuItem[];
  highlight?: boolean;
}

export interface MenuFooter {
  label: string;
  href: string;
}

export interface Menu {
  label: string;
  columns: MenuColumn[];
  footer?: MenuFooter;
}

export type MenuKey = 'product' | 'solutions' | 'developers' | 'resources';

export const MENU_ORDER: MenuKey[] = ['product', 'solutions', 'developers', 'resources'];

export const MENUS: Record<MenuKey, Menu> = {
  product: {
    label: 'Product',
    columns: [
      {
        heading: 'Plan',
        items: [
          { icon: LayoutGrid, title: 'Boards & Kanban', description: 'Drag, WIP limits, templates', href: '/docs/boards' },
          { icon: ListFilter, title: 'Lists & filters', description: 'Grouping, sort, saved views', href: '/docs/lists' },
          { icon: ListChecks, title: 'Bulk & shortcuts', description: 'Multi-select, move, delete', href: '/docs/shortcuts' },
        ],
      },
      {
        heading: 'Focus',
        items: [
          { icon: Timer, title: 'Pomodoro', description: 'Focus sessions on any task', href: '/docs/pomodoro' },
          { icon: Focus, title: 'Time tracking', description: 'Manual and running timers', href: '/docs/time' },
          { icon: BarChart3, title: 'Analytics', description: 'Personal and team insights', href: '/docs/analytics' },
        ],
      },
      {
        heading: 'AI magic',
        highlight: true,
        items: [
          { icon: Sparkles, title: 'AI breakdown', description: 'Split tasks into steps', href: '/docs/ai' },
          { icon: Wand2, title: 'NLP parsing', description: 'Type "tomorrow 9am"', href: '/docs/nlp' },
          { icon: PartyPopper, title: 'Celebrations', description: 'Confetti on done', href: '/docs/celebrations' },
        ],
      },
    ],
    footer: { label: 'Try the live demo', href: '/' },
  },
  solutions: {
    label: 'Solutions',
    columns: [
      {
        heading: 'By audience',
        items: [
          { icon: User, title: 'For Freelancers', description: 'Sprint + Freelancer template', href: '/solutions/freelancers' },
          { icon: Users, title: 'For small Teams', description: 'Workspaces, roles, shared boards', href: '/solutions/teams' },
          { icon: Building2, title: 'For Enterprise', description: 'SAML SSO, SCIM, Audit, On-prem', href: '/solutions/enterprise', comingSoon: true },
        ],
      },
    ],
  },
  developers: {
    label: 'Developers',
    columns: [
      {
        heading: 'Build',
        items: [
          { icon: Code2, title: 'Public API', description: 'REST read + write', href: '/docs/api' },
          { icon: Webhook, title: 'Webhooks', description: 'Signed event deliveries', href: '/webhooks' },
          { icon: KeyRound, title: 'API tokens', description: 'Personal access tokens', href: '/docs/tokens' },
          { icon: GitCommit, title: 'Changelog', description: 'Every release, every fix', href: '/changelog' },
        ],
      },
    ],
  },
  resources: {
    label: 'Resources',
    columns: [
      {
        heading: 'Read',
        items: [
          { icon: BookOpen, title: 'Documentation', description: 'Everything, in depth', href: '/docs' },
          { icon: LifeBuoy, title: 'Help center', description: 'How-tos, guides, shortcuts', href: '/help' },
          { icon: MessageCircle, title: 'Community', description: 'Discord & GitHub Discussions', href: '/community' },
          { icon: Mail, title: 'Contact us', description: 'olanusimojola@gmail.com', href: '/contact' },
          { icon: Globe, title: 'Blog & updates', description: 'Product news, tips, SEO', href: '/blog' },
          { icon: Newspaper, title: 'Status page', description: 'Uptime & incidents', href: '/status' },
        ],
      },
    ],
  },
};