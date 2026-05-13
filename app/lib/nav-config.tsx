// app/lib/nav-config.tsx
import { 
  Users, Calendar, UserSquare2, AlertOctagon, BarChart3, VenetianMask, 
  Mic2, Megaphone, LayoutGrid, GraduationCap, Theater, Banknote, 
  SlidersHorizontal, Sparkles, FilePlus, Home, 
  UserCircle, ClipboardList, BookOpen, Mic, UserCheck, Scissors
} from 'lucide-react';

export const NAV_CONFIG = [
  {
    title: "My Family",
    color: "text-blue-400",
    items: [
      { label: "Family Hub", href: "/", icon: Home },
      { label: "Master Profile", href: "/settings/family", icon: UserCircle },
    ]
  },
  {
    title: "Creative Team",
    color: "text-blue-500",
    permission: "view_cast_list",
    items: [
      { label: "Show Hub", href: "/production", icon: Theater },
      // 🟢 Production-aware routing
      { label: "Scheduler", href: "/production/active/schedule", icon: Calendar },
      { label: "Nightly Report", href: "/production/active/report", icon: BookOpen, permission: "manage_casting" },
      { label: "Show Calibration", href: "/production/active/analysis", icon: SlidersHorizontal, permission: "manage_casting" },
      { 
        label: "Casting Suite", 
        icon: Users, 
        isCollapsible: true,
        permission: "view_auditions",
        children: [
           { label: "Auditions", href: "/production/active/auditions", icon: Mic2 },
           { label: "Callbacks", href: "/production/active/callbacks", icon: Megaphone, permission: "manage_casting" },
           { label: "Cast Grid", href: "/production/active/casting", icon: LayoutGrid, permission: "manage_casting" }
        ]
      }
    ]
  },
  {
    title: "Logistics & Ops",
    color: "text-emerald-500",
    items: [
      // 🟢 Production-aware routing for Roster and Conflicts
      { label: "Master Roster", href: "/production/active/roster", icon: UserSquare2, permission: "view_cast_list" },
      { label: "Conflict Matrix", href: "/production/active/conflicts", icon: AlertOctagon, permission: "view_cast_list" },
      { label: "Costume Wardrobe", href: "/production/active/costumes", icon: Scissors, permission: "view_cast_list" },
      
      { 
        label: "Audition Check-In", 
        href: "/production/active/audition-check-in", 
        icon: Mic, 
        permission: "view_checkin", 
        group: "Check In Team"      
      },
      { 
        label: "Daily Check-In", 
        href: "/production/active/rehearsal-check-in", 
        icon: UserCheck, 
        permission: "view_checkin", 
        group: "Check In Team"      
      },
      
      { 
        label: "Committee Team", 
        icon: VenetianMask, 
        isCollapsible: true,
        permission: "manage_committees",
        children: [
           { label: "Assignments", href: "/production/active/committees", icon: Users },
           { label: "Weekly Reports", href: "/production/active/committees/reports", icon: ClipboardList }
        ]
      },
      { label: "Season Planner", href: "/season", icon: LayoutGrid, permission: "view_cast_list" },
    ]
  },
  {
    title: "Business Office",
    color: "text-amber-500",
    permission: "view_financials",
    items: [
      { label: "Reports & Fees", href: "/reports", icon: BarChart3 },
      { label: "Playbill Exporter", href: "/reports/playbill", icon: BookOpen },
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