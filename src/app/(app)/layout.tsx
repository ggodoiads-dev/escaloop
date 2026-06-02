import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Perfil } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: colab } = await supabase
    .from('colaboradores')
    .select('nome, perfil')
    .eq('user_id', user.id)
    .single()

  const perfil = (colab?.perfil ?? 'colaborador') as Perfil
  const nome = colab?.nome ?? user.email ?? 'Usuário'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar perfil={perfil} nome={nome} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  )
}
