
import React, { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDemo } from '@/demo/DemoProvider'
import { downloadCSV } from '@/utils/csv'
import { useToast } from '@/components/Toast'

export default function VentasCliente() {
  const { state } = useDemo()
  const { push } = useToast()
  const all = state.ventas.filter(v => v.cliente === state.clienteActual)
  const [q, setQ] = useState('')
  const [metodo, setMetodo] = useState('')
  const [plan, setPlan] = useState('')
  const [camp, setCamp] = useState('')

  const rows = useMemo(() => all.filter(v =>
    (!q || v.telegramId.includes(q) || v.email.toLowerCase().includes(q.toLowerCase())) &&
    (!metodo || v.metodo === metodo) &&
    (!plan || v.plan === plan) &&
    (!camp || v.campaña === camp)
  ), [all, q, metodo, plan, camp])

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
      <p className="text-sm text-slate-600">Listado detallado con filtros y exportación (demo).</p>

      <Card className="mt-4">
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-3">
          <Input placeholder="Buscar id/email…" value={q} onChange={e=>setQ(e.target.value)} />
          <select className="border border-slate-300 rounded-xl text-sm px-3 py-2" value={metodo} onChange={e=>setMetodo(e.target.value)}>
            <option value="">Método</option>
            {['USDT','Tarjeta','MercadoPago'].map(m => <option key={m}>{m}</option>)}
          </select>
          <select className="border border-slate-300 rounded-xl text-sm px-3 py-2" value={plan} onChange={e=>setPlan(e.target.value)}>
            <option value="">Plan</option>
            {Array.from(new Set(all.map(v=>v.plan))).map(p => <option key={p}>{p}</option>)}
          </select>
          <select className="border border-slate-300 rounded-xl text-sm px-3 py-2" value={camp} onChange={e=>setCamp(e.target.value)}>
            <option value="">Campaña</option>
            {Array.from(new Set(all.map(v=>v.campaña))).map(c => <option key={c}>{c}</option>)}
          </select>
          <Button variant="outline" onClick={()=>downloadCSV('ventas.csv', rows)}>Exportar CSV</Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>Resultados ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2">Fecha</th>
                  <th className="text-left px-4 py-2">Telegram ID</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">País</th>
                  <th className="text-right px-4 py-2">Monto</th>
                  <th className="text-left px-4 py-2">Método</th>
                  <th className="text-left px-4 py-2">Plan</th>
                  <th className="text-left px-4 py-2">Campaña</th>
                  <th className="text-left px-4 py-2">Canal</th>
                  <th className="text-left px-4 py-2">Ingreso</th>
                  <th className="text-left px-4 py-2">Caduca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">{v.fecha}</td>
                    <td className="px-4 py-2">{v.telegramId}</td>
                    <td className="px-4 py-2">{v.email}</td>
                    <td className="px-4 py-2">{v.pais}</td>
                    <td className="px-4 py-2 text-right">$ {v.monto}</td>
                    <td className="px-4 py-2">{v.metodo}</td>
                    <td className="px-4 py-2">{v.plan}</td>
                    <td className="px-4 py-2">{v.campaña}</td>
                    <td className="px-4 py-2">{v.canal}</td>
                    <td className="px-4 py-2">{v.diaIngreso}</td>
                    <td className="px-4 py-2">{v.diaCaduca}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
