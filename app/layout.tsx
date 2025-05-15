import 'server-only'

import SupabaseUserProvider from '@/components/supabase-user-provider'
import { createClient } from '@/utils/supabase-server'
import NextTopLoader from 'nextjs-toploader'
import './globals.css'
import SupabaseProvider from '@/components/supabase-provider'

// do not cache this layout
export const revalidate = 0

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="en">
      <head>
        <title>Receevi</title>
        <meta name="description" content="Whatsapp Cloud API Webhook" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <NextTopLoader color="#000" />
        <SupabaseProvider supabaseUrl={process.env.SUPABASE_URL} supabaseAnonKey={process.env.SUPABASE_ANON_KEY}>
          <SupabaseUserProvider session={session ?? undefined}>
            {children}
          </SupabaseUserProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
