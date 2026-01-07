import React, { useMemo, useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Users, UserPlus, Search, FileDown, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useDemo } from '@/demo/DemoProvider'

type Periodo = 'day' | 'week' | 'month' | 'year';

export default function Clientes() {
  const { state } = useDemo()
  
  const [periodo, setPeriodo] = useState<Periodo>('day')
  const [clienteFiltro, setClienteFiltro] = useState<string>('all')
  const [canalFiltro, setCanalFiltro] = useState<string>('all')
  
  const [datosGrafico, setDatosGrafico] = useState<any[]>([])
  const [reporteAudiencia, setReporteAudiencia] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const targetId = clienteFiltro === 'all' 
          ? (state.authenticatedClient?.telegram_id || state.authenticatedClient?.telegramId || state.clientes[0]?.telegramId) 
          : parseInt(clienteFiltro);

        if (!targetId) {
          setLoading(false);
          return;
        }

        const startISO = calculateTimeLimit(periodo);
        
        // 🛠️ FILTRO DE GRUPO VINCULADO AL GRÁFICO
        const queryParams = new URLSearchParams({ 
          group_by: 'day', 
          cliente_telegram_id: targetId.toString() 
        });

        // Si hay un canal específico seleccionado, lo añadimos a la consulta
        if (canalFiltro !== 'all') {
          queryParams.append('canal_id', canalFiltro);
        }
        
        const resM = await fetch(`http://localhost:8000/metricas/balance-neto?${queryParams}`);
        const metricas = resM.ok ? await resM.json() : [];
        
        const cambiosMap: Record<string, number> = {};
        metricas.forEach((m: any) => { 
          const key = m.fecha.split('T')[0];
          cambiosMap[key] = (cambiosMap[key] || 0) + m.nuevos_usuarios; 
        });

        const finalData = [];
        let current = new Date(startISO);
        let acumulado = 0;

        // Base histórica
        metricas.forEach((m: any) => {
          if (new Date(m.fecha) < current) acumulado += m.nuevos_usuarios;
        });

        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);

        while (current <= hoy) {
          const key = current.toISOString().split('T')[0];
          const nextStep = new Date(current);
          
          if (periodo === 'day') nextStep.setDate(nextStep.getDate() + 1);
          else if (periodo === 'week') nextStep.setDate(nextStep.getDate() + 7);
          else if (periodo === 'month') nextStep.setMonth(nextStep.getMonth() + 1);
          else nextStep.setFullYear(nextStep.getFullYear() + 1);

          // Sumamos todos los días dentro del bloque (Arregla el error de 10 vs 7)
          let tempDate = new Date(current);
          while (tempDate < nextStep && tempDate <= hoy) {
            const k = tempDate.toISOString().split('T')[0];
            if (cambiosMap[k] !== undefined) acumulado += cambiosMap[k];
            tempDate.setDate(tempDate.getDate() + 1);
          }
          
          finalData.push({ 
            fecha: key, 
            cantidad: Math.max(0, acumulado), 
            label: formatDate(key, periodo) 
          });

          current = nextStep;
        }
        setDatosGrafico(finalData);

        // Tabla de miembros
        const resT = await fetch(`http://localhost:8000/cliente/${targetId}/miembros-csv`);
        if (resT.ok) {
          const data = await resT.json();
          setReporteAudiencia(Array.isArray(data) ? data : []);
        }
      } catch (e) { 
        console.error("Error en Clientes:", e); 
      } finally { 
        setLoading(false); 
      }
    }
    loadData()
  }, [periodo, clienteFiltro, canalFiltro, state.authenticatedClient]); // 🛠️ Dependencia canalFiltro añadida

  const nuevosUltimaSemana = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);
    return reporteAudiencia.filter(r => r.u_joined && r.u_joined !== 'N/D' && new Date(r.u_joined) >= limite).length;
  }, [reporteAudiencia]);

  const rows = useMemo(() => reporteAudiencia.filter(r =>
    (!search || r.u_id.toString().includes(search) || r.u_name.toLowerCase().includes(search.toLowerCase())) &&
    (canalFiltro === 'all' || r.c_id?.toString() === canalFiltro || r.c_name === canalFiltro)
  ), [reporteAudiencia, search, canalFiltro]);

  const handleExportCSV = () => {
    if (!rows.length) return;
    const headers = "ID_Telegram,Nombre,Email,Canal,Fecha_Ingreso,Estado";
    const content = rows.map(r => `${r.u_id},${r.u_name},${r.u_mail},${r.c_name},${r.u_joined},${r.status}`).join("\n");
    const blob = new Blob([`${headers}\n${content}`], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_audiencia.csv`;
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 p-2 text-left">
      <div className="border-b-2 border-slate-100 pb-4">
        <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">Análisis de Audiencia</h1>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Reporte detallado de miembros y crecimiento por canal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KpiSimple title="Audiencia Total" value={reporteAudiencia.length} icon={<Users size={24}/>} color="blue" />
        <KpiSimple title="Nuevos (Últimos 7 días)" value={`+${nuevosUltimaSemana}`} icon={<UserPlus size={24}/>} color="emerald" />
      </div>

      <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white border border-slate-100">
        <CardHeader className="bg-slate-50 border-b border-slate-100 px-8 py-6 flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-[11px] font-black uppercase text-slate-900 tracking-widest" style={{ color: '#020617' }}>EVOLUCIÓN DE STOCK REAL</CardTitle>
          <div className="flex flex-wrap gap-2">
            <select className="text-[10px] font-black uppercase border-2 border-slate-100 rounded-xl px-4 bg-white h-10 outline-none shadow-sm text-slate-950" value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)}>
              <option value="all">TODOS LOS CLIENTES</option>
              {state.clientes.map(c => <option key={c.telegramId} value={c.telegramId}>{c.nombre.toUpperCase()}</option>)}
            </select>
            
            <select className="text-[10px] font-black uppercase border-2 border-slate-100 rounded-xl px-4 bg-white h-10 outline-none shadow-sm text-slate-950" value={canalFiltro} onChange={(e) => setCanalFiltro(e.target.value)}>
              <option value="all">TODOS LOS GRUPOS</option>
              {/* Usamos un Map para asegurar IDs únicos de canales */}
              {[...new Map(reporteAudiencia.map(item => [item.c_id || item.c_name, item.c_name])).entries()].map(([id, name]) => (
                <option key={id} value={id}>{name.toUpperCase()}</option>
              ))}
            </select>

            <div className="flex gap-1 bg-slate-200/50 p-1.5 rounded-2xl shadow-inner border border-slate-200">
              {[{k:'day', l:'7D'}, {k:'week', l:'8S'}, {k:'month', l:'6M'}, {k:'year', l:'5A'}].map((p) => (
                <Button key={p.k} size="sm" variant={periodo === p.k ? 'default' : 'ghost'} className={`text-[10px] h-8 px-4 uppercase font-black rounded-xl transition-all ${periodo === p.k ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-500'}`} onClick={() => setPeriodo(p.k as Periodo)}>{p.l}</Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-80 pt-10 px-6">
          {loading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-200" size={40}/></div> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={datosGrafico} margin={{ bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
              <XAxis dataKey="label" tick={{fontSize: 11, fill: '#1e293b', fontWeight: '900'}} axisLine={false} tickLine={false} interval={0} dy={10} />
              <YAxis tick={{fontSize: 11, fill: '#1e293b', fontWeight: '900'}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontWeight: '900'}} />
              <Area type="stepAfter" dataKey="cantidad" stroke="#2563eb" strokeWidth={4} fillOpacity={0.1} fill="#2563eb" dot={{ r: 4, fill: '#2563eb', stroke: '#fff' }} name="Usuarios" />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white border border-slate-100">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-8">
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input placeholder="BUSCAR POR NOMBRE O ID..." className="pl-12 bg-white border-2 border-slate-100 rounded-2xl h-14 text-sm font-black uppercase shadow-sm text-slate-950" value={search} onChange={(e) => setSearch(e.target.value)}/>
          </div>
          <Button variant="outline" className="rounded-2xl border-2 border-slate-100 text-[11px] font-black uppercase gap-2 h-14 px-8 hover:bg-slate-950 hover:text-white transition-all shadow-md active:scale-95" onClick={handleExportCSV}>
            <FileDown size={18} /> EXPORTAR AUDIENCIA
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b border-slate-200">
                <th className="px-10 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest text-left">Miembro (ID)</th>
                <th className="px-10 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest text-left">Canal / Grupo</th>
                <th className="px-10 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest text-right">Estado</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i} className="hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-all">
                  <TableCell className="px-10 py-6"><div className="text-base font-black text-slate-950 uppercase tracking-tight leading-none mb-1">{r.u_name}</div><div className="text-[11px] text-slate-500 font-black italic">ID: {r.u_id}</div></TableCell>
                  <TableCell className="px-10 py-6"><Badge className="text-[10px] uppercase bg-blue-100 text-blue-700 border-none font-black px-4 py-1 rounded-lg shadow-sm">{r.c_name.toUpperCase()}</Badge></TableCell>
                  <TableCell className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-[11px] font-black uppercase tracking-widest ${r.status === 'Al día' ? 'text-emerald-600' : 'text-red-600'}`}>{r.status}</span>
                      {r.status === 'Al día' ? <CheckCircle size={18} className="text-emerald-500 stroke-[3]" /> : <AlertCircle size={18} className="text-red-500 stroke-[3]" />}
                    </div>
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

function calculateTimeLimit(p: Periodo): string {
    const d = new Date(); d.setHours(0,0,0,0);
    if (p === 'day') d.setDate(d.getDate() - 6);
    else if (p === 'week') { d.setDate(d.getDate() - 7 * 7); }
    else if (p === 'month') { d.setMonth(d.getMonth() - 5); d.setDate(1); }
    else { d.setFullYear(d.getFullYear() - 4); d.setMonth(0); d.setDate(1); }
    return d.toISOString();
}

function formatDate(v: string, p: Periodo) {
    const d = new Date(v + 'T00:00:00Z');
    if (p === 'year') return d.getUTCFullYear().toString();
    if (p === 'month') return d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '').toUpperCase();
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '').toUpperCase();
}

function KpiSimple({ title, value, icon, color }: any) {
    const colors: any = { blue: 'bg-blue-100 text-blue-700', emerald: 'bg-emerald-100 text-emerald-700' }
    return (
        <Card className="border-none shadow-xl rounded-[28px] bg-white p-8 flex items-center gap-6 border border-slate-50 hover:shadow-2xl transition-all">
            <div className={`h-16 w-16 rounded-3xl flex items-center justify-center shadow-inner ${colors[color]}`}>{icon}</div>
            <div>
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1" style={{ color: '#020617' }}>{title}</p>
                <p className="text-4xl font-black text-slate-950 tracking-tighter leading-none">{value}</p>
            </div>
        </Card>
    )
}