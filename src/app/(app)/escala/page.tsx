'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDiasDoMes, calcularFolgas } from '@/lib/escala'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Colaborador, Lancamento } from '@/lib/types'

const STATUS_LANC: Record<string, { label: string; bg: string; text: string }> = {
  presente:            { label: '✓', bg: 'bg-green-500', text: 'text-white' },
  folga:               { label: 'F', bg: 'bg-blue-100', text: 'text-blue-600' },
  falta_injustificada: { label: '!', bg: 'bg-red-200', text: 'text-red-700' },
  falta_atestado:      { label: 'A', bg: 'bg-yellow-200', text: 'text-yellow-800' },
  pendente:            { label: 'P', bg: 'bg-orange-100', text: 'text-orange-600' },
  atraso:              { label: 'AT', bg: 'bg-orange-300', text: 'text-orange-900' },
  troca_turno:         { label: 'TR', bg: 'bg-purple-100', text: 'text-purple-600' },
}

const STATUS_CALC: Record<string, { label: string; bg: string; text: string }> = {
  trabalho:   { label: '·', bg: 'bg-gray-50', text: 'text-gray-400' },
  folga_calc: { label: 'F', bg: 'bg-gray-100', text: 'text-gray-400' },
}

export default function EscalaPage() {
  const supabase = createClient()
  const [mes, setMes] = useState(new Date())
  const [turnoFiltro, setTurnoFiltro] = useState('A')
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [meuPerfil, setMeuPerfil] = useState('')
  const [meuTurno, setMeuTurno] = useState('')
  const [iniciou, setIniciou] = useState(false)

  const ano = mes.getFullYear()
  const mesNum = mes.getMonth() + 1
  const dias = getDiasDoMes(ano, mesNum)
  const hoje = format(new Date(), 'yyyy-MM-dd')

  // Carrega dados do user logado
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const resp = await fetch(`/api/colabs`)
      const todos: Colaborador[] = await resp.json()
      const eu = todos.find(c => c.user_id === user.id)
      if (!eu) return
      setMeuPerfil(eu.perfil)
      setMeuTurno(eu.turno)
      if (!iniciou) {
        setIniciou(true)
        if (eu.perfil !== 'lider' && eu.turno && eu.turno !== 'ADM') {
          setTurnoFiltro(eu.turno)
        }
      }
    }
    loadUser()
  }, [])

  // Carrega colaboradores e lançamentos do turno/mês selecionado
  const loadEscala = useCallback(async () => {
    const turno = meuPerfil === 'lider' ? meuTurno : turnoFiltro
    if (!turno || turno === 'ADM') return

    const colabsResp = await fetch(`/api/colabs?turno=${turno}&ativo=true`)
    const colabs: Colaborador[] = await colabsResp.json()
    setColaboradores(colabs)

    if (colabs.length === 0) { setLancamentos([]); return }

    const inicio = `${ano}-${String(mesNum).padStart(2, '0')}-01`
    const fim = `${ano}-${String(mesNum).padStart(2, '0')}-31`
    const ids = colabs.map(c => c.id).join(',')

    const lancsResp = await fetch(`/api/lancamentos?inicio=${inicio}&fim=${fim}&colaborador_ids=${ids}`)
    const lancs: Lancamento[] = await lancsResp.json()
    setLancamentos(Array.isArray(lancs) ? lancs : [])
  }, [mes, turnoFiltro, meuPerfil, meuTurno])

  useEffect(() => {
    if (meuPerfil || turnoFiltro) loadEscala()
  }, [loadEscala])

  function getStatus(colab: Colaborador, dia: string) {
    const lanc = lancamentos.find(l => l.colaborador_id === colab.id && l.data === dia)
    if (lanc) return STATUS_LANC[lanc.status] ?? { label: '?', bg: 'bg-gray-200', text: 'text-gray-600' }

    if (!colab.folga1_inicial || !colab.folga2_inicial) {
      if (dia > hoje) return { label: '', bg: '', text: '' }
      return STATUS_CALC['trabalho']
    }

    const folgas = calcularFolgas(colab.folga1_inicial, colab.folga2_inicial)
    if (folgas.includes(dia)) return STATUS_CALC['folga_calc']
    if (dia > hoje) return { label: '', bg: '', text: '' }
    return STATUS_CALC['trabalho']
  }

  const porSetor = colaboradores.reduce((acc, c) => {
    if (!acc[c.setor]) acc[c.setor] = []
    acc[c.setor].push(c)
    return acc
  }, {} as Record<string, Colaborador[]>)

  const turnoAtivo = meuPerfil === 'lider' ? meuTurno : turnoFiltro

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Escala {meuPerfil === 'lider' ? 'do Turno' : 'Geral'}</h1>
          <p className="text-gray-500 text-sm mt-1">Turno {turnoAtivo}</p>
        </div>
        <div className="flex items-center gap-3">
          {meuPerfil !== 'lider' && (
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {(['A', 'B', 'C'] as const).map(t => (
                <button key={t} onClick={() => setTurnoFiltro(t)}
                  className={`px-4 py-1.5 text-sm font-medium transition ${turnoFiltro === t ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  Turno {t}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => setMes(subMonths(mes, 1))} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
            <span className="text-sm font-medium w-32 text-center">{format(mes, "MMMM 'de' yyyy", { locale: ptBR })}</span>
            <button onClick={() => setMes(addMonths(mes, 1))} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {[
          { label: '✓ Presente confirmado', bg: 'bg-green-500', text: 'text-white' },
          { label: 'F Folga confirmada', bg: 'bg-blue-100', text: 'text-blue-600' },
          { label: 'F Folga programada', bg: 'bg-gray-100', text: 'text-gray-400' },
          { label: '! Falta', bg: 'bg-red-200', text: 'text-red-700' },
          { label: 'A Atestado', bg: 'bg-yellow-200', text: 'text-yellow-800' },
          { label: 'AT Atraso', bg: 'bg-orange-300', text: 'text-orange-900' },
          { label: '· Esperado trabalhar', bg: 'bg-gray-50', text: 'text-gray-400' },
        ].map(l => (
          <span key={l.label} className={`${l.bg} ${l.text} px-2 py-0.5 rounded font-medium border border-gray-100`}>{l.label}</span>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left p-3 font-semibold text-gray-600 sticky left-0 bg-white min-w-[140px]">Colaborador</th>
              {dias.map(d => (
                <th key={d} className={`p-1.5 font-medium text-center min-w-[32px] ${d === hoje ? 'bg-orange-50 text-orange-600' : 'text-gray-400'}`}>
                  {format(new Date(d + 'T00:00:00'), 'dd')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(porSetor).map(([setor, lista]) => (
              <>
                <tr key={'setor-' + setor} className="bg-gray-50">
                  <td colSpan={dias.length + 1} className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50">{setor}</td>
                </tr>
                {lista.map(colab => (
                  <tr key={colab.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-3 font-medium text-gray-900 sticky left-0 bg-white">
                      <a href={`/colaboradores/${colab.id}`} className="hover:text-orange-500 transition">{colab.nome}</a>
                    </td>
                    {dias.map(d => {
                      const s = getStatus(colab, d)
                      return (
                        <td key={d} className={`text-center p-0.5 ${d === hoje ? 'bg-orange-50' : ''}`}>
                          {s.label && <span className={`inline-block w-7 h-7 rounded text-center leading-7 font-bold ${s.bg} ${s.text}`}>{s.label}</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
        {colaboradores.length === 0 && <p className="text-center py-12 text-gray-400 text-sm">Nenhum colaborador encontrado</p>}
      </div>
    </div>
  )
}
