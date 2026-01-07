import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDemo } from '@/demo/DemoProvider'
import { useToast } from '@/components/Toast'
import { Loader2, X, CheckCircle2, FileDown, Wallet } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Pagos() {
  const { state } = useDemo()
  const { push } = useToast()

  const [filtroCliente, setFiltroCliente] = useState('all')
  const [retiros, setRetiros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [comisionesEditables, setComisionesEditables] = useState<Record<number, number>>({})

  const loadRetiros = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/retiros/')
      if (res.ok) {
        const data = await res.json()
        const listaLimpia = (Array.isArray(data) ? data : []).filter(r => r !== null)
        setRetiros(listaLimpia)
        
        const initialEdits: Record<number, number> = {}
        listaLimpia.forEach((r: any) => {
          if (r.retiro_id) {
            initialEdits[r.retiro_id] = r.comision_aplicada ?? 10
          }
        })
        setComisionesEditables(initialEdits)
      }
    } catch (e) { push("Error cargando datos", "error") }
    finally { setLoading(false) }
  }, [push])

  useEffect(() => { loadRetiros() }, [loadRetiros])

  const handleUpdate = async (id: number, estado: string, comision?: number) => {
    try {
      let url = `http://localhost:8000/retiro/${id}/estado?nuevo_estado=${estado}`
      if (comision !== undefined) url += `&comision_aplicada=${comision}`
      const res = await fetch(url, { method: 'PUT' })
      if (res.ok) {
        await loadRetiros()
        push(estado === 'Pagado' ? "✅ Pago liquidado" : "❌ Solicitud rechazada")
      }
    } catch (e) { push("Error de red", "error") }
  }

  const formatearFecha = (dateString: string) => {
    if (!dateString) return "---"
    return new Date(dateString).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const generarComprobante = (r: any) => {
    try {
      const doc = new jsPDF();
      const cliente = state.clientes.find(c => c.telegramId === r.cliente_id || c.id === r.cliente_id);
      const comisionFinal = r.comision_aplicada ?? 10;
      const bruto = Number(r.monto) || 0;
      const descuento = bruto * (comisionFinal / 100);
      const neto = bruto - descuento;

      doc.setFontSize(20);
      doc.text("RECIBO DE LIQUIDACION", 105, 25, { align: "center" });
      
      autoTable(doc, {
        startY: 40,
        head: [['CONCEPTO', 'DETALLE']],
        body: [
          ['ID OPERACION', `#${r.retiro_id}`],
          ['FECHA', formatearFecha(r.timestamp)],
          ['CLIENTE', cliente?.nombre || 'S/D'],
          ['METODO', r.metodo.toUpperCase()],
          ['MONTO BRUTO', `$${bruto.toFixed(2)}`],
          ['COMISION', `${comisionFinal}%`],
          ['NETO ABONADO', `$${neto.toFixed(2)}`]
        ],
        headStyles: { fillColor: [15, 23, 42] }
      });

      doc.save(`Recibo_Pago_${r.retiro_id}.pdf`);
    } catch (e) { push("Error al generar PDF", "error") }
  };

  const filtrados = useMemo(() => {
    return retiros.filter(r => r && (filtroCliente === 'all' || r.cliente_id?.toString() === filtroCliente))
  }, [retiros, filtroCliente])

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-900" size={32} /></div>

  return (
    <div className="p-4 space-y-8 bg-white min-h-screen text-left animate-in fade-in duration-500">
      <div className="border-b-2 border-slate-100 pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-950 leading-none">Administración de Pagos</h1>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Liquidación de saldos y control de comisiones aplicadas</p>
      </div>

      <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white border border-slate-100">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2" style={{ color: '#020617' }}>
              <Wallet size={16} className="text-blue-600" /> HISTORIAL DE SOLICITUDES
            </CardTitle>

            {/* 🛠️ FILTRO POR CLIENTE RESTAURADO */}
            <select 
              className="bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase px-6 h-12 outline-none shadow-sm focus:ring-2 focus:ring-blue-500 transition-all text-slate-950"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            >
              <option value="all">TODOS LOS CLIENTES</option>
              {state.clientes.map(c => (
                <option key={c.telegramId} value={c.telegramId.toString()}>{c.nombre.toUpperCase()}</option>
              ))}
            </select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <thead className="bg-slate-50">
              <TableRow className="border-b-2 border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest">Información / Fecha</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest text-right">Bruto</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest text-center">Comisión %</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest text-right">Neto Final</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest text-center">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest text-right">Acciones</th>
              </TableRow>
            </thead>
            <TableBody>
              {filtrados.map((r) => {
                const esPagado = r.estado === 'Pagado';
                const esRechazado = r.estado === 'Rechazado';
                const valCom = esPagado ? (r.comision_aplicada ?? 0) : (comisionesEditables[r.retiro_id] ?? 10);
                const brutoNum = Number(r.monto) || 0;
                const netoFinal = brutoNum - (brutoNum * (valCom / 100));
                const cliente = state.clientes.find(c => c.telegramId === r.cliente_id);

                return (
                  <TableRow key={r.retiro_id} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                    <TableCell className="px-8 py-6">
                        <div className="text-sm font-black uppercase text-slate-950 tracking-tight leading-none mb-1">{cliente?.nombre || `ID: ${r.cliente_id}`}</div>
                        <div className="text-[11px] font-black text-slate-500 uppercase italic">
                            {formatearFecha(r.timestamp)}
                        </div>
                    </TableCell>
                    <TableCell className="px-8 py-6 text-right font-black text-slate-950 text-xs">${brutoNum.toFixed(2)}</TableCell>
                    <TableCell className="px-8 py-6 text-center">
                        {esPagado ? <Badge className="bg-blue-600 text-white font-black text-[9px] rounded-lg px-4 py-1 shadow-md">{valCom}% FIX</Badge> : (
                             <Input type="number" className="w-16 h-10 text-center font-black text-xs border-2 border-slate-100 rounded-xl text-slate-950" value={valCom} onChange={e => setComisionesEditables({...comisionesEditables, [r.retiro_id]: parseFloat(e.target.value) || 0})} />
                        )}
                    </TableCell>
                    <TableCell className="px-8 py-6 text-right font-black text-sm text-blue-600 tracking-tighter">${netoFinal.toFixed(2)}</TableCell>
                    <TableCell className="px-8 py-6 text-center">
                      <Badge className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-lg shadow-sm border-none ${esPagado ? 'bg-slate-950 text-white' : 'bg-amber-100 text-amber-700'}`}>{r.estado}</Badge>
                    </TableCell>
                    
                    <TableCell className="px-8 py-6">
                      <div className="flex justify-end gap-3 items-center">
                        {!esPagado && !esRechazado && (
                          <div className="flex items-center gap-3">
                            <Button size="sm" className="bg-[#0f172a] hover:bg-black text-[10px] font-black uppercase h-11 px-6 rounded-2xl shadow-xl transition-all active:scale-95" onClick={() => handleUpdate(r.retiro_id, 'Pagado', valCom)}>Aprobar</Button>
                            <X size={20} className="text-red-400 cursor-pointer hover:text-red-600 transition-colors stroke-[3]" onClick={() => handleUpdate(r.retiro_id, 'Rechazado')} />
                          </div>
                        )}
                        
                        {esPagado && (
                          <button 
                            onClick={() => generarComprobante(r)} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-2xl transition-all active:scale-95 border-none"
                          >
                            <FileDown size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">PDF</span>
                          </button>
                        )}
                        {esPagado && <CheckCircle2 size={22} className="text-blue-600 stroke-[3]" />}
                      </div>
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