import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Perfil } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Admin client: busca perfil sem depender do RLS recursivo
  const admin = createAdminClient()
  const { data: colab } = await admin
    .from('colaboradores')
    .select('id, nome, perfil, user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  // Se colaborador existe mas user_id não está linkado: tenta corrigir
  if (!colab) {
    const { data: colabByEmail } = await admin
      .from('colaboradores')
      .select('id, nome, perfil')
      .eq('email', user.email ?? '')
      .maybeSingle()

    if (colabByEmail) {
      // Linka o user_id automaticamente
      await admin
        .from('colaboradores')
        .update({ user_id: user.id })
        .eq('id', colabByEmail.id)

      const perfil = (colabByEmail.perfil ?? 'colaborador') as Perfil
      const nome = colabByEmail.nome ?? user.email ?? 'Usuário'

      return (
        <div className="flex h-screen overflow-hidden">
          <Sidebar perfil={perfil} nome={nome} />
          <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
        </div>
      )
    }
  }

  const perfil = (colab?.perfil ?? 'colaborador') as Perfil
  const nome = colab?.nome ?? user.email ?? 'Usuário'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar perfil={perfil} nome={nome} />
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  )
}
