import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase-server";

export default async function LoginWrapper({ children }: { children: React.ReactNode }) {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    if (data.session) {
        redirect('/post-login')
    } else {
        return (
            <>
                {children}
            </>
        )
    }
}