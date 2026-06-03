import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/colabs?turno=A&ativo=true
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const turno = searchParams.get('turno')
  const ativo = searchParams.get('ativo') !== 'false'

  const admin = createAdminClient()
  let query = admin.from('colaboradores').select('*').order('setor').order('nome')
  if (turno) query = query.eq('turno', turno)
  if (ativo) query = query.eq('ativo', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
