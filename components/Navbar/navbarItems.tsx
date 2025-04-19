"use client";
import { SidebarItems } from "@/types";
import { Columns3, Home, Users, Rss, CircleHelp, Calendar } from "lucide-react";

export const navbarItems: SidebarItems = {
  links: [
    { label: "Home", href: "/", icon: Home },
    { label: "REVA", href: "/reva", icon: Calendar, important: true },
    { label: "Events", href: "/gbc", icon: Calendar },
    // { label: "Present", href: "/present", icon: Calendar },
    { label: "About Us", href: "/about-us", icon: Users },
    { label: "Our Services", href: "/services", icon: Columns3 },
    { label: "Contact Us", href: "/contact", icon: Rss },
    { label: "Gallery", href: "/gallery", icon: CircleHelp },
  ],
};
