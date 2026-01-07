import React, { useMemo, useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDemo } from '@/demo/DemoProvider'
import { downloadCSV } from '@/utils/csv'
import { Search, FileDown, History, CheckCircle, AlertCircle, Loader2, Activity } from 'lucide-react'

export default function VentasCliente() {
  const { user, state } = useDemo()
  const [reporte, setReporte] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const currentTelegramId = useMemo(() => 
    user?.telegram_id || 
    user?.id || 
    state.authenticatedClient?.telegramId || 
    state.clientes.find(c => c.nombre === state.clienteActual)?.telegramId || 
    null, 
  [user, state.clientes, state.clienteActual, state.authenticatedClient]);

  useEffect(() => {
    async function fetchReporte() {
      if (!currentTelegramId) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const res = await fetch(`http://localhost:8000/cliente/${currentTelegramId}/miembros-csv`)
        if (res.ok) {
          const data = await res.json()
          setReporte(Array.isArray(data) ? data : [])
        }
      } catch (e) {
        console.error("Error al cargar datos de ventas:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchReporte()
  }, [currentTelegramId])

  const rows = useMemo(() => reporte.filter(r =>
    (!q || r.u_id.toString().includes(q) || r.u_name.toLowerCase().includes(q.toLowerCase()))
  ), [reporte, q])

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white text-slate-400">
      <Loader2 className="animate-spin" size={32} />
      <p className="font-black uppercase tracking-widest text-[10px]">Sincronizando registros financieros...</p>
    </div>
  )

  return (
    <div className="p-4 space-y-8 animate-in fade-in duration-500 text-left bg-white min-h-screen">
      <div className="border-b-2 border-slate-100 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">Control de Suscriptores</h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Reporte detallado de pagos, emails y estados de membresía</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 uppercase shadow-sm">
          <Activity size={14} className="animate-pulse" /> LIVE REPORTING
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <Input 
          placeholder="BUSCAR POR ID O NOMBRE DE USUARIO..." 
          value={q} 
          onChange={e => setQ(e.target.value)}
          className="pl-14 rounded-2xl border-2 border-slate-100 bg-white h-14 shadow-sm focus:border-blue-500 transition-all text-sm font-black uppercase text-slate-950"
        />
      </div>

      <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white border border-slate-100">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-black uppercase text-slate-950 tracking-widest flex items-center gap-2" style={{ color: '#020617' }}>
                <History size={16} className="text-blue-500" /> REGISTRO DE VENTAS ({rows.length})
            </CardTitle>
            <Button 
                onClick={() => downloadCSV('reporte_ventas.csv', rows)}
                className="bg-[#0f172a] hover:bg-black text-white rounded-2xl h-11 px-8 font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 border-none"
            >
                <FileDown size={18} className="mr-2" /> EXPORTAR CSV
            </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest">Usuario (ID)</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest">Email de contacto</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest text-center">Grupo / Canal</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest text-center">Monto</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest text-center">Método</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-slate-300 text-[11px] font-black uppercase tracking-widest italic">
                        No se encontraron registros para este cliente
                      </td>
                    </tr>
                ) : (
                    rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-all group">
                        <td className="px-8 py-6">
                            <div className="text-sm font-black text-slate-950 uppercase tracking-tight leading-none mb-1">{r.u_name}</div>
                            <div className="text-[10px] text-slate-400 font-black tracking-tighter">ID: {r.u_id}</div>
                        </td>
                        <td className="px-8 py-6 text-left text-[11px] text-slate-600 font-bold uppercase tracking-tight">{r.u_mail}</td>
                        <td className="px-8 py-6 text-center">
                            <span className="bg-blue-100 text-blue-700 border-none font-black text-[10px] px-3 py-1 rounded-lg shadow-sm">
                                {r.c_name?.toUpperCase() || 'S/D'}
                            </span>
                        </td>
                        <td className="px-8 py-6 text-center text-sm font-black text-emerald-600 tracking-tighter">{r.monto}</td>
                        <td className="px-8 py-6 text-center">
                            <span className="bg-slate-100 text-slate-600 border-none font-black text-[9px] px-3 py-1 rounded-lg uppercase tracking-widest">
                                {r.metodo}
                            </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${r.status === 'Al día' ? 'text-emerald-600' : 'text-red-500'}`}>{r.status}</span>
                                    {r.status === 'Al día' ? <CheckCircle size={16} className="text-emerald-500 stroke-[3]" /> : <AlertCircle size={16} className="text-red-500 stroke-[3]" />}
                                </div>
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{r.f_vence}</span>
                            </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}