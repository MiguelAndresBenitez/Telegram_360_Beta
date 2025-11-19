import React, { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useDemo } from '@/demo/DemoProvider'
import { Badge } from '@/components/ui/badge'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/Toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserX } from 'lucide-react' // Icono para la expulsión

// DATOS PLACEHOLDER - Se espera que la API traiga las métricas por canal
const METRICS_PLACEHOLDER = [] as { d: string; ingresos: number; solicitudes: number; abandonos: number }[]

// Datos PLACEHOLDER para suscriptores (simulan el resultado de la base de datos)
const SUBSCRIBERS_PLACEHOLDER = [
    { telegramId: 6007159738, nombre: 'Amigo 1 (Ejemplo)', joinedDate: '2025-10-13' },
    { telegramId: 9876543210, nombre: 'Amigo 2 (Demo)', joinedDate: '2025-10-14' },
];


export default function CanalesCliente() {
  // Añadir la función removeUserFromChannel del worker
  const { state, setCanalTipo, removeUserFromChannel } = useDemo() 
  const { push } = useToast()
  
  // Filtrar canales por cliente actual
  const canales = state.canales.filter(c => c.cliente === state.clienteActual)
  const [sel, setSel] = useState(canales[0]?.nombre || '')
  
  // Usamos el placeholder para la gráfica de métricas
  const data = METRICS_PLACEHOLDER 

  // Buscar el canal seleccionado para obtener el ID real de Telegram (canal_id)
  const canalSeleccionado = useMemo(() => {
    // Nota: La implementación real de la API debe devolver el canal_id
    // Aquí usamos un valor hardcodeado para la demo:
    const canal = state.canales.find(c => c.nombre === sel);
    return {
        ...canal,
        // Usar un ID de canal de ejemplo (-100...) para la demo
        idTelegram: -1003100466287 // Reemplazar con el ID real del canal de la DB
    }; 
  }, [sel, state.canales])

  // Handler para la remoción de usuarios (llama al worker user_remover.py)
  const handleRemove = async (userId: number) => {
    // Aquí se necesita el ID del canal (ej: -1003100466287) y el ID del amigo (ej: 6007159738)
    const channelApiId = canalSeleccionado.idTelegram; 

    if (!channelApiId) {
        return push("Error: Canal no seleccionado o sin ID.");
    }
    
    // Llamada al worker de remoción
    await removeUserFromChannel(channelApiId, userId) 
    push(`Tarea de expulsión enviada: ${userId}. Verificando en Telegram...`)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Canales</h1>
      <p className="text-sm text-slate-600">Métricas por canal (conectado a DB) y gestión de suscriptores.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Gráficas de Métricas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Métricas del canal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <select className="border border-slate-300 rounded-xl text-sm px-3 py-2" value={sel} onChange={e=>setSel(e.target.value)}>
                {canales.map(c => <option key={c.nombre}>{c.nombre}</option>)}
              </select>
              <Badge variant="secondary">Tipo: {canalSeleccionado?.tipo}</Badge>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="d" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="ingresos" strokeWidth={2} />
                  <Line type="monotone" dataKey="solicitudes" strokeWidth={2} />
                  <Line type="monotone" dataKey="abandonos" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gestión de Tipo */}
        <Card>
          <CardHeader><CardTitle>Gestión</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-slate-600">Seleccioná canal</label>
              <select className="w-full border border-slate-300 rounded-xl text-sm px-3 py-2" value={sel} onChange={e=>setSel(e.target.value)}>
                {canales.map(c => <option key={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Cambiar tipo</label>
              <select className="w-full border border-slate-300 rounded-xl text-sm px-3 py-2"
                value={canalSeleccionado?.tipo}
                onChange={e=>{ setCanalTipo(sel, e.target.value as any); push(`Canal ${sel} ahora es ${e.target.value}`) }}>
                <option>Free</option>
                <option>VIP</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLA DE SUSCRIPTORES (Refleja datos del worker de sincronización) */}
      <Card className="mt-4">
        <CardHeader><CardTitle>Suscriptores Activos ({SUBSCRIBERS_PLACEHOLDER.length})</CardTitle></CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Telegram ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SUBSCRIBERS_PLACEHOLDER.map((s) => (
                  <TableRow key={s.telegramId}>
                    <TableCell className="font-medium">{s.telegramId}</TableCell>
                    <TableCell>{s.nombre}</TableCell>
                    <TableCell>{s.joinedDate}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        // LLAMADA FINAL AL WORKER DE REMOCIÓN
                        onClick={() => handleRemove(s.telegramId)} 
                      >
                        <UserX className="h-4 w-4 mr-2" /> Expulsar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  )
}