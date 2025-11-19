import React, { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, DollarSign, Wallet, Link2, Plus } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts'
import { useDemo, useKPIs } from '@/demo/DemoProvider'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { downloadCSV } from '@/utils/csv'

// Datos de ejemplo para la gráfica (se asume que la API los traerá después)
const CHART_PLACEHOLDER_DATA = [] as { fecha: string; ingresos: number; gastos: number }[]


export default function Clientes() {
  const { state, addCliente } = useDemo()
  const { gananciaHoy, gastoHoy, balanceBilletera } = useKPIs()
  const [filter, setFilter] = useState('')
  const [openNew, setOpenNew] = useState(false)
  const [newName, setNewName] = useState('')

  const filtered = useMemo(() => state.clientes.filter(c => c.nombre.toLowerCase().includes(filter.toLowerCase())), [state.clientes, filter])
  const ingresosVsGastos = CHART_PLACEHOLDER_DATA
  const { push } = useToast()

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-slate-600">Resumen general, métricas clave y accesos rápidos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary"><Link2 className="mr-2 h-4 w-4"/>Crear link publicitario</Button>
          <Button onClick={()=>setOpenNew(true)}><Plus className="mr-2 h-4 w-4"/>Nuevo cliente</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        <Kpi title="Ganancia de hoy" value={gananciaHoy} icon={<TrendingUp className="h-5 w-5" />} delta={+12}/>
        <Kpi title="Gasto publicitario" value={gastoHoy} icon={<DollarSign className="h-5 w-5" />} delta={-5}/>
        <Kpi title="Balance billetera" value={balanceBilletera} icon={<Wallet className="h-5 w-5" />} muted/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Evolución: Ingresos vs Gastos</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ingresosVsGastos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="ingresos" strokeWidth={2} />
                <Line type="monotone" dataKey="gastos" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Solicitudes de retiro (semana)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={state.retiros}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cliente" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="monto" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-2 mt-3 flex-wrap">
              {state.retiros.map((s) => (
                <Badge key={s.cliente} variant={s.estado === "Pagado" ? "default" : "secondary"}>{s.cliente}: {s.estado}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Clientes activos ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Input placeholder="Filtrar por nombre…" className="h-9 max-w-xs" value={filter} onChange={e=>setFilter(e.target.value)} />
            <Button variant="outline" className="h-9" onClick={()=>downloadCSV('clientes.csv', filtered)}>Exportar CSV</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total ventas</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.nombre}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-200 grid place-items-center text-xs font-medium">{c.nombre.substring(0,2).toUpperCase()}</div>
                      <div>
                        <p className="font-medium leading-tight">{c.nombre}</p>
                        <p className="text-xs text-slate-500">Canales asignados · {state.canales.filter(ca => ca.cliente === c.nombre).length}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{c.ventas}</TableCell>
                  <TableCell className="text-right">{c.roi.toFixed(2)}x</TableCell>
                  <TableCell className="text-right">$ {c.balance.toLocaleString("es-AR")}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="secondary" onClick={()=>push(`Abrí el dashboard de ${c.nombre} (demo)`)}>Ver detalle</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal open={openNew} onClose={()=>setOpenNew(false)} title="Nuevo cliente">
        <div>
          <label className="text-xs text-slate-600">Nombre del cliente</label>
          <Input placeholder="Ej: Tips Master" value={newName} onChange={e=>setNewName(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={()=>setOpenNew(false)}>Cancelar</Button>
          <Button onClick={()=>{ addCliente(newName || 'Cliente nuevo'); setOpenNew(false); setNewName('') }}>Crear</Button>
        </div>
      </Modal>
    </div>
  )
}

function Kpi({ title, value, icon, delta, muted }:{ title: string; value: number; icon: React.ReactNode; delta?: number; muted?: boolean }) {
  const isUp = (delta ?? 0) >= 0
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <span className={`h-8 w-8 grid place-items-center rounded-xl ${muted ? 'bg-slate-100' : 'bg-emerald-100'}`}>{icon}</span>
          {title}
        </CardTitle>
        {!muted && typeof delta === 'number' && (<Badge variant={isUp ? 'default' : 'secondary'}>{isUp ? '+' : ''}{delta}%</Badge>)}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">$ {value.toLocaleString('es-AR')}</div>
        {!muted && (<p className="text-xs text-slate-500 mt-1">vs día anterior</p>)}
      </CardContent>
    </Card>
  )
}