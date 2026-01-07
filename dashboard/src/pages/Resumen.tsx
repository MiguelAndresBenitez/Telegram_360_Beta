import React, { useMemo, useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Wallet, Bell, CircleDollarSign, Loader2, Check } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useDemo } from '@/demo/DemoProvider'
import { getMetricsResumen } from '@/api/index'
import { useNavigate } from 'react-router-dom'

type Periodo = 'day' | 'week' | 'month' | 'year';

export default function Resumen() {
  const { state } = useDemo() 
  const navigate = useNavigate()
  
  const [periodo, setPeriodo] = useState<Periodo>('day')
  const [datosAcumulados, setDatosAcumulados] = useState<any[]>([]) 
  const [ingresosTotales, setIngresosTotales] = useState({ ars: 0, usd: 0, crypto: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
        setLoading(true)
        try {
            const resT = await fetch(`http://localhost:8000/transacciones/`)
            if (resT.ok) {
                const txs = await resT.json()
                const totales = txs.reduce((acc: any, curr: any) => {
                    if (curr.estado?.toLowerCase() !== 'completada' && curr.estado?.toLowerCase() !== 'success') return acc;
                    const monto = Number(curr.monto) || 0
                    const metodo = String(curr.metodo_pago || '').toLowerCase()
                    if (metodo.includes('mercadopago')) acc.ars += monto
                    else if (metodo.includes('stripe')) acc.usd += monto
                    else if (metodo.includes('coinbase') || metodo.includes('cripto')) acc.crypto += monto
                    return acc
                }, { ars: 0, usd: 0, crypto: 0 })
                setIngresosTotales(totales)
            }

            const timeLimit = calculateTimeLimit(periodo)
            const apiMetricas = await getMetricsResumen(periodo, 'all', 'all', timeLimit)
            
            const dataCompleta = fillMissingData(apiMetricas.map((m: any) => ({
                fecha: m.fecha,
                neto: m.nuevos_usuarios, 
            })), periodo);

            let stockActual = 0;
            const dataFinal = dataCompleta.map(d => {
                stockActual += d.neto;
                return { 
                    fecha: d.fecha, 
                    cantidad: Math.max(0, stockActual),
                    label: formatDate(d.fecha, periodo)
                };
            });

            setDatosAcumulados(dataFinal) 
        } catch (e) {
            console.error("Error en Resumen:", e)
        } finally {
            setLoading(false)
        }
    }
    loadDashboardData()
  }, [periodo])

  const retirosPendientes = useMemo(() => 
    state.retiros.filter(r => r.estado === "Pendiente"), 
  [state.retiros])

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left pb-10">
      <div className="flex justify-between items-end border-b-2 border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-950 uppercase leading-none">Resumen Ejecutivo</h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Consolidado general de ingresos y stock de audiencia.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiDivisa title="Total Pesos (MP)" value={ingresosTotales.ars} divisa="ARS" icon={<CircleDollarSign className="text-blue-600" />} />
        <KpiDivisa title="Total Dólares (Stripe)" value={ingresosTotales.usd} divisa="USD" icon={<TrendingUp className="text-emerald-600" />} />
        <KpiDivisa title="Total USDT (Crypto)" value={ingresosTotales.crypto} divisa="USDT" icon={<Wallet className="text-amber-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-2xl rounded-[32px] overflow-hidden bg-white border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500" style={{ color: '#020617' }}>Evolución Global de Audiencia</CardTitle>
            <div className="flex gap-1 bg-white p-1.5 rounded-2xl shadow-inner border border-slate-200">
                {[{k:'day', l:'7D'}, {k:'week', l:'8S'}, {k:'month', l:'6M'}, {k:'year', l:'5A'}].map((p) => (
                    <Button 
                        key={p.k} size="sm" variant={periodo === p.k ? 'default' : 'ghost'}
                        className={`text-[10px] h-8 px-4 uppercase font-black rounded-xl transition-all ${periodo === p.k ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-500'}`}
                        onClick={() => setPeriodo(p.k as Periodo)}
                    >
                        {p.l}
                    </Button>
                ))}
            </div>
          </CardHeader>
          <CardContent className="h-72 pt-10 px-6">
            {loading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-200" size={32}/></div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={datosAcumulados} margin={{ bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                        <XAxis 
                            dataKey="label" 
                            tick={{fontSize: 10, fill: '#1e293b', fontWeight: '900'}} 
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            dy={10}
                        />
                        <YAxis tick={{fontSize: 10, fill: '#1e293b', fontWeight: '900'}} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontWeight: '900'}} />
                        <Area 
                            type="stepAfter" 
                            dataKey="cantidad" 
                            stroke="#2563eb" 
                            strokeWidth={4} 
                            fillOpacity={0.1} 
                            fill="#2563eb" 
                            name="Total Usuarios"
                            dot={{ r: 4, fill: '#2563eb', stroke: '#fff' }} 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white flex flex-col border border-slate-100">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2" style={{ color: '#020617' }}>
                <Bell size={14} className="text-blue-500" /> Solicitudes de Retiro
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-y-auto max-h-[340px]">
            {retirosPendientes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400">
                    <Check className="mb-2 text-emerald-500" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Al día</p>
                </div>
            ) : retirosPendientes.map((r, i) => (
                <div key={i} className="p-5 hover:bg-slate-50 transition-all flex items-center justify-between border-b border-slate-50 last:border-0">
                    <div className="text-left">
                        <p className="text-sm font-black text-slate-950 uppercase tracking-tight leading-none mb-1">Solicitud de Retiro</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase italic">Canal: {r.metodo}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-base font-black text-blue-600">${Number(r.monto).toLocaleString('es-AR')}</p>
                        <Badge className="text-[9px] h-5 bg-amber-50 text-amber-700 border-none uppercase font-black px-3 rounded-lg shadow-sm">Pendiente</Badge>
                    </div>
                </div>
            ))}
          </CardContent>
          <div className="p-4 border-t border-slate-100 bg-slate-50/30">
            <Button 
                className="w-full bg-[#0f172a] hover:bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] h-14 rounded-2xl shadow-xl transition-all active:scale-95" 
                onClick={() => navigate('/pagos')}
            >
                GESTIONAR PAGOS
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function KpiDivisa({ title, value, divisa, icon }: { title: string, value: number, divisa: string, icon: React.ReactNode }) {
    return (
        <Card className="border-none shadow-xl rounded-[28px] bg-white overflow-hidden border border-slate-50 text-left">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 bg-slate-50 rounded-2xl flex items-center justify-center shadow-inner">{icon}</div>
                    <Badge className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 border-none px-3 py-1 rounded-full">{divisa}</Badge>
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1" style={{ color: '#020617' }}>{title}</p>
                <div className="text-3xl font-black text-slate-950 mt-1 tracking-tighter leading-none">
                    {divisa === 'USDT' ? `${value.toLocaleString('es-AR')}` : `$ ${value.toLocaleString('es-AR')}`}
                </div>
            </CardContent>
        </Card>
    )
}

