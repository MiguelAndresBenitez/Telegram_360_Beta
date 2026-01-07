import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useDemo } from '@/demo/DemoProvider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/Toast';
import { UserMinus, TrendingUp, Activity, ShieldCheck, Globe, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CanalesCliente() {
  const { user, state } = useDemo();
  const { push } = useToast();
  
  const [canales, setCanales] = useState<any[]>([]);
  const [selectedCanal, setSelectedCanal] = useState<string>('all'); // 🛠️ Ahora permite 'all'
  const [suscriptores, setSuscriptores] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentTelegramId = useMemo(() => 
    user?.telegram_id || user?.id || state.clientes.find(c => c.nombre === state.clienteActual)?.telegramId || null, 
  [user, state.clientes, state.clienteActual]);

  const canalActualInfo = useMemo(() => 
    canales.find(c => c.canal_id.toString() === selectedCanal),
  [canales, selectedCanal]);

  useEffect(() => {
    async function fetchCanales() {
      if (!currentTelegramId) { setLoading(false); return; }
      try {
        const res = await fetch(`http://localhost:8000/canales/cliente/${currentTelegramId}`);
        if (res.ok) {
          const data = await res.json();
          setCanales(data);
          // 🛠️ Mantenemos 'all' por defecto para ver el total al inicio
          setSelectedCanal('all');
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchCanales();
  }, [currentTelegramId]);

  useEffect(() => {
    if (!currentTelegramId) return;

    async function loadCanalDetails() {
      try {
        // 🛠️ LÓGICA DE FILTRO PARA GRÁFICO
        if (selectedCanal === 'all') {
          // Si es "Todos", usamos el endpoint de balance neto filtrado por cliente
          const resH = await fetch(`http://localhost:8000/metricas/balance-neto?group_by=day&cliente_telegram_id=${currentTelegramId}`);
          if (resH.ok) {
            const data = await resH.json();
            setHistorial(data.map((m: any) => ({
              fecha: new Date(m.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).toUpperCase(),
              cantidad: m.nuevos_usuarios
            })));
          }
          // Para miembros usamos el reporte CSV que trae todos los del cliente
          const resM = await fetch(`http://localhost:8000/cliente/${currentTelegramId}/miembros-csv`);
          if (resM.ok) {
            const data = await resM.json();
            setSuscriptores(data.map((s: any) => ({
                telegram_id: s.u_id,
                first_name: s.u_name,
                canal_nombre: s.c_name
            })));
          }
        } else {
          // Si es un canal específico, usamos los endpoints originales
          const resM = await fetch(`http://localhost:8000/canal/miembros/${selectedCanal}`);
          if (resM.ok) setSuscriptores(await resM.json());

          const resH = await fetch(`http://localhost:8000/canales/metricas-historicas/${selectedCanal}`);
          if (resH.ok) setHistorial(await resH.json());
        }
      } catch (e) { console.error(e); }
    }
    loadCanalDetails();
  }, [selectedCanal, currentTelegramId]);

  const handleChangeTipo = async (nuevoTipo: string) => {
    if (selectedCanal === 'all') return push("Selecciona un canal específico para cambiar su tipo", "error");
    try {
      const res = await fetch(`http://localhost:8000/canal/update_tipo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal_id: parseInt(selectedCanal), tipo: nuevoTipo })
      });
      if (res.ok) {
        push(`✅ Canal actualizado a modo ${nuevoTipo}`);
        setCanales(prev => prev.map(c => 
          c.canal_id.toString() === selectedCanal ? { ...c, es_vip: nuevoTipo === 'VIP' } : c
        ));
      }
    } catch (e) { push("Error al conectar con el servidor", "error"); }
  };

  const handleExpulsar = async (userId: number, canalId?: number) => {
    const targetCanal = canalId || parseInt(selectedCanal);
    if (isNaN(targetCanal)) return push("Error: ID de canal no identificado", "error");
    
    try {
      const res = await fetch(`http://localhost:8000/tasks/remove_user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_user', channel_id: targetCanal, user_id: userId })
      });
      if (res.ok) {
        push("✅ Tarea de expulsión enviada");
        setSuscriptores(prev => prev.filter(s => s.telegram_id !== userId));
      }
    } catch (e) { push("Error de red", "error"); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-900" size={32} /></div>

  return (
    <div className="p-4 space-y-8 animate-in fade-in duration-500 text-left bg-white min-h-screen">
      <div className="border-b-2 border-slate-100 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">Panel de Canales</h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Gestión de membresías y moderación de miembros</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 uppercase shadow-sm">
          <Activity size={14} className="animate-pulse" /> LIVE ANALYTICS
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 border-none shadow-2xl rounded-[32px] overflow-hidden bg-white border border-slate-100">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-black uppercase text-slate-950 tracking-widest flex items-center gap-2" style={{ color: '#020617' }}>
              <TrendingUp size={16} className="text-blue-600" /> MIEMBROS TOTALES ({selectedCanal === 'all' ? 'ACUMULADO GLOBAL' : 'POR CANAL'})
            </CardTitle>
            
            {/* 🛠️ FILTRO DE GRUPO INTEGRADO EN LA CABECERA DEL GRÁFICO */}
            <select 
              className="bg-white border-2 border-slate-200 rounded-xl text-[9px] font-black uppercase px-3 h-8 outline-none shadow-sm focus:border-blue-500 transition-all text-slate-950"
              value={selectedCanal}
              onChange={(e) => setSelectedCanal(e.target.value)}
            >
              <option value="all">TODOS LOS GRUPOS</option>
              {canales.map(c => <option key={c.canal_id} value={c.canal_id.toString()}>{c.nombre.toUpperCase()}</option>)}
            </select>
          </CardHeader>
          <CardContent className="h-[320px] pt-10 px-4">
            {historial.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historial} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#1e293b', fontWeight: '900'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#1e293b', fontWeight: '900'}} />
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontWeight: '900'}} />
                  <Area type="stepAfter" dataKey="cantidad" stroke="#2563eb" strokeWidth={4} fillOpacity={0.1} fill="#2563eb" dot={{ r: 4, fill: '#2563eb', stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-300 text-[10px] font-black uppercase tracking-widest">Sin datos históricos</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-2xl rounded-[32px] bg-white border border-slate-100 self-start">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
            <CardTitle className="text-[11px] font-black uppercase text-slate-950 tracking-widest" style={{ color: '#020617' }}>AJUSTES DEL CANAL</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-950 ml-1" style={{ color: '#020617' }}>Canal Activo</label>
              <select 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase p-4 outline-none shadow-sm focus:border-blue-500 transition-all text-slate-950"
                value={selectedCanal}
                onChange={(e) => setSelectedCanal(e.target.value)}
              >
                <option value="all">PANEL GENERAL (CONSOLIDADO)</option>
                {canales.map(c => <option key={c.canal_id} value={c.canal_id.toString()}>{c.nombre.toUpperCase() || `ID: ${c.canal_id}`}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-950 ml-1" style={{ color: '#020617' }}>Cambiar Tipo de Canal</label>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => handleChangeTipo('VIP')}
                  disabled={selectedCanal === 'all'}
                  className={`rounded-2xl h-14 flex flex-col gap-1 shadow-xl transition-all font-black uppercase text-[10px] tracking-tighter ${canalActualInfo?.es_vip ? 'bg-[#0f172a] text-white shadow-2xl' : 'bg-slate-50 border-2 border-slate-100 text-slate-400 hover:border-slate-300'} ${selectedCanal === 'all' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ShieldCheck size={16} /> MODO VIP
                </Button>
                <Button 
                  onClick={() => handleChangeTipo('GRATIS')}
                  disabled={selectedCanal === 'all'}
                  className={`rounded-2xl h-14 flex flex-col gap-1 shadow-xl transition-all font-black uppercase text-[10px] tracking-tighter ${canalActualInfo && !canalActualInfo?.es_vip ? 'bg-blue-600 text-white shadow-2xl' : 'bg-slate-50 border-2 border-slate-100 text-slate-400 hover:border-slate-300'} ${selectedCanal === 'all' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Globe size={16} /> MODO GRATIS
                </Button>
              </div>
            </div>

            <div className="p-5 bg-[#0f172a] rounded-2xl text-white shadow-2xl border border-slate-800">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-1 tracking-[0.2em]">ID de Canal Registrado</p>
                <code className="text-sm font-black text-blue-400 font-mono">{selectedCanal === 'all' ? '-------' : selectedCanal}</code>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white border border-slate-100">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-8 text-left">
          <CardTitle className="text-[11px] font-black uppercase text-slate-950 tracking-widest" style={{ color: '#020617' }}>
            MIEMBROS REGISTRADOS ({suscriptores.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 text-left">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-10 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest">Telegram ID</th>
                  <th className="px-10 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest">Nombre de Usuario</th>
                  {selectedCanal === 'all' && <th className="px-10 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest">Canal</th>}
                  <th className="px-10 py-5 text-[10px] font-black uppercase text-slate-950 tracking-widest text-right">Moderación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {suscriptores.map((s, idx) => (
                  <tr key={`${s.telegram_id}-${idx}`} className="hover:bg-slate-50 transition-all">
                    <td className="px-10 py-6 text-sm font-black text-slate-950 tracking-tighter leading-none">{s.telegram_id}</td>
                    <td className="px-10 py-6 text-sm font-black text-slate-950 uppercase tracking-tight">{s.first_name || 'Sin Nombre'}</td>
                    {selectedCanal === 'all' && (
                        <td className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.canal_nombre || 'Desconocido'}</td>
                    )}
                    <td className="px-10 py-6 text-right">
                      <Button 
                        onClick={() => handleExpulsar(s.telegram_id, s.c_id)}
                        disabled={selectedCanal === 'all' && !s.c_id}
                        className="bg-[#0f172a] hover:bg-black text-white font-black uppercase text-[10px] tracking-widest px-8 h-11 rounded-2xl transition-all shadow-xl active:scale-95 border-none"
                      >
                        <UserMinus size={16} className="mr-2" /> EXPULSAR
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}