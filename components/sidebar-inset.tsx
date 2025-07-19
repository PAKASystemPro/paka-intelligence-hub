"use client"

import * as React from "react"
import { useSidebar } from "@/components/sidebar-provider"
import { cn } from "@/lib/utils"

interface SidebarInsetProps extends React.HTMLAttributes<HTMLDivElement> {
  showOnMobile?: boolean
  children: React.ReactNode
}

export function SidebarInset({
  showOnMobile = false,
  className,
  children,
  ...props
}: SidebarInsetProps) {
  const { open } = useSidebar()

  return (
    <div
      className={cn(
        "bg-sidebar-accent/20 p-4 rounded-lg",
        open ? "block" : showOnMobile ? "block md:hidden" : "hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
