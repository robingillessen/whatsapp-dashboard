"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/supabase-provider";
import { BroadcastFromDB } from "@/lib/repositories/broadcast/BroadcastRepository";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/utils/useDebounce";
import { useSupabaseUser } from "@/components/supabase-user-provider"


export default function WatchForChanges({ page }: { page: number }) {
    const { supabase } = useSupabase()
    const router = useRouter();
    const { session } = useSupabaseUser()
    const refreshRouterDebounce = useDebounce(() => {
        router.refresh()
    }, 2000);

    useEffect(() => {
        supabase.realtime.setAuth(session?.access_token ?? null)
        const channel = supabase
            .channel('schema-db-changes')
            .on<BroadcastFromDB>('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'broadcast',
            },
            payload => {
                refreshRouterDebounce();
            }
        )
        .subscribe()
        return () => { supabase.removeChannel(channel) }
    });
    return <></>
}