"use client";
import { SidebarItems } from "@/types";
import {
  Columns3,
  Home,
  Users,
  Rss,
  CircleHelp,
  Calendar,
  Zap,
  LayoutDashboard,
} from "lucide-react";

export const navbarItems: SidebarItems = {
  links: [
    { label: "Home", href: "/", icon: Home },
    {
      label: "REVA",
      href: "/reva",
      icon: LayoutDashboard,
      important: true,
      className:
        "bg-linear-to-r from-green-600 to-green-800 text-white px-3 py-1.5 rounded-md",
    },
    {
      label: "Surfboard",
      href: "/surfboard",
      icon: Zap,
      important: true,
      className:
        "bg-linear-to-r from-blue-600 to-blue-800 text-white px-3 py-1.5 rounded-md",
    },
    { label: "Events", href: "/events", icon: Calendar },
    // { label: "Present", href: "/present", icon: Calendar },
    { label: "About Us", href: "/about-us", icon: Users },
    { label: "Our Services", href: "/services", icon: Columns3 },
    { label: "Contact Us", href: "/contact", icon: Rss },
    { label: "Gallery", href: "/gallery", icon: CircleHelp },
  ],
};
