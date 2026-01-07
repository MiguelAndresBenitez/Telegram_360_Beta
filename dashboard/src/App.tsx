import React from 'react'
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom'
import { DemoProvider, useDemo } from './demo/DemoProvider'
import { ToastProvider } from './components/Toast'

// Layouts
import AdminLayout from './layouts/AdminLayout'
import ClientLayout from './layouts/ClientLayout'

// Páginas Admin
import Login from './pages/Login'
import Resumen from './pages/Resumen'
import Clientes from './pages/Clientes'
import Canales from './pages/Canales'
import Pagos from './pages/Pagos'
import Presupuestos from './pages/Presupuestos'
import Habilitacion from './pages/Habilitacion'
import Ganancias from './pages/Ganancias'

// Páginas Cliente (Rutas verificadas en tu carpeta src/pages/cliente/)
import InicioCliente from './pages/cliente/Inicio'
import CanalesCliente from './pages/cliente/Canales'
import PagosCliente from './pages/cliente/Pagos'
import VentasCliente from './pages/cliente/Ventas'
import PublicidadCliente from './pages/cliente/Publicidad'
import CampaniasCliente from './pages/cliente/Campanias'

// Componente de Protección
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole: 'admin' | 'client' }) => {
  const { state } = useDemo();
  if (!state.isAuthenticated) return <Navigate to="/login" replace />;
  
  const role = state.user?.role || (state.authenticatedClient?.nombre?.toLowerCase().includes('miguel') ? 'admin' : 'client');
  if (role !== allowedRole) return <Navigate to={role === 'admin' ? "/" : "/cliente"} replace />;
  
  return <>{children}</>;
};

function MainAppContent() {
  const { state } = useDemo();

  return (
    <Routes>
      {!state.isAuthenticated ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <>
          {/* DASHBOARD ADMIN */}
          <Route path="/" element={<ProtectedRoute allowedRole="admin"><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Resumen />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="canales" element={<Canales />} />
            <Route path="pagos" element={<Pagos />} />
            <Route path="presupuestos" element={<Presupuestos />} />
            <Route path="habilitacion" element={<Habilitacion />} />
            <Route path="ganancias" element={<Ganancias />} />
          </Route>

          {/* DASHBOARD CLIENTE */}
          <Route path="/cliente" element={<ProtectedRoute allowedRole="client"><ClientLayout /></ProtectedRoute>}>
            <Route index element={<InicioCliente />} />
            <Route path="canales" element={<CanalesCliente />} />
            <Route path="pagos" element={<PagosCliente />} />
            <Route path="ventas" element={<VentasCliente />} />
            <Route path="publicidad" element={<PublicidadCliente />} />
            <Route path="campanias" element={<CampaniasCliente />} />
          </Route>

          <Route path="*" element={<Navigate to={state.user?.role === 'admin' ? "/" : "/cliente"} replace />} />
        </>
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DemoProvider>
        <ToastProvider>
          <MainAppContent />
        </ToastProvider>
      </DemoProvider>
    </BrowserRouter>
  );
}