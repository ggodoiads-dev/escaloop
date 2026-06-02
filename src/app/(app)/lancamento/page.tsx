'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Colaborador, StatusLancamento } from '@/lib/types'
import { toast } from 'sonner'
import { Save, AlertCircle } from 'lucide-react'

const STATUS_OPTIONS: { value: StatusLancamento; label: string; cor: string }[] = [
  { value: 'presente', label: 'Presente', cor: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'folga', label: 'Folga', cor: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'falta_injustificada', label: 'Falta Injust.', cor: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'falta_atestado', label: 'Falta c/ Atestado', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'atraso', label: 'Atraso', cor: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'troca_turno', label: 'Troca de Turno', cor: 'bg-purple-100 text-purple-700 border-purple-300' },
]

interface LancamentoItem {
  colaborador: Colaborador
  status: StatusLancamento | ''
  horario_atraso: string
  justificativa: string
  salvo: boolean
}

export default function LancamentoDiarioPage() {
  const supabase = createClient()
  const hoje = format(new Date(), 'yyyy-MM-dd')
  const [meuTurno, setMeuTurno] = useState<string>('')
  const [meuId, setMeuId] = useState<string>('')
  const [itens, setItens] = useState<LancamentoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: eu } = await supabase
        .from('colaboradores')
        .select('id, turno, perfil')
        .eq('user_id', user.id)
        .single()

      if (!eu) return
      setMeuTurno(eu.turno)
      setMeuId(eu.id)

      // Busca colaboradores do turno
      const { data: colabs } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('turno', eu.turno)
        .eq('ativo', true)
        .order('setor')
        .order('nome')

      // Busca lançamentos já existentes de hoje
      const { data: lancs } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('data', hoje)

      const mapa = new Map(lancs?.map(l => [l.colaborador_id, l]) ?? [])

      setItens((colabs ?? []).map(c => {
        const l = mapa.get(c.id)
        return {
          colaborador: c,
          status: l?.status ?? '',
          horario_atraso: l?.horario_atraso ?? '',
          justificativa: l?.justificativa ?? '',
          salvo: !!l,
        }
      }))
      setLoading(false)
    }
    load()
  }, [])

  async function salvarLancamento(idx: number) {
    const item = itens[idx]
    if (!item.status) { toast.error('Selecione um status'); return }

    setSalvando(item.colaborador.id)
    const payload = {
      colaborador_id: item.colaborador.id,
      data: hoje,
      status: item.status,
      horario_atraso: item.status === 'atraso' ? item.horario_atraso : null,
      justificativa: item.justificativa || null,
      lider_id: meuId,
    }

    const { error } = await supabase
      .from('lancamentos')
      .upsert(payload, { onConflict: 'colaborador_id,data' })

    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      // Se falta com atestado, gera token de atestado
      if (item.status === 'falta_atestado') {
        const { data: lanc } = await supabase
          .from('lancamentos')
          .select('id')
          .eq('colaborador_id', item.colaborador.id)
          .eq('data', hoje)
          .single()

        if (lanc) {
          const token = crypto.randomUUID()
          await supabase.from('atestados').upsert({
            colaborador_id: item.colaborador.id,
            lancamento_id: lanc.id,
            data_falta: hoje,
            token,
            status: 'pendente',
          }, { onConflict: 'lancamento_id' })

          const url = `${window.location.origin}/atestado/${token}`
          toast.success(`Lançado! Link do atestado copiado.`)
          navigator.clipboard?.writeText(url)
        }
      } else {
        toast.success(`${item.colaborador.nome} — lançado com sucesso`)
      }

      setItens(prev => prev.map((it, i) => i === idx ? { ...it, salvo: true } : it))
    }
    setSalvando(null)
  }

  function update(idx: number, field: string, value: string) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value, salvo: false } : it))
  }

  if (loading) return <div className="p-6 text-gray-500">Carregando...</div>

  const porSetor = itens.reduce((acc, item) => {
    const s = item.colaborador.setor
    if (!acc[s]) acc[s] = []
    acc[s].push(item)
    return acc
  }, {} as Record<string, LancamentoItem[]>)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lançamento Diário</h1>
        <p className="text-gray-500 text-sm mt-1">
          Turno {meuTurno} · {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {Object.entries(porSetor).map(([setor, lista]) => (
        <div key={setor} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{setor}</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {lista.map((item, i) => {
              const globalIdx = itens.indexOf(item)
              return (
                <div key={item.colaborador.id} className={`p-4 ${i < lista.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                      {item.colaborador.nome[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{item.colaborador.nome}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {STATUS_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => update(globalIdx, 'status', opt.value)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition
                              ${item.status === opt.value ? opt.cor + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {item.status === 'atraso' && (
                        <input
                          type="time"
                          value={item.horario_atraso}
                          onChange={e => update(globalIdx, 'horario_atraso', e.target.value)}
                          className="mt-2 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      )}
                      {(item.status === 'troca_turno') && (
                        <input
                          type="text"
                          placeholder="Justificativa da troca"
                          value={item.justificativa}
                          onChange={e => update(globalIdx, 'justificativa', e.target.value)}
                          className="mt-2 w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => salvarLancamento(globalIdx)}
                      disabled={!item.status || salvando === item.colaborador.id}
                      className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition
                        ${item.salvo ? 'bg-green-100 text-green-700' : 'bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40'}`}
                    >
                      {item.salvo ? <><AlertCircle size={14} />Salvo</> : <><Save size={14} />Salvar</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {itens.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>Nenhum colaborador encontrado no seu turno.</p>
        </div>
      )}
    </div>
  )
}