function calculateTimeLimit(periodo: Periodo): string {
    const today = new Date();
    let limitDate = new Date(today);
    switch (periodo) {
        case 'day': limitDate.setDate(today.getDate() - 7); break;   
        case 'week': limitDate.setDate(today.getDate() - 56); break; 
        case 'month': limitDate.setMonth(today.getMonth() - 6); break; 
        case 'year': limitDate.setFullYear(today.getFullYear() - 5); break; 
    }
    limitDate.setHours(0, 0, 0, 0); 
    return limitDate.toISOString(); 
}

function formatDate(tickItem: string, periodo: Periodo): string {
    const date = new Date(tickItem + 'T00:00:00Z');
    if (periodo === 'year') return date.toLocaleDateString('es-AR', { year: 'numeric' }); 
    if (periodo === 'month') return date.toLocaleDateString('es-AR', { month: 'short' }).replace('.','').toUpperCase(); 
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.','').toUpperCase(); 
}

function fillMissingData(data: any[], periodo: Periodo): any[] {
    const map: Record<string, any> = {};
    data.forEach(item => { 
        const key = new Date(item.fecha + 'T00:00:00Z').toISOString().split('T')[0];
        map[key] = item; 
    });
    const finalArray = [];
    let current = new Date(calculateTimeLimit(periodo));
    const end = new Date();
    if (periodo === 'month') current.setDate(1);
    if (periodo === 'year') { current.setMonth(0); current.setDate(1); }
    while (current <= end) {
        const key = current.toISOString().split('T')[0];
        finalArray.push(map[key] || { fecha: key, neto: 0 });
        if (periodo === 'day') current.setDate(current.getDate() + 1);
        else if (periodo === 'week') current.setDate(current.getDate() + 7);
        else if (periodo === 'month') current.setMonth(current.getMonth() + 1);
        else if (periodo === 'year') current.setFullYear(current.getFullYear() + 1);
    }
    return finalArray;
}