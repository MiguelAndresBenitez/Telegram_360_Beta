
import React from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { Home, MessageSquare, Wallet, BarChart3, Megaphone, Link2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useDemo } from '@/demo/DemoProvider'

const nav = [
  { to: '/cliente', label: 'Inicio', icon: <Home size={18}/> },
  { to: '/cliente/canales', label: 'Canales', icon: <MessageSquare size={18}/> },
  { to: '/cliente/pagos', label: 'Pagos', icon: <Wallet size={18}/> },
  { to: '/cliente/ventas', label: 'Ventas', icon: <BarChart3 size={18}/> },
  { to: '/cliente/publicidad', label: 'Publicidad', icon: <Megaphone size={18}/> },
  { to: '/cliente/campanias', label: 'Campañas', icon: <Link2 size={18}/> },
]

export default function ClientLayout() {
  const { state, setClienteActual } = useDemo()
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid grid-cols-[260px_1fr] grid-rows-[64px_1fr] min-h-screen">
        <aside className="row-span-2 bg-white border-r border-slate-200 px-4 py-6">
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-xl bg-slate-900 text-white grid place-items-center font-bold">C</div>
            <div>
              <p className="text-sm font-semibold leading-tight">Panel Cliente</p>
              <p className="text-xs text-slate-500">Vista del cliente</p>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-xs text-slate-600">Cliente</label>
            <select className="w-full border border-slate-300 rounded-xl text-sm px-3 py-2 mt-1"
              value={state.clienteActual} onChange={e=>setClienteActual(e.target.value)}>
              {state.clientes.map(c => <option key={c.nombre}>{c.nombre}</option>)}
            </select>
          </div>

          <nav className="mt-6 flex flex-col gap-1">
            {nav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/cliente'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-slate-100 transition ${isActive ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-700'}`
                }
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
            <div className="h-px bg-slate-200 my-3" />
            <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              <ArrowLeft size={18}/> Volver a Admin
            </Link>
          </nav>
        </aside>

        <header className="col-start-2 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-3 w-[520px]">
            <Input placeholder="Buscar en tu panel…" className="h-9" />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild><Link to="/">Ver Admin</Link></Button>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8"><AvatarFallback>CL</AvatarFallback></Avatar>
              <div className="leading-tight">
                <p className="text-sm font-semibold">{state.clienteActual}</p>
                <p className="text-[11px] text-slate-500">Cliente</p>
              </div>
            </div>
          </div>
        </header>

        <main className="col-start-2 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
