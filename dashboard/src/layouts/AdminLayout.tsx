import React from 'react'
import { Home, Users, FolderKanban, Wallet, BarChart3, DollarSign, Shield, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link, useNavigate, Outlet, NavLink } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useDemo } from '@/demo/DemoProvider'

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
  const { logout, user } = useDemo()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  // Nombre e inicial del administrador en sesión
  const nombreAdmin = user?.nombre || "ADMIN"
  const inicial = nombreAdmin.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="grid grid-cols-[260px_1fr] grid-rows-[64px_1fr] min-h-screen">
        <aside className="row-span-2 bg-white border-r border-slate-100 px-4 py-8 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-3 px-3 mb-10">
              {/* 🔵 CÍRCULO AZUL SÓLIDO SIN LETRA "C" */}
              <div className="h-10 w-10 rounded-2xl bg-[#0f172a] shadow-lg shrink-0"></div>
              <div>
                {/* 📝 TEXTO SIMPLIFICADO A ADMINISTRADOR */}
                <p className="text-sm font-black uppercase tracking-tighter leading-tight text-slate-950">ADMINISTRADOR</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Admin Panel</p>
              </div>
            </div>

            <nav className="flex flex-col gap-1.5">
              {nav.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-[#0f172a] text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`
                  }
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
              <div className="h-px bg-slate-100 my-4" />
              {/* 🛠️ BOTÓN ACTUALIZADO A "SALIR" */}
              <button onClick={handleLogout} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all w-full text-left border-none">
                <LogOut size={18}/> Salir
              </button>
            </nav>
          </div>
        </aside>

        <header className="col-start-2 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
              
              
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 border-l pl-6 border-slate-100">
              <div className="text-right leading-none">
                {/* 📝 NOMBRE EN NEGRO/GRIS OSCURO */}
                <p className="text-[11px] font-black text-slate-950 uppercase tracking-tighter leading-none">{nombreAdmin}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-widest">Estado: Root</p>
              </div>
              {/* 🔵 AVATAR AZUL OSCURO CON INICIAL EN BLANCO */}
              <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-md">
                <AvatarFallback className="bg-[#0f172a] font-black text-white text-xs uppercase opacity-100 border-none">
                  {inicial}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="col-start-2 p-8 bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}