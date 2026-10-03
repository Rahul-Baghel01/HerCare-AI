import {
  Activity,
  Baby,
  BarChart3,
  CalendarDays,
  Droplets,
  HeartPulse,
  LayoutDashboard,
  Pill,
  Settings,
  Sparkle,
  Salad,
  Smile,
  Stethoscope,
  User,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: typeof Activity };

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Today",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/assistant", label: "AI assistant", icon: Sparkle },
    ],
  },
  {
    title: "Tracking",
    items: [
      { to: "/cycle", label: "Cycle", icon: Droplets },
      { to: "/symptoms", label: "Symptoms", icon: Activity },
      { to: "/mood", label: "Mood journal", icon: Smile },
      { to: "/fertility", label: "Fertility", icon: HeartPulse },
      { to: "/pcos", label: "PCOS", icon: Stethoscope },
      { to: "/pregnancy", label: "Pregnancy", icon: Baby },
    ],
  },
  {
    title: "Wellness",
    items: [
      { to: "/wellness", label: "Daily wellness", icon: Salad },
      { to: "/medications", label: "Medications", icon: Pill },
      { to: "/appointments", label: "Appointments", icon: CalendarDays },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/profile", label: "Profile", icon: User },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const NAV_ICON_FALLBACK = CalendarDays;
