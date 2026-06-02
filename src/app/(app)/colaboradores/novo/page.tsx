'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calcularFolgas } from '@/lib/escala'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { criarColaborador } from './actions'

const SETORES = ['Líderes', 'Empilhadeiristas', 'Conferentes', 'Amarradores', 'Reforma de paletes', 'Seleção chapatex', '5S', 'Administrativo']
const TURNOS = ['A', 'B', 'C', 'ADM']
const PERFIS = ['colaborador', 'lider', 'rh', 'gestor']

interface Form {
  perfil: string
  nome: string
  contato: string
  turno: string
  setor: string
  folga1: string
  folga2: string
  email: string
  senha: string
  senha2: string
}

export default function NovoColaboradorPage() {
  const router = useRouter()
  const [passo, setPasso] = useState(1)
  const [form, setForm] = useState<Form>({
    perfil: '', nome: '', contato: '', turno: '', setor: '',
    folga1: '', folga2: '', email: '', senha: '', senha2: ''
  })
  const [salvando, setSalvando] = useState(false)

  const isAdm = form.turno === 'ADM'

  function set(field: keyof Form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function podeAvancar() {
    if (passo === 1) return !!form.perfil
    if (passo === 2) return !!(form.nome && form.turno && form.setor)
    if (passo === 3) return isAdm || !!(form.folga1 && form.folga2)
    if (passo === 4) return !!(form.email && form.senha && form.senha.length >= 6 && form.senha === form.senha2)
    return true
  }

  async function salvar() {
    setSalvando(true)
    try {
      const result = await criarColaborador({
        perfil: form.perfil,
        nome: form.nome,
        contato: form.contato,
        turno: form.turno,
        setor: form.setor,
        folga1: form.folga1,
        folga2: form.folga2,
        email: form.email,
        senha: form.senha,
        isAdm,
      })

      if (result.error) throw new Error(result.error)

      toast.success(`${form.nome} cadastrado com sucesso!`)
      // Hard navigation para garantir dados frescos na listagem
      window.location.href = '/colaboradores'
    } catch (e: any) {
      toast.error('Erro ao cadastrar: ' + e.message)
    }
    setSalvando(false)
  }

  const previewFolgas = !isAdm && form.folga1 && form.folga2 ? calcularFolgas(form.folga1, form.folga2, 2) : []

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novo Colaborador</h1>
        <div className="flex items-center gap-2 mt-4">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition
                ${passo > s ? 'bg-green-500 text-white' : passo === s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {passo > s ? <Check size={14} /> : s}
              </div>
              {s < 5 && <div className={`h-0.5 w-8 ${passo > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {['Perfil de acesso', 'Dados pessoais', 'Folgas', 'Acesso ao sistema', 'Confirmação'][passo - 1]}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {passo === 1 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Qual o perfil de acesso?</h2>
            <div className="grid grid-cols-2 gap-3">
              {PERFIS.map(p => (
                <button key={p} onClick={() => set('perfil', p)}
                  className={`p-4 rounded-xl border-2 text-left transition
                    ${form.perfil === p ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="font-semibold capitalize text-gray-900">{p === 'lider' ? 'Líder' : p.charAt(0).toUpperCase() + p.slice(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {p === 'gestor' ? 'Acesso total' : p === 'lider' ? 'Formulário do turno' : p === 'rh' ? 'Histórico + atestados' : 'Própria escala'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Dados pessoais</h2>
            <div>
              <label className="text-sm font-medium text-gray-700">Nome completo</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Nome do colaborador" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">WhatsApp / Contato</label>
              <input value={form.contato} onChange={e => set('contato', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Turno</label>
              <div className="flex gap-3 mt-1">
                {TURNOS.map(t => (
                  <button key={t} onClick={() => set('turno', t)}
                    className={`flex-1 py-2 rounded-lg border-2 font-semibold text-sm transition
                      ${form.turno === t ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {t === 'ADM' ? 'ADM' : `Turno ${t}`}
                  </button>
                ))}
              </div>
              {isAdm && (
                <p className="text-xs text-blue-600 mt-2">Turno administrativo — sem ciclo 6x2.</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Setor</label>
              <select value={form.setor} onChange={e => set('setor', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Selecione o setor</option>
                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        {passo === 3 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Primeiras datas de folga</h2>
            {isAdm ? (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
                Colaboradores do turno <strong>ADM</strong> não possuem ciclo 6x2.<br />
                Clique em <strong>Continuar</strong> para prosseguir.
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-4">O sistema calculará o ciclo 6x2 automaticamente a partir dessas datas.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">1º dia de folga</label>
                    <input type="date" value={form.folga1} onChange={e => set('folga1', e.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">2º dia de folga</label>
                    <input type="date" value={form.folga2} onChange={e => set('folga2', e.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>
                {previewFolgas.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-600 mb-2">Próximas folgas:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {previewFolgas.slice(0, 12).map(d => (
                        <span key={d} className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          {format(new Date(d + 'T00:00:00'), 'dd/MM', { locale: ptBR })}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400">...</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {passo === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Credenciais de acesso</h2>
            <div>
              <label className="text-sm font-medium text-gray-700">E-mail de login</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Senha</label>
              <input type="password" value={form.senha} onChange={e => set('senha', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Mínimo 6 caracteres" />
              {form.senha && (
                <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${form.senha.length < 6 ? 'w-1/4 bg-red-400' : form.senha.length < 8 ? 'w-2/4 bg-yellow-400' : 'w-full bg-green-400'}`} />
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Confirmar senha</label>
              <input type="password" value={form.senha2} onChange={e => set('senha2', e.target.value)}
                className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2
                  ${form.senha2 && form.senha !== form.senha2 ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-orange-400'}`}
                placeholder="Repita a senha" />
              {form.senha2 && form.senha !== form.senha2 && (
                <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
              )}
            </div>
          </div>
        )}

        {passo === 5 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Confirmar cadastro</h2>
            <div className="space-y-3">
              {[
                { label: 'Nome', value: form.nome },
                { label: 'Perfil', value: form.perfil },
                { label: 'Turno', value: form.turno === 'ADM' ? 'ADM (Administrativo)' : `Turno ${form.turno}` },
                { label: 'Setor', value: form.setor },
                { label: 'Contato', value: form.contato },
                { label: 'E-mail', value: form.email },
                ...(!isAdm ? [
                  { label: '1ª folga', value: form.folga1 ? format(new Date(form.folga1 + 'T00:00:00'), 'dd/MM/yyyy') : '' },
                  { label: '2ª folga', value: form.folga2 ? format(new Date(form.folga2 + 'T00:00:00'), 'dd/MM/yyyy') : '' },
                ] : []),
              ].map(r => (
                <div key={r.label} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500">{r.label}</span>
                  <span className="font-medium text-gray-900">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-orange-50 rounded-lg text-xs text-orange-700">
              Após confirmar, entregue as credenciais pessoalmente ou via WhatsApp para o colaborador.
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-4">
        <button
          onClick={() => passo > 1 ? setPasso(p => p - 1) : router.back()}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ChevronLeft size={16} /> Voltar
        </button>
        {passo < 5 ? (
          <button
            onClick={() => setPasso(p => p + 1)}
            disabled={!podeAvancar()}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
          >
            Continuar <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
          >
            <Check size={16} /> {salvando ? 'Salvando...' : 'Confirmar cadastro'}
          </button>
        )}
      </div>
    </div>
  )
}
