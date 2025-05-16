
import { redirect } from 'next/navigation'
import constants from '@/lib/constants'
import { createClient } from '@/utils/supabase-server'

export default async function Home() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session) {
    redirect(constants.DEFAULT_ROUTE)
  } else {
    redirect('/login')
  }
}
