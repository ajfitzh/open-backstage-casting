import { 
  Users, Calendar, UserSquare2, AlertOctagon, BarChart3, VenetianMask, 
  Mic2, Megaphone, LayoutGrid, GraduationCap, Theater, Banknote, 
  SlidersHorizontal, Sparkles, FilePlus, Home 
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
    permission: "view_cast_list", // Permissions logic from your sidebar
    items: [
      { label: "Show Hub", href: "/production", icon: Theater },
      { label: "Scheduler", href: "/schedule", icon: Calendar },
      { label: "Show Calibration", href: "/analysis", icon: SlidersHorizontal, permission: "manage_casting" },
      // Sub-menu for Casting
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
    permission: "view_cast_list",
    items: [
      { label: "Master Roster", href: "/roster", icon: UserSquare2 },
      { label: "Conflict Matrix", href: "/conflicts", icon: AlertOctagon },
      { label: "Committees", href: "/committees", icon: VenetianMask },
      { label: "Season Planner", href: "/season", icon: LayoutGrid },
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