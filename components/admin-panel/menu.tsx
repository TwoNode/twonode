// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";

// import { cn } from "@/lib/utils";
// import { ScrollArea } from "@/components/ui/scroll-area";

// import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
// import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
// import {
//   Home,
//   ListChecks,
//   Map,
//   FilePlus,
//   Settings,
//   LogOut,
// } from "lucide-react";

// interface MenuProps {
//   isOpen: boolean | undefined;
// }

// export function Menu({ isOpen }: MenuProps) {
//   const pathname = usePathname();
//   const { user } = useKindeBrowserClient();

//   const isActive = (url: string) => {
//     return pathname === url;
//   };

//   const activeClassName = "bg-[#008cff6e] text-[#032740]";
//   const inactiveClassName = "text-[#032740]";
//   const activeIconClassName = "text-[#032740]";
//   const inactiveIconClassName = "text-[#032740]";

//   const dashboardUrl = "/reva/dashboard";

//   const menuList = [
//     { icon: Home, label: "Home", url: dashboardUrl },
//     {
//       icon: ListChecks,
//       label: "All Requests",
//       url: `${dashboardUrl}/allrequests`,
//     },
//     { icon: Map, label: "View Map", url: `${dashboardUrl}/viewmap` },
//     { icon: FilePlus, label: "New Request", url: `${dashboardUrl}/newrequest` },
//     { icon: Settings, label: "Settings", url: `${dashboardUrl}/settings` },
//     {
//       element: (
//         <LogoutLink
//           key={"logout"}
//           // postLogoutRedirectURL="/dashboard"
//           className="flex flex-col items-center justify-center gap-2.5 w-full h-[60px] rounded-lg"
//         >
//           <span className="w-max lg:mx-auto">
//             <LogOut />
//           </span>
//           <span className="text-center text-[#032740] text-[10px] font-medium font-['Eudoxus Sans']">
//             Logout
//           </span>
//         </LogoutLink>
//       ),
//       label: "Logout",
//       url: "/login",
//     },
//   ];

//   return (
//     <ScrollArea className="bg-[#f0f2f4] [&>div>div[style]]:!block h-full">
//       <nav className="pt-14 h-full w-full flex flex-col justify-between overflow-y-auto box-border max-h-[85vh]">
//         <ul className="flex flex-col gap-6 items-start space-y-1 px-2 justify-center">
//           {menuList.map((item, index) =>
//             item?.element ? (
//               item?.element
//             ) : (
//               <Link
//                 className={cn(
//                   "flex flex-col items-center justify-center gap-2.5 w-full h-[60px] rounded-lg",
//                   isActive(item.url) ? activeClassName : inactiveClassName,
//                   isActive(item.url)
//                     ? activeIconClassName
//                     : inactiveIconClassName
//                 )}
//                 href={item.url}
//                 key={index}
//               >
//                 <span className="w-max lg:mx-auto">
//                   {" "}
//                   <item.icon className="w-5 h-5" />
//                   {/* {item.icon} */}
//                 </span>
//                 <span className="text-center text-[#032740] text-[10px] font-medium font-['Eudoxus Sans']">
//                   {item.label}
//                 </span>
//               </Link>
//             )
//           )}
//         </ul>

//         <div className="mt-20 pb-12">
//           <div className="image ">
//             <img
//               className="w-20 h-20 rounded-full mx-auto"
//               src={user?.picture!}
//             />
//           </div>
//         </div>
//       </nav>
//     </ScrollArea>
//   );
// }

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LucideIcon } from "lucide-react";
import { LucideUser } from "lucide-react";

interface LinkItem {
  icon: LucideIcon;
  label: string;
  url: string;
}

interface ElementItem {
  element: any;
}

export type MenuItem = LinkItem | ElementItem;

export interface MenuProps {
  items: MenuItem[];
  userImageUrl?: string;
}

export function Menu({ items, userImageUrl = "" }: MenuProps) {
  const pathname = usePathname();

  const isActive = (url: string) => pathname === url;

  const activeClassName = "bg-[#008cff6e] text-[#032740]";
  const inactiveClassName = "text-[#032740]";
  const activeIconClassName = "text-[#032740]";
  const inactiveIconClassName = "text-[#032740]";

  return (
    <ScrollArea className="bg-[#f0f2f4] [&>div>div[style]]:!block h-full">
      <nav className="pt-14 h-full w-full flex flex-col justify-between overflow-y-auto box-border max-h-[85vh]">
        <ul className="flex flex-col gap-6 items-start space-y-1 px-2 justify-center">
          {items.map((item, index) =>
            "element" in item ? (
              item?.element
            ) : (
              <Link
                key={index}
                href={item.url}
                className={cn(
                  "flex flex-col items-center justify-center gap-2.5 w-full h-[60px] rounded-lg",
                  isActive(item.url) ? activeClassName : inactiveClassName,
                  isActive(item.url)
                    ? activeIconClassName
                    : inactiveIconClassName
                )}
              >
                <span className="w-max lg:mx-auto">
                  <item.icon className="w-5 h-5" />
                </span>
                <span className="text-center text-[#032740] text-[10px] font-medium font-['Eudoxus Sans']">
                  {item.label}
                </span>
              </Link>
            )
          )}
        </ul>

        <div className="mt-20 pb-12">
          <div className="image">
            {userImageUrl ? (
              <img
                className="w-20 h-20 rounded-full mx-auto"
                src={userImageUrl}
                alt="User Avatar"
                onError={(e) => {
                  e.currentTarget.src = ""; // Fallback to no image
                  e.currentTarget.alt = "No Image";
                }}
              />
            ) : (
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-gray-200 text-gray-500">
                <LucideUser size={40} />
              </div>
            )}
          </div>
        </div>
      </nav>
    </ScrollArea>
  );
}
