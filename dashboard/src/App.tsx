import React from 'react'
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import ClientLayout from './layouts/ClientLayout'
import { DemoProvider, useDemo } from './demo/DemoProvider'
import { ToastProvider } from './components/Toast'

// Rutas de Admin
import Resumen from './pages/Resumen'
import Clientes from './pages/Clientes'
import Canales from './pages/Canales'
import Pagos from './pages/Pagos'
import Presupuestos from './pages/Presupuestos'
import Habilitacion from './pages/Habilitacion'
import Ganancias from './pages/Ganancias'

// Rutas de Cliente
import InicioCliente from './pages/cliente/Inicio'
import CanalesCliente from './pages/cliente/Canales'
import PagosCliente from './pages/cliente/Pagos'
import VentasCliente from './pages/cliente/Ventas'
import PublicidadCliente from './pages/cliente/Publicidad'
import CampaniasCliente from './pages/cliente/Campanias'


function MainAppContent() {
  const { isLoading } = useDemo()

  if (isLoading) {
    // Muestra la pantalla de carga mientras obtiene datos del backend
    return (
      <div className="fixed inset-0 grid place-items-center bg-slate-50 z-50">
        <div className="text-xl font-semibold text-slate-700">Cargando datos del API...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {/* Rutas principales del Panel Admin */}
        <Route path="/" element={<Resumen />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/canales" element={<Canales />} />
        <Route path="/pagos" element={<Pagos />} />
        <Route path="/presupuestos" element={<Presupuestos />} />
        <Route path="/habilitacion" element={<Habilitacion />} />
        <Route path="/ganancias" element={<Ganancias />} />
      </Route>

      <Route path="/cliente" element={<ClientLayout />}>
        {/* Rutas principales del Panel Cliente */}
        <Route index element={<InicioCliente />} />
        <Route path="canales" element={<CanalesCliente />} />
        <Route path="pagos" element={<PagosCliente />} />
        <Route path="ventas" element={<VentasCliente />} />
        <Route path="publicidad" element={<PublicidadCliente />} />
        <Route path="campanias" element={<CampaniasCliente />} />
      </Route>
    </Routes>
  )
}

// CORRECCIÓN: Definimos App y la exportamos por defecto al final.
function App() {
  return (
    // NOTA: Tu componente BrowserRouter está duplicado en main.tsx y App.tsx. 
    // Lo he dejado en App.tsx para que las "future flags" funcionen.
    <BrowserRouter 
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <DemoProvider>
        <ToastProvider>
          <MainAppContent />
        </ToastProvider>
      </DemoProvider>
    </BrowserRouter>
  )
}

export default App;