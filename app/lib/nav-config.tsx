// app/lib/nav-config.tsx
import { 
  Users, Calendar, UserSquare2, AlertOctagon, BarChart3, VenetianMask, 
  Mic2, Megaphone, LayoutGrid, GraduationCap, Theater, Banknote, 
  SlidersHorizontal, Sparkles, FilePlus, Home, ClipboardCheck, 
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
      { label: "Scheduler", href: "/schedule", icon: Calendar },
      // 🟢 The Director's post-rehearsal dashboard
      { label: "Nightly Report", href: "/production/active/report", icon: BookOpen, permission: "manage_casting" },
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
      // 🟢 One-click CSV export for the costume team
      { label: "Costume Wardrobe", href: "/production/active/costumes", icon: Scissors, permission: "view_cast_list" },
      
      { 
        label: "Audition Check-In", 
        href: "/production/active/check-in", 
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
           { label: "Assignments", href: "/committees", icon: Users },
           { label: "Weekly Reports", href: "/committees/reports", icon: ClipboardList }
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
      // 🟢 Concatenated bios and ads for InDesign
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