import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/zlecenia", label: "Zlecenia", icon: ClipboardList },
  { href: "/klienci", label: "Klienci", icon: Users },
  { href: "/wyceny", label: "Wyceny", icon: FileText },
  { href: "/kalendarz", label: "Kalendarz", icon: CalendarDays },
  { href: "/zadania", label: "Zadania", icon: ListChecks },
  { href: "/raporty", label: "Raporty", icon: BarChart3 },
  { href: "/ustawienia", label: "Ustawienia", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
