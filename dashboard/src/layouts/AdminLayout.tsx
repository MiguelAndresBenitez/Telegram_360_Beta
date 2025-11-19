
import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Home, Users, FolderKanban, Wallet, BarChart3, DollarSign, Settings, LogOut, Bell, Search, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
  import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const nav = [
  { to: '/', label: 'Resumen', icon: <Home size={18}/> },
  { to: '/clientes', label: 'Clientes', icon: <Users size={18}/> },
  { to: '/canales', label: 'Canales', icon: <FolderKanban size={18}/> },
  { to: '/pagos', label: 'Pagos y Solicitudes', icon: <Wallet size={18}/> },
  { to: '/presupuestos', label: 'Presupuestos', icon: <BarChart3 size={18}/> },
  { to: '/habilitacion', label: 'Habilitación de Clientes', icon: <Shield size={18}/> },
  { to: '/ganancias', label: 'Ganancias Propias', icon: <DollarSign size={18}/> },
]

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid grid-cols-[260px_1fr] grid-rows-[64px_1fr] min-h-screen">
        <aside className="row-span-2 bg-white border-r border-slate-200 px-4 py-6">
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-xl bg-slate-900 text-white grid place-items-center font-bold">C</div>
            <div>
              <p className="text-sm font-semibold leading-tight">Creación de Contenido</p>
              <p className="text-xs text-slate-500">Panel Admin</p>
            </div>
          </div>

          <nav className="mt-8 flex flex-col gap-1">
            {nav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-slate-100 transition ${isActive ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-700'}`
                }
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
            <div className="h-px bg-slate-200 my-3" />
            <button className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm w-full text-left hover:bg-slate-100 transition text-slate-700">
              <span className="shrink-0"><Settings size={18}/></span> Ajustes
            </button>
            <button className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm w-full text-left hover:bg-slate-100 transition text-slate-700">
              <span className="shrink-0"><LogOut size={18}/></span> Salir
            </button>
          </nav>

          <div className="mt-8 p-3 rounded-2xl bg-slate-100">
            <p className="text-xs font-semibold mb-1">¿Necesitás ayuda?</p>
            <p className="text-xs text-slate-600 mb-3">Guía rápida del panel y flujos.</p>
            <Button variant="secondary" className="w-full">Abrir guía</Button>
          </div>
        </aside>

        <header className="col-start-2 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-3 w-[520px]">
            <div className="text-slate-400"><Search size={18} /></div>
            <Input placeholder="Buscar cliente, canal o campaña…" className="h-9" />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 text-white text-[10px] grid place-items-center">0</span>
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8"><AvatarFallback>A</AvatarFallback></Avatar>
              <div className="leading-tight">
                <p className="text-sm font-semibold">ADMIN</p>
                <p className="text-[11px] text-slate-500">Admin</p>
              </div>
            </div>
          </div>
                    <Button variant="outline" asChild><Link to="/cliente"><User className="h-4 w-4 mr-2"/>Ver como Cliente</Link></Button>
          </header>

        <main className="col-start-2 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
