
import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useClientKPIs, useDemo } from '@/demo/DemoProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'

export default function InicioCliente() {
  // Añade requestRetiro al useDemo
  const { name, disponible, cobrado, enEspera, publicitario, roi, roas, cpa, ventas } = useClientKPIs()
  const { state, requestRetiro } = useDemo() // <--- CAMBIO AQUÍ
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [monto, setMonto] = useState('100')
  const [metodo, setMetodo] = useState('USDT')

  const [isLoading, setIsLoading] = useState(false)

  // Handler para la solicitud de retiro
  const handleRetiro = async () => {
    setIsLoading(true)
    try {
      // Llama a la nueva función asíncrona del DemoProvider
      await requestRetiro(parseFloat(monto || '0'), metodo)
      push(`Solicitud de retiro enviada: $${monto} por ${metodo}`)
      setOpen(false)
    } catch (e) {
      push(`Error al solicitar retiro: ${e instanceof Error ? e.message : 'Desconocido'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {name}</h1>
        <Button variant="outline" onClick={()=>setOpen(true)}>Solicitar retiro</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat title="Balance disponible" value={disponible} />
        <Stat title="Balance cobrado" value={cobrado} />
        <Stat title="Balance en espera" value={enEspera} />
        <Stat title="Balance publicitario" value={publicitario} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Small title="ROI" value={roi.toFixed(2) + 'x'} />
        <Small title="ROAS" value={roas.toFixed(2)} />
        <Small title="CPA aprox." value={`$ ${cpa}`} />
        <Small title="Ventas (30d)" value={ventas} />
      </div>

      <Card>
        <CardHeader><CardTitle>Accesos rápidos</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild><a href="/cliente/pagos">Crear link de pago</a></Button>
          <Button variant="secondary" asChild><a href="/cliente/ventas">Ver ventas</a></Button>
          <Button variant="outline" asChild><a href="/cliente/campanias">Campañas</a></Button>
        </CardContent>
      </Card>

      <Modal open={open} onClose={()=>setOpen(false)} title="Solicitar retiro">
        <div className="grid gap-3">
          <div>
            <label className="text-xs text-slate-600">Monto</label>
            <Input value={monto} onChange={e=>setMonto(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-600">Método</label>
            <select className="w-full border border-slate-300 rounded-xl text-sm px-3 py-2"
              value={metodo} onChange={e=>setMetodo(e.target.value)}>
              {['USDT','Tarjeta','MercadoPago'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button onClick={handleRetiro} disabled={isLoading || parseFloat(monto || '0') <= 0}>
              {isLoading ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Stat({ title, value }:{ title: string; value: number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm text-slate-600">{title}</CardTitle></CardHeader>
      <CardContent><div className="text-2xl font-semibold">$ {value.toLocaleString('es-AR')}</div></CardContent>
    </Card>
  )
}
function Small({ title, value }:{ title: string; value: string|number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm text-slate-600">{title}</CardTitle></CardHeader>
      <CardContent><div className="text-xl font-semibold">{value}</div></CardContent>
    </Card>
  )
}
