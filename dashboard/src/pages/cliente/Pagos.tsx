import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDemo } from '@/demo/DemoProvider'
import { useToast } from '@/components/Toast'
import { Smartphone, MessageSquare, Gift, Mail, CreditCard } from 'lucide-react'

interface Canal {
  canal_id: number;
  nombre: string;
}

type PaymentMethod = 'stripe' | 'mercadopago' | 'coinbase';

export default function Pagos() {
  const { state, user } = useDemo()
  const { push } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [misCanales, setMisCanales] = useState<Canal[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe')
  const [isFree, setIsFree] = useState(false)
  
  const [planData, setPlanData] = useState({
    price: '',
    groupId: '',
    targetTelegramId: '',
    email: '' 
  })

  // LÓGICA ORIGINAL INTACTA
  const currentOwnerId = useMemo(() => {
    if (user?.telegram_id) return user.telegram_id;
    if (user?.id) return user.id;
    const cliente = state.clientes.find(c => c.nombre === state.clienteActual);
    return cliente?.telegramId || cliente?.id || null;
  }, [user, state.clienteActual, state.clientes])

  const cargarCanales = useCallback(async () => {
    if (!currentOwnerId) return;
    try {
      const response = await fetch(`http://localhost:8000/canales/cliente/${currentOwnerId}`);
      if (!response.ok) throw new Error("Error en respuesta de servidor");
      const data = await response.json();
      setMisCanales(data);
    } catch (error) { 
      console.error(error); 
    }
  }, [currentOwnerId])

  useEffect(() => { 
    cargarCanales(); 
  }, [cargarCanales])

  const handleProcesarAccion = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isFree) {
        const res = await fetch('http://localhost:8000/tasks/create_invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canal_id: parseInt(planData.groupId),
            user_telegram_id: parseInt(planData.targetTelegramId),
            cliente_telegram_id: currentOwnerId,
            is_paid: false
          })
        });
        if (res.ok) push('🎁 Invitación gratuita enviada', 'default');
      } else {
        const res = await fetch(`http://localhost:8001/create-payment/${paymentMethod}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(planData.price),
            description: `Acceso VIP`,
            metadata: { user_id: planData.targetTelegramId, canal_id: planData.groupId, email: planData.email }
          })
        });
        if (res.ok) push(`✅ Link enviado al cliente`, 'default');
      }
    } catch (error) { push('Error de conexión', 'error'); } finally { setLoading(false); }
  }

  const nombreCanal = misCanales.find(c => String(c.canal_id) === planData.groupId)?.nombre || "Canal Seleccionado";

  return (
    <div className="p-4 space-y-8 animate-in fade-in duration-500 text-left">
      <div className="border-b-2 border-slate-100 pb-4">
          <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">Generador de Accesos</h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Emisión de links de pago e invitaciones VIP para usuarios</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 border-none shadow-2xl rounded-[32px] overflow-hidden bg-white border border-slate-100">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
            <CardTitle className="text-[11px] font-black uppercase text-slate-950 tracking-widest flex items-center gap-2" style={{ color: '#020617' }}>
              <CreditCard size={16} className="text-blue-600" /> CONFIGURACIÓN DEL ACCESO
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${isFree ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
              <input type="checkbox" className="w-5 h-5 cursor-pointer accent-amber-600" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
              <label className="text-[11px] font-black uppercase text-slate-950 tracking-widest flex items-center gap-2" style={{ color: '#020617' }}>
                <Gift size={18} className={isFree ? 'text-amber-600' : 'text-slate-400'}/> ¿ES UNA INVITACIÓN GRATUITA?
              </label>
            </div>

            {!isFree && (
              <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit border border-slate-200 shadow-inner">
                {['stripe', 'mercadopago', 'coinbase'].map(m => (
                  <Button key={m} variant="ghost" onClick={() => setPaymentMethod(m as PaymentMethod)}
                    className={`rounded-xl px-5 h-9 text-[10px] font-black uppercase transition-all ${paymentMethod === m ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-500'}`}>
                    {m}
                  </Button>
                ))}
              </div>
            )}

            <form onSubmit={handleProcesarAccion} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-950 ml-1" style={{ color: '#020617' }}>Canal de Destino</label>
                <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase p-4 outline-none shadow-sm focus:border-blue-500 transition-all text-slate-950" 
                  value={planData.groupId} onChange={(e) => setPlanData({...planData, groupId: e.target.value})} required>
                  <option value="">SELECCIONAR CANAL...</option>
                  {misCanales.map(c => <option key={c.canal_id} value={c.canal_id}>{c.nombre.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-950 ml-1" style={{ color: '#020617' }}>Telegram ID Usuario</label>
                <Input placeholder="EJ: 511510852" value={planData.targetTelegramId} onChange={(e) => setPlanData({...planData, targetTelegramId: e.target.value})} required className="bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 text-sm font-black px-6 focus:border-blue-500 shadow-sm text-slate-950"/>
              </div>

              {!isFree && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-950 ml-1" style={{ color: '#020617' }}>Precio de Venta</label>
                    <Input type="number" value={planData.price} onChange={(e) => setPlanData({...planData, price: e.target.value})} required className="bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 text-sm font-black px-6 focus:border-blue-500 shadow-sm text-slate-950"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-950 ml-1" style={{ color: '#020617' }}>Email del Pagador</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-4.5 text-slate-400" size={18} />
                      <Input type="email" placeholder="CLIENTE@CORREO.COM" value={planData.email} onChange={(e) => setPlanData({...planData, email: e.target.value})} required className="bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 text-sm font-black pl-14 focus:border-blue-500 shadow-sm text-slate-950"/>
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" disabled={loading} className={`md:col-span-2 h-14 font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-2xl transition-all active:scale-95 text-white ${isFree ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {loading ? 'PROCESANDO...' : isFree ? 'ENVIAR INVITACIÓN GRATIS' : `ENVIAR LINK (${paymentMethod.toUpperCase()})`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* VISTA PREVIA SMARTPHONE */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest ml-4">
             <Smartphone size={16} /> Vista Previa del Mensaje
          </h3>
          <div className="bg-slate-300 rounded-[3.5rem] p-3 border-[10px] border-slate-950 shadow-2xl min-h-[520px] relative">
            <div className="bg-[#72b1e1] rounded-[2.5rem] p-5 mt-10 min-h-[420px] space-y-4">
              <div className="bg-white rounded-2xl p-4 shadow-xl text-[11px] space-y-3 text-slate-950 border border-white">
                <p className="font-black text-blue-600 flex items-center gap-2 border-b-2 border-slate-100 pb-2 uppercase tracking-tighter"> 
                  <MessageSquare size={14}/> Bot Administrador 
                </p>
                {isFree ? (
                  <p className="font-bold leading-relaxed">🎁 **¡INVITACIÓN VIP!**<br/>Has sido invitado a unirte al canal <b>{nombreCanal.toUpperCase()}</b> de forma gratuita.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="font-bold">Hola! 👋 Tienes un pago pendiente para entrar a <b>{nombreCanal.toUpperCase()}</b>.</p>
                    <p className="font-black text-lg text-slate-950 tracking-tighter leading-none">${planData.price || '0.00'}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Destinatario: {planData.email || '...'}</p>
                  </div>
                )}
                <div className={`p-3.5 rounded-xl text-white text-center font-black uppercase tracking-widest text-[10px] shadow-lg ${isFree ? 'bg-emerald-500' : 'bg-blue-600'}`}>
                  {isFree ? 'UNIRSE AL CANAL' : `PAGAR CON ${paymentMethod.toUpperCase()}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}