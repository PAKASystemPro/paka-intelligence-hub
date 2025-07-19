"use client"

import * as React from "react"

type SidebarState = {
  open: boolean
  setOpen: (open: boolean) => void
}

const initialState: SidebarState = {
  open: false,
  setOpen: () => null,
}

export const SidebarContext = React.createContext<SidebarState>(initialState)

export function SidebarProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState<boolean>(false)

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}
