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

export const gbcNavbarItems: SidebarItems = {
  links: [
    { label: "Home", href: "/gbc", icon: Home },
    { label: "Tickets", href: "/gbc/tickets", icon: Calendar },
    { label: "About Us", href: "/gbc/about", icon: Users },
    { label: "Sponsors", href: "/gbc/sponsors", icon: Columns3 },
    { label: "Speakers", href: "/gbc/speakers", icon: Columns3 },
    { label: "Contact Us", href: "/gbc/contact", icon: Rss },
    { label: "Gallery", href: "/gbc/gallery", icon: CircleHelp },
  ],
};
