import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDemo } from '@/demo/DemoProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { Link } from 'react-router-dom'
import { Wallet, BarChart3, MessageSquare, Send, CircleDollarSign, TrendingUp, Loader2, Clock } from 'lucide-react'

export default function InicioCliente() {
  const { user, state } = useDemo() 
  const { push } = useToast()
  
  const [dbUser, setDbUser] = useState<any>(null)
  const [ingresosTotales, setIngresosTotales] = useState({ ars: 0, usd: 0, usdt: 0 })
  const [ventasTotales, setVentasTotales] = useState(0)
  const [misRetiros, setMisRetiros] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [monto, setMonto] = useState('0')
  const [metodo, setMetodo] = useState('USDT')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 🛠️ ARREGLO DE TELEGRAM_ID: Priorizar al usuario autenticado (Nay)
  const currentTelegramId = useMemo(() => {
    // Si hay un cliente autenticado por login, usamos su ID.
    const idSession = state.authenticatedClient?.telegram_id || state.authenticatedClient?.id;
    if (idSession) return Number(idSession);

    // Fallback original: buscar por selección
    const seleccionado = state.clientes.find(c => c.nombre === state.clienteActual);
    const id = seleccionado?.telegramId || user?.telegram_id || localStorage.getItem('user_id');
    return id ? Number(id) : null;
  }, [state.clienteActual, state.clientes, user, state.authenticatedClient]);

  // Cálculo de saldo disponible según método seleccionado
  const saldoDisponibleActual = useMemo(() => {
    if (metodo === 'Pesos') return ingresosTotales.ars;
    if (metodo === 'Dólares') return ingresosTotales.usd;
    return ingresosTotales.usdt;
  }, [metodo, ingresosTotales]);

  // Validación para habilitar el botón y mostrar alertas
  const saldoInsuficiente = useMemo(() => {
    return parseFloat(monto) > saldoDisponibleActual;
  }, [monto, saldoDisponibleActual]);

  const puedeRetirar = useMemo(() => {
    const val = parseFloat(monto);
    return val > 0 && !saldoInsuficiente;
  }, [monto, saldoInsuficiente]);

  const loadData = async () => {
    if (!currentTelegramId) { setIsLoading(false); return; }
    setIsLoading(true)
    try {
      const resU = await fetch(`http://localhost:8000/cliente/?telegram_id=${currentTelegramId}`)
      if (resU.ok) setDbUser(await resU.json())
      
      const resV = await fetch(`http://localhost:8000/cliente/${currentTelegramId}/miembros-csv`)
      let tArs = 0, tUsd = 0, tUsdt = 0;
      let countVentas = 0;

      if (resV.ok) {
        const data = await resV.json()
        countVentas = data.length;
        data.forEach((v: any) => {
          const bruto = parseFloat(String(v.monto).replace(/[^0-9.]/g, '')) || 0;
          const met = String(v.metodo || '').toLowerCase();
          if (met.includes('ars') || met.includes('mercado') || met.includes('pesos')) tArs += bruto;
          else if (met.includes('stripe') || (met.includes('usd') && !met.includes('usdt'))) tUsd += bruto;
          else tUsdt += bruto;
        });
      }

      const resR = await fetch(`http://localhost:8000/retiros/`)
      if (resR.ok) {
        const retirosData = await resR.json();
        const filtrados = retirosData.filter((r: any) => Number(r.cliente_id) === currentTelegramId);
        
        // Limitar historial a los últimos 7 pedidos
        const historialLimitado = filtrados
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 7);
        
        setMisRetiros(historialLimitado);

        filtrados.filter((r: any) => r.estado !== 'Rechazado').forEach((r: any) => {
          const montoR = parseFloat(r.monto) || 0;
          const metR = String(r.metodo || '').toLowerCase();
          if (metR.includes('pesos') || metR.includes('ars')) tArs -= montoR;
          else if (metR.includes('dólar') || metR.includes('dolar') || (metR.includes('usd') && !metR.includes('usdt'))) tUsd -= montoR;
          else tUsdt -= montoR;
        });
      }

      setIngresosTotales({ ars: tArs, usd: tUsd, usdt: tUsdt });
      setVentasTotales(countVentas);
    } catch (e) { console.error(e) } 
    finally { setIsLoading(false) }
  }

  useEffect(() => { loadData() }, [currentTelegramId])

  const handleRetiro = async () => {
    if (!puedeRetirar) return;
    setIsSending(true)
    try {
      const res = await fetch(`http://localhost:8000/retiros/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: parseFloat(monto), metodo: metodo, cliente_id: currentTelegramId, estado: "Pendiente" })
      })
      if (res.ok) {
        push("✅ Solicitud enviada correctamente");
        setOpen(false);
        setMonto('0');
        await loadData();
      }
    } catch (e) { push("Fallo de conexión", "error") }
    finally { setIsSending(false) }
  }

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-900" size={32} /></div>

  return (
    <div className="p-5 space-y-6 bg-white min-h-screen">
      <div className="flex justify-between items-center text-left">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">
            {/* 🛠️ ARREGLO DE NOMBRE: Priorizar Nay sobre Ro */}
            HOLA, {dbUser?.nombre || state.authenticatedClient?.nombre || state.clienteActual}
          </h1>
          <p className="text-[7px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Saldos Netos Disponibles</p>
        </div>
        <button onClick={() => setOpen(true)} className="bg-[#0f172a] hover:bg-black text-white rounded-xl px-5 h-10 font-black uppercase text-[9px] tracking-widest shadow-lg flex items-center gap-2">
          <Send size={12} /> SOLICITAR RETIRO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiMini title="SALDO ARS" value={ingresosTotales.ars} icon={<CircleDollarSign size={18} className="text-blue-600"/>} />
        <KpiMini title="SALDO USD" value={ingresosTotales.usd} icon={<TrendingUp size={18} className="text-emerald-600"/>} />
        <KpiMini title="SALDO USDT" value={ingresosTotales.usdt} icon={<Wallet size={18} className="text-amber-600"/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-8 border-none shadow-sm rounded-[24px] bg-slate-50/50 p-6 flex flex-col justify-center min-h-[180px]">
            <div className="text-left">
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">RENDIMIENTO</p>
                <h2 className="text-lg font-black text-slate-300 uppercase tracking-tighter leading-none">TOTAL SUSCRIPCIONES</h2>
                <span className="text-6xl font-black text-slate-900 tracking-tighter block leading-none mt-1">{ventasTotales}</span>
            </div>
        </Card>
        <div className="lg:col-span-4 space-y-4 text-left">
            <DataMini label="ID DE USUARIO" value={currentTelegramId || '---'} />
            <DataMini label="CORREO ELECTRÓNICO" value={dbUser?.correo || 'No registrado'} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 text-left">
            <Clock size={12} className="text-slate-400" />
            <h2 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Últimos 7 Pedidos</h2>
        </div>
        <Card className="border-none shadow-sm rounded-[24px] overflow-hidden border border-slate-50">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                            <th className="p-4 text-[7px] font-black uppercase text-slate-400">Fecha</th>
                            <th className="p-4 text-[7px] font-black uppercase text-slate-400 text-right">Monto</th>
                            <th className="p-4 text-[7px] font-black uppercase text-slate-400 text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {misRetiros.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-[9px] font-bold text-slate-300 uppercase">Sin movimientos</td></tr>
                        ) : misRetiros.map((r) => (
                            <tr key={r.retiro_id} className="hover:bg-slate-50/30 transition-colors text-left text-xs">
                                <td className="p-4 font-bold text-slate-500">{new Date(r.timestamp).toLocaleDateString('es-AR')}</td>
                                <td className="p-4 font-black text-slate-900 text-right">${r.monto.toFixed(2)} <span className="text-[7px] text-slate-400 ml-1">{r.metodo}</span></td>
                                <td className="p-4">
                                    <div className="flex justify-center">
                                        <Badge className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-md border-none ${
                                            r.estado === 'Pagado' ? 'bg-emerald-100 text-emerald-600' : 
                                            r.estado === 'Rechazado' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                        }`}>
                                            {r.estado}
                                        </Badge>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 justify-start pt-2">
        <NavButton to="/cliente/pagos" icon={<Wallet size={18}/>} label="LINKS DE PAGO" />
        <NavButton to="/cliente/ventas" icon={<BarChart3 size={18}/>} label="VER VENTAS" />
        <NavButton to="/cliente/canales" icon={<MessageSquare size={18}/>} label="CANALES" />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Solicitar Retiro">
        <div className="space-y-4 p-4 text-left">
          <div className={`p-6 rounded-[24px] border shadow-inner transition-colors ${saldoInsuficiente ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 text-center">MONTO</label>
            <Input type="number" value={monto} onChange={e => setMonto(e.target.value)} className={`bg-transparent border-none text-4xl font-black text-center p-0 h-auto focus-visible:ring-0 ${saldoInsuficiente ? 'text-red-600' : 'text-slate-900'}`} />
            {/* Mensaje de Saldo Insuficiente dinámico */}
            <p className={`text-[8px] text-center font-bold uppercase mt-2 italic ${saldoInsuficiente ? 'text-red-600' : 'text-slate-400'}`}>
                {saldoInsuficiente 
                  ? `❌ SALDO INSUFICIENTE (DISPONIBLE: $${saldoDisponibleActual.toLocaleString('es-AR')})` 
                  : `Disponible ${metodo}: $${saldoDisponibleActual.toLocaleString('es-AR')}`}
            </p>
          </div>
          <select className="w-full bg-[#0f172a] text-white rounded-xl h-12 px-4 text-[10px] font-black uppercase outline-none"
            value={metodo} onChange={e => setMetodo(e.target.value)}>
            <option value="USDT">Billetera USDT (TRC20)</option>
            <option value="Pesos">Mercado Pago (ARS)</option>
            <option value="Dólares">Transferencia (USD)</option>
          </select>
          <Button 
            onClick={handleRetiro} 
            disabled={isSending || !puedeRetirar} 
            className={`w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg ${puedeRetirar ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {isSending ? 'PROCESANDO...' : 'CONFIRMAR'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function KpiMini({ title, value, icon }: any) {
  return (
    <Card className="border-none shadow-sm rounded-[22px] bg-white p-5 flex flex-col items-start gap-3 border border-slate-50">
        <div className="h-9 w-9 bg-slate-50 rounded-[12px] flex items-center justify-center text-slate-900 shadow-inner">{icon}</div>
        <div className="text-left">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <p className={`text-2xl font-black tracking-tighter mt-1 ${value < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                ${value.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
            </p>
        </div>
    </Card>
  )
}

function DataMini({ label, value }: any) {
  return (
    <div className="bg-white border border-slate-100 p-4 rounded-[20px] text-left shadow-sm">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{label}</p>
        <div className="bg-slate-50/50 p-3 rounded-lg text-[9px] font-bold text-slate-700 truncate uppercase">{value}</div>
    </div>
  )
}

function NavButton({ to, icon, label }: any) {
  return (
    <Link to={to} className="bg-[#0f172a] hover:bg-black text-white h-14 px-8 rounded-[22px] flex items-center gap-3 transition-all active:scale-95 shadow-xl min-w-[220px]">
      <div className="text-slate-400">{icon}</div>
      <span className="font-black uppercase text-[13px] tracking-[0.2em]">{label}</span>
    </Link>
  )
}