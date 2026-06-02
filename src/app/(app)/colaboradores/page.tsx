import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ColaboradoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Usa admin client para verificar perfil (bypass RLS recursiva)
  const admin = createAdminClient()
  const { data: eu } = await admin
    .from('colaboradores')
    .select('perfil')
    .eq('user_id', user.id)
    .single()

  if (eu?.perfil !== 'gestor' && eu?.perfil !== 'rh') redirect('/dashboard')

  // Admin client busca TODOS os colaboradores (bypass RLS)
  const { data: colaboradores } = await admin
    .from('colaboradores')
    .select('*')
    .order('turno').order('setor').order('nome')

  const ativos = colaboradores?.filter(c => c.ativo) ?? []
  const inativos = colaboradores?.filter(c => !c.ativo) ?? []

  const turnoLabel: Record<string, string> = { A: '23h–07h', B: '07h–15h', C: '15h–23h', ADM: 'Administrativo' }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Colaboradores</h1>
          <p className="text-gray-500 text-sm mt-1">{ativos.length} ativos · {inativos.length} inativos</p>
        </div>
        {eu?.perfil === 'gestor' && (
          <Link href="/colaboradores/novo" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg transition text-sm">
            <Plus size={16} />Novo Colaborador
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Turno</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Setor</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Perfil</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {ativos.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm flex-shrink-0">
                      {c.nome[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{c.nome}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-sm text-gray-700">{c.turno === 'ADM' ? 'ADM' : `Turno ${c.turno}`}</span>
                  <span className="block text-xs text-gray-400">{turnoLabel[c.turno] ?? ''}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">{c.setor}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full capitalize">{c.perfil}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ativo</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/colaboradores/${c.id}`} className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                    Ver perfil →
                  </Link>
                </td>
              </tr>
            ))}
            {inativos.length > 0 && (
              <>
                <tr className="bg-gray-50">
                  <td colSpan={6} className="px-4 py-2 text-xs text-gray-400 font-semibold uppercase">Inativos / Desligados</td>
                </tr>
                {inativos.map(c => (
                  <tr key={c.id} className="opacity-60 border-b border-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold text-sm">{c.nome[0]}</div>
                        <p className="font-medium text-gray-500 text-sm">{c.nome}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">{c.turno === 'ADM' ? 'ADM' : `Turno ${c.turno}`}</td>
                    <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">{c.setor}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full capitalize">{c.perfil}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {c.data_desligamento ? 'Desligado' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/colaboradores/${c.id}`} className="text-xs text-gray-400 hover:text-gray-600 font-medium">Ver →</Link>
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
