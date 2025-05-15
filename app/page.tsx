import { redirect } from 'next/navigation'
import constants from '@/lib/constants'
import { useSupabaseSession } from '@/components/supabase-session-provider'

export default async function Home() {
  const { session } = useSupabaseSession()
  if (session) {
    redirect(constants.DEFAULT_ROUTE)
  } else {
    redirect('/login')
  }
}
