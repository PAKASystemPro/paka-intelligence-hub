"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LucideIcon, BarChart3, ShoppingCart, Users, Settings, Home } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/sidebar-provider"

interface AppSidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AppSidebar({ className, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const { open } = useSidebar()
  
  return (
    <div
      className={cn(
        "flex h-screen w-[220px] flex-col border-r bg-sidebar transition-all",
        open ? "w-[220px]" : "w-[80px]",
        className
      )}
      {...props}
    >
      <div className="flex h-[60px] items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className={cn("text-xl", !open && "sr-only")}>PAKA</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium">
          <NavItem href="/" icon={Home} active={pathname === "/"}>
            Dashboard
          </NavItem>
          <NavItem
            href="/analytics"
            icon={BarChart3}
            active={pathname.startsWith("/analytics")}
          >
            Analytics
          </NavItem>
          <NavItem
            href="/orders"
            icon={ShoppingCart}
            active={pathname.startsWith("/orders")}
          >
            Orders
          </NavItem>
          <NavItem
            href="/customers"
            icon={Users}
            active={pathname.startsWith("/customers")}
          >
            Customers
          </NavItem>
          <NavItem
            href="/settings"
            icon={Settings}
            active={pathname.startsWith("/settings")}
          >
            Settings
          </NavItem>
        </nav>
      </div>
    </div>
  )
}

interface NavItemProps {
  children: React.ReactNode
  href: string
  active?: boolean
  icon: LucideIcon
  expanded?: boolean
}

function NavItem({
  children,
  href,
  active,
  icon: Icon,
  expanded,
}: NavItemProps) {
  const { open } = useSidebar()
  
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all",
        active && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className={cn("grow", !open && "sr-only")}>{children}</span>
    </Link>
  )
}
