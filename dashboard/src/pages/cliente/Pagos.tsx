
import React, { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDemo } from '@/demo/DemoProvider'
import { useToast } from '@/components/Toast'

export default function PagosCliente() {
  const { state, crearPagoLink, aprobarPago } = useDemo()
  const { push } = useToast()
  const canales = state.canales.filter(c => c.cliente === state.clienteActual)
  const [form, setForm] = useState({ canal: canales[0]?.nombre || '', plan: 'Mensual', precio: '49', duracion: '30', metodo: 'USDT' })
  
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
      <p className="text-sm text-slate-600">Creá links de pago y aprobá para generar invitación (demo).</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader><CardTitle>Crear link de pago</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-slate-600">Canal</label>
              <select className="w-full border border-slate-300 rounded-xl text-sm px-3 py-2"
                value={form.canal} onChange={e=>setForm({ ...form, canal: e.target.value })}>
                {canales.map(c => <option key={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600">Plan</label>
                <Input value={form.plan} onChange={e=>setForm({ ...form, plan: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-600">Precio (USD)</label>
                <Input value={form.precio} onChange={e=>setForm({ ...form, precio: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600">Duración (días)</label>
                <Input value={form.duracion} onChange={e=>setForm({ ...form, duracion: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-600">Método</label>
                <select className="w-full border border-slate-300 rounded-xl text-sm px-3 py-2"
                  value={form.metodo} onChange={e=>setForm({ ...form, metodo: e.target.value })}>
                  {['USDT','Tarjeta','MercadoPago'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
              <Button 
                className="w-full"
                onClick={async ()=>{
                  setIsLoading(true) // INICIA CARGA
                  try {
                    const link = await crearPagoLink(
                      state.clienteActual, 
                      form.canal, 
                      form.plan, 
                      parseFloat(form.precio||'0'), 
                      parseInt(form.duracion||'0'), 
                      form.metodo
                    )
                    try { await navigator.clipboard.writeText(link) } catch {}
                    push(`Link de pago creado y copiado: ${link}`)
                  } catch (e) {
                    // Muestra error de API
                    push(`Error al crear link: ${e instanceof Error ? e.message : 'Desconocido'}`)
                  } finally {
                    setIsLoading(false) // FINALIZA CARGA
                  }
                }}
                disabled={isLoading} // DESHABILITA EL BOTÓN MIENTRAS CARGA
              >
                {isLoading ? 'Creando...' : 'Crear link'} 
              </Button>
              <p className="text-xs text-slate-500">* prueba de pasarela .</p>
            </CardContent>
          </Card>

        <Card>
          <CardHeader><CardTitle>Solicitudes recientes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {state.pagos.filter(p=>p.cliente===state.clienteActual).slice(-5).reverse().map(p => (
              <div key={p.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{p.plan} · {p.canal} · ${p.precioUSD}</div>
                  <div className="text-xs text-slate-500">ID {p.id} · {p.metodo} · {p.estado}</div>
                  <div className="text-xs truncate max-w-[36ch]">{p.paymentLink}</div>
                  {p.inviteLink && <div className="text-xs text-emerald-700 truncate max-w-[36ch]">{p.inviteLink}</div>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={async ()=>{ try { await navigator.clipboard.writeText(p.paymentLink) } catch {}; push('Link de pago copiado') }}>Copiar</Button>
                  {p.estado === 'Pendiente' && <Button size="sm" onClick={async ()=>{ const inv = aprobarPago(p.id); try { await navigator.clipboard.writeText(inv) } catch {}; }}>Aprobar</Button>}
                </div>
              </div>
            ))}
            {!state.pagos.filter(p=>p.cliente===state.clienteActual).length && <p className="text-sm text-slate-500">No hay solicitudes aún.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
