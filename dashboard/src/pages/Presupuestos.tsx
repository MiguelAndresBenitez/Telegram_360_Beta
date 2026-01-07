import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/Toast'
import { useDemo } from '@/demo/DemoProvider'
import { TrendingUp, Save, Loader2, User, Plus } from 'lucide-react'

export default function Presupuestos() {
  const { state } = useDemo()
  const { push } = useToast()

  const [campañas, setCampañas] = useState<any[]>([])
  const [filtroCliente, setFiltroCliente] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<number | null>(null)
  
  const [incrementos, setIncrementos] = useState<Record<number, string>>({})

  const fetchCampañas = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('http://localhost:8000/campañas/')
      if (res.ok) {
        const data = await res.json()
        setCampañas(data.filter((c: any) => c.presupuesto > 0))
      }
    } catch (error) {
      push("Error al conectar con el servidor", "error")
    } finally {
      setIsLoading(false)
    }
  }, [push])

  useEffect(() => { fetchCampañas() }, [fetchCampañas])

  const handleUpdateGasto = async (campaniaId: number, montoAAñadir: number, presupuestoTotal: number, gastoActual: number) => {
    const nuevoGastoTotal = gastoActual + montoAAñadir;

    if (nuevoGastoTotal > presupuestoTotal) {
      push("❌ Error: El gasto total superaría el presupuesto disponible", "error");
      return;
    }

    setIsUpdating(campaniaId)
    try {
      const res = await fetch(`http://localhost:8000/campanias/${campaniaId}/gasto?nuevo_gasto=${nuevoGastoTotal}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (res.ok) {
        setCampañas(prev => prev.map(c => 
          c.campaña_id === campaniaId ? { ...c, gasto_publicitario: nuevoGastoTotal } : c
        ))
        setIncrementos(prev => ({ ...prev, [campaniaId]: '' }))
        push("✅ Gasto acumulado actualizado", "success")
      }
    } catch (e) {
      push("❌ Error de red", "error")
    } finally {
      setIsUpdating(null)
    }
  }

  const campañasFiltradas = useMemo(() => {
    return campañas.filter(c => 
      filtroCliente === 'all' || (c.cliente_id || c.cliente)?.toString() === filtroCliente
    )
  }, [campañas, filtroCliente])

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-2 text-left pb-10">
      {/* HEADER CON TIPOGRAFÍA REFORZADA */}
      <div className="border-b-2 border-slate-100 pb-4">
        <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">Control de Pautas</h1>
      </div>

      <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white border border-slate-100">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" /> RESUMEN DE INVERSIÓN PUBLICITARIA
            </CardTitle>
            
            <select 
              className="bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase px-6 h-12 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            >
              <option value="all">TODOS LOS CLIENTES</option>
              {state.clientes.map(c => (
                <option key={c.telegramId} value={c.telegramId.toString()}>{c.nombre.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b border-slate-200">
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest">Campaña / Dueño</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest text-right">Presupuesto</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest text-right">Gasto</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest text-right">Incrementar</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest text-center">Saldo Actual</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest text-center">Acción</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campañasFiltradas.map((c) => {
                const gastoActual = c.gasto_publicitario || 0;
                const saldo = c.presupuesto - gastoActual;
                const nombreDueño = c.cliente_nombre || state.clientes.find(cl => cl.telegramId === (c.cliente_id || c.cliente))?.nombre || 'N/D';

                return (
                  <TableRow key={c.campaña_id} className="hover:bg-slate-50 transition-all border-b border-slate-50">
                    <TableCell className="px-8 py-6">
                      <div className="text-base font-black text-slate-950 uppercase tracking-tight mb-1">{c.alias}</div>
                      <div className="text-[11px] font-black text-blue-600 uppercase flex items-center gap-1 italic">
                        <User size={12} /> {nombreDueño}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-8 py-6 text-right font-black text-slate-950 text-sm">
                      ${c.presupuesto.toLocaleString()}
                    </TableCell>

                    <TableCell className="px-8 py-6 text-right font-black text-slate-400 text-sm">
                      ${gastoActual.toLocaleString()} 🔒
                    </TableCell>

                    <TableCell className="px-8 py-6 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Plus size={12} className="text-emerald-600 stroke-[3]" />
                        <Input 
                          type="number"
                          placeholder="0"
                          value={incrementos[c.campaña_id] || ''}
                          onChange={(e) => setIncrementos({ ...incrementos, [c.campaña_id]: e.target.value })}
                          className="w-24 h-11 bg-emerald-50 border-2 border-emerald-100 text-right font-black text-sm rounded-xl text-emerald-700 shadow-inner px-4"
                        />
                      </div>
                    </TableCell>

                    <TableCell className="px-8 py-6 text-center">
                      <Badge className={`text-[11px] font-black px-4 py-1.5 rounded-lg shadow-sm border-none ${saldo <= 0 ? 'bg-red-100 text-red-700' : 'bg-slate-950 text-white'}`}>
                        ${saldo.toLocaleString()}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-8 py-6 text-center">
                      <button 
                        disabled={isUpdating === c.campaña_id || !incrementos[c.campaña_id]}
                        onClick={() => handleUpdateGasto(c.campaña_id, parseFloat(incrementos[c.campaña_id]), c.presupuesto, gastoActual)}
                        className="bg-[#0f172a] hover:bg-black text-white rounded-2xl px-8 h-12 flex items-center justify-center gap-2 mx-auto transition-all shadow-2xl active:scale-95 disabled:opacity-20 border-none font-black text-[11px] uppercase tracking-widest"
                      >
                        {isUpdating === c.campaña_id ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                        ACTUALIZAR
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}