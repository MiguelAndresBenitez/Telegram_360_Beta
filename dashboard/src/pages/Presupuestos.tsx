
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { useDemo } from '@/demo/DemoProvider'
import { useToast } from '@/components/Toast'

export default function Presupuestos() {
  const { state, updatePresupuesto } = useDemo()
  const { push } = useToast()
  const total = state.presupuestos.reduce((a,b)=>a + b.presupuesto, 0)

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Presupuestos</h1>
      <p className="text-sm text-slate-600">Asignación y control de presupuestos publicitarios por cliente.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader><CardTitle>Presupuesto vs Gasto (ejemplo)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={state.presupuestos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cliente" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="presupuesto" strokeWidth={2} />
                <Line type="monotone" dataKey="gasto" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div className="text-sm text-slate-600 mt-2">Total presupuesto: <span className="font-semibold">$ {total.toLocaleString('es-AR')}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Editar presupuestos</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Presupuesto</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.presupuestos.map((r) => (
                  <TableRow key={r.cliente}>
                    <TableCell className="font-medium">{r.cliente}</TableCell>
                    <TableCell className="text-right">
                      <Input defaultValue={r.presupuesto} className="h-8 w-28 inline-block text-right" id={`p-${r.cliente}`} />
                    </TableCell>
                    <TableCell className="text-right">$ {r.gasto.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={()=>{
                        const el = document.getElementById(`p-${r.cliente}`) as HTMLInputElement
                        const val = parseFloat(el?.value || '0')
                        updatePresupuesto(r.cliente, isNaN(val) ? r.presupuesto : val)
                        push(`Presupuesto actualizado para ${r.cliente}`)
                      }}>Guardar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
