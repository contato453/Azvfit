import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Dumbbell,
  ClipboardList,
  Trophy,
  MoreHorizontal,
  Target,
  Watch,
  CalendarDays,
  FileText,
  ShieldCheck,
  User,
  Gauge,
  CheckSquare,
  Users,
  Medal,
  BarChart3,
  Settings,
  History,
  Award,
  UserPlus,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

/** Barra inferior mobile-first do colaborador (5 itens principais + "Mais"). */
export const COLABORADOR_BOTTOM_NAV: NavItem[] = [
  { label: 'Início', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Atividades', to: '/atividades', icon: Dumbbell },
  { label: 'Registros', to: '/meus-registros', icon: ClipboardList },
  { label: 'Ranking', to: '/ranking', icon: Trophy },
  { label: 'Mais', to: '/mais', icon: MoreHorizontal },
]

/** Itens completos do colaborador, usados na tela "Mais" e em telas largas. */
export const COLABORADOR_NAV: NavItem[] = [
  { label: 'Início', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Atividades', to: '/atividades', icon: Dumbbell },
  { label: 'Meus registros', to: '/meus-registros', icon: ClipboardList },
  { label: 'Missões', to: '/missoes', icon: Target },
  { label: 'TotalPass', to: '/totalpass', icon: Watch },
  { label: 'Eventos', to: '/eventos', icon: CalendarDays },
  { label: 'Ranking', to: '/ranking', icon: Trophy },
  { label: 'Regulamento', to: '/regulamento', icon: FileText },
  { label: 'Privacidade', to: '/privacidade', icon: ShieldCheck },
  { label: 'Perfil', to: '/perfil', icon: User },
]

export const ADMIN_NAV: NavItem[] = [
  { label: 'Painel', to: '/admin', icon: Gauge },
  { label: 'Validação', to: '/admin/validacao', icon: CheckSquare },
  { label: 'Atividades', to: '/admin/atividades', icon: Dumbbell },
  { label: 'Participantes', to: '/admin/participantes', icon: Users },
  { label: 'Usuários', to: '/admin/usuarios', icon: UserPlus },
  { label: 'Missões', to: '/admin/missoes', icon: Target },
  { label: 'TotalPass', to: '/admin/totalpass', icon: Watch },
  { label: 'Eventos', to: '/admin/eventos', icon: CalendarDays },
  { label: 'Ranking', to: '/admin/ranking', icon: Medal },
  { label: 'Premiações', to: '/admin/premiacoes', icon: Award },
  { label: 'Edições', to: '/admin/edicoes', icon: CalendarDays },
  { label: 'Relatórios', to: '/admin/relatorios', icon: BarChart3 },
  { label: 'Configurações', to: '/admin/configuracoes', icon: Settings },
  { label: 'Auditoria', to: '/admin/auditoria', icon: History },
]
