import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// GET /api/fix-user-ids — corrige user_ids NULL linkando por email
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()

  // Só gestor pode executar
  const { data: eu } = await admin.from('colaboradores').select('perfil').eq('user_id', user.id).single()
  if (eu?.perfil !== 'gestor') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Busca todos os colaboradores com user_id NULL
  const { data: semId } = await admin
    .from('colaboradores')
    .select('id, email, nome, perfil')
    .is('user_id', null)

  if (!semId || semId.length === 0) {
    return NextResponse.json({ message: 'Todos os user_ids já estão linkados', fixed: 0 })
  }

  // Busca todos os auth users
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const authMap = new Map(authUsers.map(u => [u.email?.toLowerCase(), u.id]))

  let fixed = 0
  const results = []

  for (const colab of semId) {
    const authId = authMap.get(colab.email?.toLowerCase())
    if (authId) {
      await admin.from('colaboradores').update({ user_id: authId }).eq('id', colab.id)
      fixed++
      results.push(`✓ ${colab.nome} (${colab.email}) → ${authId}`)
    } else {
      results.push(`✗ ${colab.nome} (${colab.email}) — sem conta Auth`)
    }
  }

  return NextResponse.json({ message: `${fixed} de ${semId.length} corrigidos`, fixed, results })
}
