"use client"

import { createContext, useContext } from "react"
import type { UserRole } from "@/types"

export interface SessionUser {
  full_name: string
  email: string
  role: UserRole
}

const SessionUserContext = createContext<SessionUser | null>(null)

/** The signed-in user, loaded by the dashboard layout. */
export function SessionUserProvider({ value, children }: { value: SessionUser; children: React.ReactNode }) {
  return <SessionUserContext.Provider value={value}>{children}</SessionUserContext.Provider>
}

export function useSessionUser(): SessionUser {
  return useContext(SessionUserContext) ?? { full_name: "", email: "", role: "ADMIN" }
}

export const ROLE_LABELS: Record<UserRole, string> = { ADMIN: "Admin", STAFF: "Therapist" }
