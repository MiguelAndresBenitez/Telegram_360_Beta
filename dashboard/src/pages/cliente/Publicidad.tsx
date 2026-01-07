import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDemo } from '@/demo/DemoProvider'
import { DollarSign, Loader2, ShieldCheck, Check, Megaphone, CreditCard, Bitcoin } from 'lucide-react'

export default function PublicidadCliente() {
  const { state } = useDemo()
  const [monto, setMonto] = useState('')
  const [alias, setAlias] = useState('')
  const [metodo, setMetodo] = useState('mercadopago')
  const [loading, setLoading] = useState(false)

  // Obtenemos el ID de telegram del cliente autenticado directamente del estado
  const tid = state.authenticatedClient?.telegramId;

  const handlePago = async () => {
    if (!monto || !alias) return alert("Por favor, completa el nombre de la pauta y el monto acordado.")
    
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:8000/pago-publicidad-directo?provider=${metodo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: tid,
          monto: parseFloat(monto),
          alias: alias,
          email: state.authenticatedClient?.correo
        })
      })

      if (res.ok) {
        const data = await res.json()
        const url = data.init_point || data.url || data.hosted_url || data.checkout_url;

        if (url) {
          const w = 500, h = 650;
          const left = (window.innerWidth/2)-(w/2), top = (window.innerHeight/2)-(h/2);
          window.open(url, 'Checkout', `width=${w},height=${h},top=${top},left=${left}`);
        } else {
          alert("Error: No se recibió un link de pago válido del servidor.")
        }
      }
    } catch (e) {
      console.error("Fallo de red:", e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 animate-in fade-in duration-500 text-left">
      <Card className="w-full max-w-[950px] border-none shadow-2xl rounded-[40px] overflow-hidden bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* LADO IZQUIERDO: FORMULARIO */}
          <div className="p-12 bg-slate-50/50 border-r-2 border-slate-100">
            <div className="mb-10">
              <div className="h-14 w-14 bg-[#0f172a] rounded-2xl flex items-center justify-center text-white mb-5 shadow-xl">
                <Megaphone size={28} />
              </div>
              <h2 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">Publicidad Directa</h2>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-3 italic">Generación de orden de pago para pautas y campañas</p>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-950 ml-1" style={{ color: '#020617' }}>Alias de la Campaña</label>
                <Input 
                  placeholder="EJ: MENCIÓN VIP 24HS" 
                  value={alias}
                  onChange={e => setAlias(e.target.value)}
                  className="h-14 rounded-2xl bg-white border-2 border-slate-100 font-black text-sm uppercase text-slate-950 focus:border-blue-500 transition-all px-6 shadow-sm"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-950 ml-1" style={{ color: '#020617' }}>Monto Acordado ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <Input 
                    type="number"
                    placeholder="0.00" 
                    value={monto}
                    onChange={e => setMonto(e.target.value)}
                    className="h-14 pl-14 rounded-2xl bg-white border-2 border-slate-100 font-black text-xl text-slate-950 focus:border-blue-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-14 flex items-center gap-3 text-slate-400">
              <ShieldCheck size={18} className="text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Transacción Segura y Encriptada SSL</span>
            </div>
          </div>

          {/* LADO DERECHO: MÉTODOS DE PAGO */}
          <div className="p-12 flex flex-col justify-between bg-white">
            <div className="space-y-5">
              <label className="text-[10px] font-black uppercase text-slate-950 ml-1" style={{ color: '#020617' }}>Seleccionar Método de Pago</label>
              
              <div className="grid gap-4">
                {[
                  { id: 'mercadopago', name: 'Mercado Pago', sub: 'Tarjetas locales y saldo', icon: <CreditCard size={20}/> },
                  { id: 'stripe', name: 'Stripe Payment', sub: 'Crédito Internacional USD', icon: <CreditCard size={20}/> },
                  { id: 'coinbase', name: 'Criptomonedas', sub: 'BTC, ETH, USDT (Red)', icon: <Bitcoin size={20}/> }
                ].map(opt => (
                  <div 
                    key={opt.id}
                    onClick={() => setMetodo(opt.id)}
                    className={`flex items-center gap-5 p-6 rounded-3xl border-2 cursor-pointer transition-all ${
                      metodo === opt.id 
                      ? 'border-[#0f172a] bg-[#0f172a] text-white shadow-2xl scale-[1.02]' 
                      : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <div className={`${metodo === opt.id ? 'text-blue-400' : 'text-slate-400'}`}>
                      {opt.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black uppercase tracking-wide leading-none">{opt.name}</p>
                      <p className={`text-[10px] mt-1.5 font-bold uppercase italic tracking-tighter opacity-70`}>{opt.sub}</p>
                    </div>
                    {metodo === opt.id && <Check size={20} className="text-emerald-400" />}
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handlePago}
              disabled={loading}
              className="w-full h-16 rounded-3xl bg-[#0f172a] hover:bg-black text-white font-black text-[11px] uppercase tracking-[0.25em] shadow-2xl mt-10 transition-all active:scale-95 border-none"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "GENERAR ORDEN DE PAGO"}
            </Button>
          </div>

        </div>
      </Card>
    </div>
  )
}