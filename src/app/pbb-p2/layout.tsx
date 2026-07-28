"use client"

import { ReactNode } from "react"
import { PbbProvider } from "@/context/PbbContext"

export default function PbbLayout({ children }: { children: ReactNode }) {
  return <PbbProvider>{children}</PbbProvider>
}
