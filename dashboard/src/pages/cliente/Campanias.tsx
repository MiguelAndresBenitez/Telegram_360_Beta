import React, { useMemo, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDemo } from '@/demo/DemoProvider'
import { Megaphone, CheckCircle2, Clock, History, Download, FileText, Loader2 } from 'lucide-react'

export default function CampaniasCliente() {
  const { user, state } = useDemo()
  const [misPublicidades, setMisPublicidades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const currentTelegramId = useMemo(() => 
    user?.telegram_id || 
    user?.id || 
    state.authenticatedClient?.telegramId || 
    state.clientes.find(c => c.nombre === state.clienteActual)?.telegramId || 
    null, 
  [user, state.clientes, state.clienteActual, state.authenticatedClient]);

  useEffect(() => {
    const cargarCampanasDesdeDB = async () => {
      if (!currentTelegramId) { setLoading(false); return; }
      try {
        const res = await fetch(`http://localhost:8000/campanias/cliente/?telegram_id=${currentTelegramId}`);
        if (res.ok) {
          const data = await res.json();
          const pagadas = data.filter((c: any) => c.gasto_publicitario > 0);
          setMisPublicidades(pagadas);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    cargarCampanasDesdeDB();
  }, [currentTelegramId]);

  const descargarComprobante = (campaña: any) => {
    const vent = window.open('', '_blank');
    if (!vent) return;
    vent.document.write(`
      <html>
        <head>
          <title>Recibo - ${campaña.alias}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #0f172a; }
            .content { max-width: 600px; margin: 0 auto; border: 2px solid #f1f5f9; padding: 40px; border-radius: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 3px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
            .row { display: flex; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid #f8fafc; font-weight: bold; }
            .total { font-size: 28px; font-weight: 900; margin-top: 30px; border-top: 3px solid #0f172a; padding-top: 20px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="content">
            <div class="header"><h1 style="font-weight: 900; letter-spacing: -1px;">RECIBO DE PUBLICIDAD</h1></div>
            <div class="row"><span>CLIENTE ID</span> <span>#${currentTelegramId}</span></div>
            <div class="row"><span>CAMPAÑA</span> <span>${campaña.alias.toUpperCase()}</span></div>
            <div class="row"><span>FECHA</span> <span>${new Date().toLocaleDateString()}</span></div>
            <div class="total"><span>TOTAL</span> <span>$${campaña.presupuesto} USD</span></div>
          </div>
        </body>
      </html>
    `);
    vent.document.close();
  };

  return (
    <div className="p-4 space-y-8 animate-in fade-in duration-500 text-left bg-white min-h-screen">
      <div className="border-b-2 border-slate-100 pb-4">
        <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">Historial de Publicidad</h1>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Reporte consolidado de pautas y campañas abonadas</p>
      </div>

      <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white border border-slate-100">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
          <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-950 flex items-center gap-2" style={{ color: '#020617' }}>
            <FileText size={16} className="text-blue-600" /> DETALLE DE PAUTAS CONFIRMADAS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y-2 divide-slate-50">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-blue-500" size={40} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando pautas...</p>
              </div>
            ) : misPublicidades.map((c, i) => (
              <div key={i} className="p-8 hover:bg-slate-50/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-[#0f172a] text-white shadow-xl">
                    <Megaphone size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950 text-base uppercase tracking-tight leading-none mb-2">{c.alias || 'Campaña Sin Título'}</h3>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase italic">
                            <Clock size={12} /> {c.fecha_inicio || 'DÍA DE HOY'}
                        </span>
                        <span className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg">
                            <CheckCircle2 size={12} /> CONFIRMADO
                        </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IMPORTE</p>
                        <p className="text-xl font-black text-slate-950 tracking-tighter leading-none">${c.presupuesto.toLocaleString()} USD</p>
                    </div>
                    
                    <Button 
                      onClick={() => descargarComprobante(c)}
                      className="bg-[#0f172a] hover:bg-black text-white rounded-2xl h-14 px-8 flex items-center justify-center gap-3 min-w-[220px] shadow-2xl transition-all active:scale-95 border-none font-black text-[11px] uppercase tracking-widest"
                    >
                      <Download size={18} /> DESCARGAR RECIBO
                    </Button>
                </div>
              </div>
            ))}

            {!loading && misPublicidades.length === 0 && (
              <div className="py-32 text-center">
                <History size={48} className="text-slate-200 mx-auto mb-5" />
                <h3 className="text-slate-900 font-black tracking-tight uppercase">Sin historial de pagos</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-2">No se encontraron registros de pautas publicitarias contratadas</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}