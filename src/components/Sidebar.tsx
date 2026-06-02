'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Perfil } from '@/lib/types'
import {
  LayoutDashboard, CalendarDays, ClipboardList, Users, LogOut, Menu, X, ChevronRight
} from 'lucide-react'

interface SidebarProps {
  perfil: Perfil
  nome: string
}

const navItems = {
  gestor: [
    { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
    { href: '/escala', label: 'Escala Geral', icon: CalendarDays },
    { href: '/lancamento', label: 'Lançamento Diário', icon: ClipboardList },
    { href: '/colaboradores', label: 'Colaboradores', icon: Users },
  ],
  lider: [
    { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
    { href: '/escala', label: 'Escala do Turno', icon: CalendarDays },
    { href: '/lancamento', label: 'Lançamento Diário', icon: ClipboardList },
  ],
  rh: [
    { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
    { href: '/escala', label: 'Escalas', icon: CalendarDays },
    { href: '/colaboradores', label: 'Colaboradores', icon: Users },
  ],
  colaborador: [
    { href: '/minha-escala', label: 'Minha Escala', icon: CalendarDays },
  ],
}

export function Sidebar({ perfil, nome }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const items = navItems[perfil] ?? []

  async function handleLogout() {
    if (!confirm(`Sair do sistema?\n\nUsuário: ${nome}\nPerfil: ${perfil}`)) return
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const perfilLabel = { gestor: 'Gestor', lider: 'Líder', rh: 'RH', colaborador: 'Colaborador' }

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="font-bold text-gray-900">EscalaOp</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-1">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 bg-gray-900 flex flex-col transition-transform duration-200
        md:static md:translate-x-0 md:flex
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">E</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm">EscalaOp</p>
              <p className="text-gray-400 text-xs">LOG20 Logística</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-700">
          <p className="text-xs text-gray-400">Logado como</p>
          <p className="text-white text-sm font-medium truncate">{nome}</p>
          <span className="inline-block mt-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
            {perfilLabel[perfil]}
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition group
                  ${active ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} />}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-700">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-red-500/20 hover:text-red-300 transition"
          >
            <LogOut size={18} />
            <span>{loggingOut ? 'Saindo...' : 'Sair'}</span>
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  )
}
