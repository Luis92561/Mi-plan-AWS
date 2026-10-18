import {
  BookOpen,
  CalendarClock,
  ClipboardList,
  Coins,
  FileText,
  Gauge,
  LayoutDashboard,
  Library,
  ListChecks,
  Map,
  Settings,
  SquarePen,
  Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TKey } from '@/lib/i18n/shape';

export interface NavItem {
  to: string;
  labelKey: TKey;
  icon: LucideIcon;
  /** Numeral que se muestra a la izquierda en desktop (§9.4). */
  no: string;
  zone: 'main' | 'more';
  /** Aparece en la barra inferior móvil. */
  bottom?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.inicio', icon: LayoutDashboard, no: '01', zone: 'main', bottom: true },
  { to: '/hoy', labelKey: 'nav.hoy', icon: Target, no: '02', zone: 'main', bottom: true },
  { to: '/ruta', labelKey: 'nav.ruta', icon: Map, no: '03', zone: 'main', bottom: true },
  { to: '/notas', labelKey: 'nav.notas', icon: FileText, no: '04', zone: 'main', bottom: true },
  { to: '/bitacora', labelKey: 'nav.bitacora', icon: BookOpen, no: '05', zone: 'more' },
  { to: '/practica', labelKey: 'nav.practica', icon: Gauge, no: '06', zone: 'more' },
  { to: '/recursos', labelKey: 'nav.recursos', icon: Library, no: '07', zone: 'more' },
  { to: '/presupuesto', labelKey: 'nav.presupuesto', icon: Coins, no: '08', zone: 'more' },
  { to: '/repaso', labelKey: 'nav.repaso', icon: SquarePen, no: '09', zone: 'more' },
  { to: '/checklist', labelKey: 'nav.checklist', icon: ListChecks, no: '10', zone: 'more' },
  { to: '/recordatorios', labelKey: 'nav.recordatorios', icon: CalendarClock, no: '11', zone: 'more' },
  { to: '/exportar', labelKey: 'nav.exportar' as TKey, icon: ClipboardList, no: '12', zone: 'more' },
  { to: '/ajustes', labelKey: 'nav.ajustes', icon: Settings, no: '13', zone: 'more' },
];

export const BOTTOM_ITEMS = NAV_ITEMS.filter((item) => item.bottom);

export const MORE_ITEMS = NAV_ITEMS.filter((item) => item.zone === 'more');
