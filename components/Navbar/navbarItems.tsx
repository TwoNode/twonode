"use client";
import { SidebarItems } from "@/types";
import { Columns3, Home, Users, Rss, CircleHelp } from "lucide-react";

export const navbarItems: SidebarItems = {
  links: [
    { label: "Home", href: "/", icon: Home },
    { label: "About Us", href: "/about-us", icon: Users },
    { label: "Our Services", href: "/services", icon: Columns3 },
    { label: "Contact Us", href: "/contact", icon: Rss },
    { label: "Gallery", href: "/gallery", icon: CircleHelp },
  ],
};
