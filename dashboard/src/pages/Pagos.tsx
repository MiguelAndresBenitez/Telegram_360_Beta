
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { useDemo } from '@/demo/DemoProvider'
import { useToast } from '@/components/Toast'

export default function Pagos() {
  const { state, marcarRetiroPagado } = useDemo()
  const { push } = useToast()

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Pagos y Solicitudes</h1>
      <p className="text-sm text-slate-600">Aprueba o rechaza solicitudes y visualiza el historial.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Solicitudes de retiro</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.retiros.map((r) => (
                  <TableRow key={r.cliente}>
                    <TableCell className="font-medium">{r.cliente}</TableCell>
                    <TableCell className="text-right">$ {r.monto.toFixed(2)}</TableCell>
                    <TableCell className="text-right">$ {r.comision.toFixed(2)}</TableCell>
                    <TableCell><Badge variant={r.estado === 'Pagado' ? 'default' : 'secondary'}>{r.estado}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={()=>{ marcarRetiroPagado(r.cliente); push(`Pago marcado para ${r.cliente}`) }}>Marcar pagado</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Retiros por cliente (semana)</CardTitle></CardHeader>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
