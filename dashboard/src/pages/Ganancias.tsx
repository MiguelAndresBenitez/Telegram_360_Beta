import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { Button } from '@/components/ui/button'
import { useDemo } from '@/demo/DemoProvider'
import { TrendingUp, Percent, DollarSign, Calendar, Clock, CheckCircle, Wallet, CircleDollarSign, BarChart3, Loader2 } from 'lucide-react'

export default function Ganancias() {
  const { state } = useDemo()
  const [days, setDays] = useState(30)
  const [currency, setCurrency] = useState('all') // Se mantiene 'all' internamente por lógica
  const [campañas, setCampañas] = useState<any[]>([])
  const [retiros, setRetiros] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [resCamp, resRet] = await Promise.all([
          fetch('http://localhost:8000/campañas/'),
          fetch('http://localhost:8000/retiros/')
        ])
        if (resCamp.ok) setCampañas(await resCamp.json())
        if (resRet.ok) setRetiros(await resRet.json())
      } catch (e) {
        console.error("Error cargando métricas")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const filtrarPorFecha = (data: any[]) => {
    const limite = new Date();
    limite.setDate(limite.getDate() - days);
    return data.filter(item => {
      const fecha = new Date(item.timestamp || item.fecha_inicio || item.fecha || Date.now());
      return fecha >= limite;
    });
  };

  const stats = useMemo(() => {
    const campFiltradas = filtrarPorFecha(campañas);
    const retFiltrados = filtrarPorFecha(retiros);

    let pubTotal = 0;
    let comPagada = 0;
    let comPendiente = 0;

    campFiltradas.forEach(c => {
      const met = String(c.metodo || c.moneda || 'ars').toLowerCase();
      const matchMoneda = currency === 'all' || 
                         (currency === 'ars' && (met.includes('ars') || met.includes('pesos'))) ||
                         (currency === 'usd' && (met.includes('usd') && !met.includes('usdt')) || met.includes('dolar')) ||
                         (currency === 'usdt' && met.includes('usdt'));
      if (matchMoneda) pubTotal += (c.presupuesto || 0);
    });

    retFiltrados.forEach(r => {
      const met = String(r.metodo || '').toLowerCase();
      const matchMoneda = currency === 'all' || 
                         (currency === 'ars' && (met.includes('ars') || met.includes('pesos'))) ||
                         (currency === 'usd' && (met.includes('usd') && !met.includes('usdt')) || met.includes('dolar')) ||
                         (currency === 'usdt' && met.includes('usdt'));
      if (matchMoneda) {
        const comision = (r.monto * (r.comision_aplicada || 10) / 100);
        if (r.estado === 'Pagado') comPagada += comision;
        else if (r.estado === 'Pendiente') comPendiente += comision;
      }
    });

    return { pubTotal, comPagada, comPendiente, comTotal: comPagada + comPendiente };
  }, [campañas, retiros, days, currency]);

  const chartData = [
    { name: 'Publicidad', valor: stats.pubTotal, color: '#3b82f6' },
    { name: 'Comisiones', valor: stats.comTotal, color: '#10b981' }
  ];

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-900" size={32} /></div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 p-2">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-slate-200 pb-6 text-left">
        <div>
          <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">Ganancias Administrativas</h1>
          <p className="text-[11px] text-slate-600 font-black uppercase tracking-widest mt-3 flex items-center gap-2">
            <Calendar size={13}/> Historial: {days} días — Moneda: {currency === 'all' ? 'TODAS' : currency.toUpperCase()}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner border border-slate-300">
            {['all', 'ars', 'usd', 'usdt'].map(m => (
              <Button 
                key={m}
                variant="ghost"
                className={`rounded-xl px-5 h-9 text-[10px] font-black uppercase transition-all ${currency === m ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setCurrency(m)}
              >
                {m === 'all' ? 'TODAS' : m} {/* Cambio visual solicitado */}
              </Button>
            ))}
          </div>

          <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner border border-slate-300">
            {[7, 30, 90].map(d => (
              <Button 
                key={d}
                variant="ghost" 
                className={`rounded-xl px-4 h-9 text-[10px] font-black ${days === d ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-600'}`}
                onClick={() => setDays(d)}
              >
                {d}D
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI CARDS - SOMBRAS Y LETRAS REFORZADAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Publicidad" value={stats.pubTotal} icon={<TrendingUp size={18}/>} color="text-blue-800" bg="bg-blue-100" />
        <StatCard title="Comisiones" value={stats.comTotal} icon={<Percent size={18}/>} color="text-emerald-800" bg="bg-emerald-100" />
        <StatCard title="Liquidadas" value={stats.comPagada} icon={<CheckCircle size={18}/>} color="text-slate-900" bg="bg-slate-300" />
        <StatCard title="Pendientes" value={stats.comPendiente} icon={<Clock size={18}/>} color="text-amber-800" bg="bg-amber-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GRÁFICO */}
        <Card className="lg:col-span-2 border-none shadow-2xl rounded-[32px] bg-white p-8 border border-slate-200">
            <div className="flex items-center gap-3 mb-8 text-left">
                <BarChart3 size={20} className="text-slate-950" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-950">Origen de Ingresos ({currency === 'all' ? 'TODAS' : currency.toUpperCase()})</h3>
            </div>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '900', fill: '#1e293b' }} dy={10} />
                        <YAxis hide />
                        <Tooltip 
                            cursor={{ fill: '#f1f5f9' }} 
                            contentStyle={{ borderRadius: '20px', border: '2px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', fontSize: '12px', fontWeight: '900', color: '#020617' }} 
                        />
                        <Bar dataKey="valor" radius={[12, 12, 12, 12]} barSize={70}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>

        {/* RESUMEN TOTAL */}
        <Card className="border-none shadow-2xl rounded-[32px] bg-[#020617] text-white p-10 flex flex-col justify-between text-left relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-300 mb-3">Ganancia Total Consolidada</p>
                <h2 className="text-6xl font-black tracking-tighter text-emerald-400 leading-none">
                    ${(stats.pubTotal + stats.comTotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </h2>
                <p className="text-xs font-black text-slate-300 uppercase mt-6 leading-relaxed max-w-[220px]">
                    Suma total de pautas y comisiones netas ({currency === 'all' ? 'TODAS' : currency}).
                </p>
            </div>
            <div className="pt-8 border-t-2 border-white/20 mt-10 space-y-5 relative z-10">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Publicidad</span>
                    <span className="text-xl font-black text-white">${stats.pubTotal.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Comisiones</span>
                    <span className="text-xl font-black text-white">${stats.comTotal.toLocaleString('es-AR')}</span>
                </div>
            </div>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, bg }: any) {
    return (
        <Card className="border-none shadow-2xl rounded-[28px] bg-white p-6 border border-slate-200 hover:scale-[1.02] transition-all duration-300 text-left">
            <div className="flex items-center justify-between mb-4">
                <div className={`${bg} ${color} p-3 rounded-2xl shadow-md border border-black/5`}>{icon}</div>
                <p className="text-[9px] font-black text-slate-900 uppercase tracking-[0.15em]">{title}</p>
            </div>
            <div>
                <h3 className="text-3xl font-black text-slate-950 tracking-tighter leading-none">
                    ${value.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
                </h3>
            </div>
        </Card>
    )
}