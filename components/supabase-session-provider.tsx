'use client'

import { Session } from "@supabase/supabase-js"
import { createContext, useContext } from "react"

type SupabaseRoleContext = {
    session: Session | undefined
}

const Context = createContext<SupabaseRoleContext | undefined>(undefined)

export default function SupabaseSessionProvider({ session, children }: {session: Session | undefined, children: React.ReactNode }) {
   
   
    return (
        <Context.Provider value={{ session }}>
            {children}
        </Context.Provider>
    )
}

export function useSupabaseSession() {
    const context = useContext(Context)
    if (context === undefined) {
        throw new Error('useSupabaseSession must be used within a SupabaseSessionProvider')
    }
    return context
}

