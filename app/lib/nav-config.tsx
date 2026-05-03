import { 
  Users, Calendar, UserSquare2, AlertOctagon, BarChart3, VenetianMask, 
  Mic2, Megaphone, LayoutGrid, GraduationCap, Theater, Banknote, 
  SlidersHorizontal, Sparkles, FilePlus, Home, ClipboardCheck 
} from 'lucide-react';

export const NAV_CONFIG = [
  {
    title: "Dashboard",
    items: [
      { label: "Dashboard", href: "/", icon: Home }
    ]
  },
  {
    title: "Creative Team",
    color: "text-blue-500",
    permission: "view_cast_list",
    items: [
      { label: "Show Hub", href: "/production", icon: Theater },
      { label: "Scheduler", href: "/schedule", icon: Calendar },
      { label: "Show Calibration", href: "/analysis", icon: SlidersHorizontal, permission: "manage_casting" },
      { 
        label: "Casting Suite", 
        icon: Users, 
        isCollapsible: true,
        permission: "view_auditions",
        children: [
           { label: "Auditions", href: "/auditions", icon: Mic2 },
           { label: "Callbacks", href: "/callbacks", icon: Megaphone, permission: "manage_casting" },
           { label: "Cast Grid", href: "/casting", icon: LayoutGrid, permission: "manage_casting" }
        ]
      }
    ]
  },
  {
    title: "Logistics & Ops",
    color: "text-emerald-500",
    items: [
      { label: "Master Roster", href: "/roster", icon: UserSquare2, permission: "view_cast_list" },
      { label: "Conflict Matrix", href: "/conflicts", icon: AlertOctagon, permission: "view_cast_list" },
      // 🟢 NEW: Check-In Board for the specific RBAC group
      { label: "Check-In Board", href: "/production/active/check-in", icon: ClipboardCheck, group: "Check In Team" },
      { label: "Committees", href: "/committees", icon: VenetianMask, permission: "manage_committees" },
      { label: "Season Planner", href: "/season", icon: LayoutGrid, permission: "view_cast_list" },
    ]
  },
  {
    title: "Business Office",
    color: "text-amber-500",
    permission: "view_financials",
    items: [
      { label: "Reports & Fees", href: "/reports", icon: BarChart3 },
      { label: "Show Analytics", href: "/analytics", icon: Banknote },
    ]
  },
  {
    title: "Academy",
    color: "text-pink-500",
    permission: "edit_compliance",
    items: [
      { label: "Class Manager", href: "/education", icon: GraduationCap },
      { label: "Proposals & Bounties", href: "/education/proposals", icon: FilePlus },
      { label: "Hiring Portal", href: "/education/hiring", icon: UserSquare2 },
      { label: "Faculty Portal", href: "/education/portal", icon: Sparkles },
      { label: "Class Planner", href: "/education/planning", icon: LayoutGrid },
    ]
  }
];