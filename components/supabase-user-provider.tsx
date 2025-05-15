'use client'

import { Session } from "@supabase/supabase-js"
import { createContext, useContext, useEffect } from "react"
import { useSupabase } from "./supabase-provider"

type SupabaseRoleContext = {
    session: Session | undefined
}

const Context = createContext<SupabaseRoleContext | undefined>(undefined)

export default function SupabaseUserProvider({ session, children }: {session: Session | undefined, children: React.ReactNode }) {
    const { supabase } = useSupabase();
   
    return (
        <Context.Provider value={{ session }}>
            {children}
        </Context.Provider>
    )
}

export function useSupabaseUser() {
    const context = useContext(Context)
    if (context === undefined) {
        throw new Error('useSupabaseRole must be used within a SupabaseRoleProvider')
    }
    return context
}

export function useUserRole() {
    const { session } = useSupabaseUser()
    return session?.user.user_metadata?.custom_user_role
}
