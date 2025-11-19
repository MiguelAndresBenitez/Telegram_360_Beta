import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, DollarSign, Wallet, Link2, Plus } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts'
import { useDemo, useKPIs } from '@/demo/DemoProvider'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { downloadCSV } from '@/utils/csv'
import { getMetricsResumen, getClientChannelMembersDetail } from '@/api/index' 
import { useNavigate } from 'react-router-dom';

// Definición de tipos para el filtrado
type Periodo = 'day' | 'week' | 'month' | 'year';

export default function Clientes() {
  const navigate = useNavigate(); 
  
  const { state, addCliente } = useDemo()
  const { gananciaHoy, gastoHoy, balanceBilletera } = useKPIs()
  const [filter, setFilter] = useState('')
  const { push } = useToast()

  // ESTADOS DE MÉTRICAS DETALLADAS
  const [periodo, setPeriodo] = useState<Periodo>('day');
  const [datosFiltrados, setDatosFiltrados] = useState<any[]>([]);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);
  const [clienteFilter, setClienteFilter] = useState<number | 'all'>('all'); 
  
  const filtered = useMemo(() => state.clientes.filter(c => c.nombre.toLowerCase().includes(filter.toLowerCase())), [state.clientes, filter])

 // LÓGICA DE CANALES POR CLIENTE
const canalesPorCliente = useMemo(() => {
  const namesAndCount: Record<number, { count: number, names: string[] }> = {};
  state.canales.forEach(canal => {
      if (canal.clienteId) {
          const id = canal.clienteId;
          namesAndCount[id] = namesAndCount[id] || { count: 0, names: [] };
          namesAndCount[id].count++;
          namesAndCount[id].names.push(canal.nombre);
      }
  });
  return namesAndCount;
}, [state.canales]);


// LÓGICA DE EXPORTACIÓN CSV (General)
const dataForCSV = useMemo(() => {
  return filtered.map(c => {
      const canalData = canalesPorCliente[c.telegramId] || { count: 0, names: [] };
      return {
          "Cliente": c.nombre,
          "Total Ventas": c.ventas,
          "ROI (x)": c.roi.toFixed(2) + 'x',
          "Balance ($)": c.balance.toLocaleString('es-AR'),
          "Canales Poseídos (Nombres)": canalData.names.join(', ') || 'Ninguno', 
          "Canales Poseídos (Conteo)": canalData.count,
          "Telegram ID (PK)": c.telegramId, 
          "VIP": c.esVip ? 'Sí' : 'No',
          "Apellido": c.apellido || 'N/A',
          "Info Bancaria": c.infoBancaria || 'N/A',
      }
  });
}, [filtered, canalesPorCliente]);
  
  // LÓGICA DE CARGA DE MÉTRICAS FILTRADAS
  useEffect(() => {
    async function fetchFilteredMetrics() {
        setCargandoMetricas(true);
        try {
            // 🚨 CAMBIO: CALCULAR LÍMITE DE TIEMPO
            const timeLimit = calculateTimeLimit(periodo);
            
            // 🚨 CAMBIO: ENVIAR LÍMITE DE TIEMPO A LA API
            const apiMetricas = await getMetricsResumen(periodo, clienteFilter, 'all', timeLimit); 
            
            const newMetricas = apiMetricas.map((m: any) => ({
                fecha: m.fecha,
                "Nuevos Usuarios": m.nuevos_usuarios, 
            }));
            
            setDatosFiltrados(newMetricas);
        } catch (e) {
            console.error("Error al recargar métricas filtradas:", e);
            setDatosFiltrados([]);
        } finally {
            setCargandoMetricas(false);
        }
    }
    
    fetchFilteredMetrics();
    
  }, [periodo, clienteFilter]); 
  
  const clientesMetricasData = datosFiltrados;


  // FUNCIÓN PARA EXPORTAR MIEMBROS DETALLADOS
  const handleExportMembersDetail = useCallback(async (clienteId: number, clienteNombre: string) => {
      if (!clienteId) return;

      push(`Preparando exportación de miembros para ${clienteNombre}...`);

      try {
          const data = await getClientChannelMembersDetail(clienteId); 
          
          if (data.length === 0) {
              push(`⚠️ El cliente ${clienteNombre} no tiene miembros suscritos a sus canales.`);
              return;
          }

          downloadCSV(`miembros_canales_${clienteNombre.replace(/\s/g, '_')}.csv`, data);
          push(`✅ Exportación detallada completada para ${clienteNombre}.`);

      } catch (e: any) {
          push(`❌ Error al exportar miembros: ${e.message || 'Error de conexión o API'}`);
      }
  }, [push]);


  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-slate-600">Resumen general, métricas clave y accesos rápidos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary"><Link2 className="mr-2 h-4 w-4"/>Crear link publicitario</Button>
          
          <Button onClick={() => navigate('/habilitacion')}>
            <Plus className="mr-2 h-4 w-4"/>Nuevo cliente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        <Kpi title="Ganancia de hoy" value={gananciaHoy} icon={<TrendingUp className="h-5 w-5" />} delta={+12}/>
        <Kpi title="Gasto publicitario" value={gastoHoy} icon={<DollarSign className="h-5 w-5" />} delta={-5}/>
        <Kpi title="Balance billetera" value={balanceBilletera} icon={<Wallet className="h-5 w-5" />} muted/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* GRÁFICA DETALLADA CON FILTRO DE CLIENTE */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>📈 Crecimiento de Usuarios por Cliente ({periodo})</span>
              
              <div className="flex gap-2 text-sm font-normal">
                {/* Filtro por Cliente (Usado para la separación/agrupación de la métrica) */}
                <select
                  className="border border-slate-300 rounded-xl text-sm px-2 py-1"
                  value={clienteFilter}
                  onChange={e => setClienteFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  disabled={cargandoMetricas}
                >
                  <option value="all">Todos los Clientes</option>
                  {state.clientes.map(cl => (
                    <option key={cl.telegramId} value={cl.telegramId}>{cl.nombre}</option>
                  ))}
                </select>

                {/* BOTONES DE AGRUPACIÓN */}
                <div className="flex gap-1">
                  {['day', 'week', 'month', 'year'].map(p => (
                      <Button 
                          key={p} 
                          size="sm" 
                          variant={periodo === p ? 'default' : 'outline'}
                          onClick={() => setPeriodo(p as Periodo)}
                          disabled={cargandoMetricas}
                      >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Button>
                  ))}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {cargandoMetricas ? (
                <div className="h-full grid place-items-center text-slate-500 text-sm">Cargando métricas filtradas...</div>
            ) : clientesMetricasData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={clientesMetricasData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="fecha" 
                          // 🚨 CAMBIO: Aplicar el formateador de fechas
                          tickFormatter={formatDate} 
                          angle={periodo === 'day' ? -30 : 0} 
                          textAnchor={periodo === 'day' ? 'end' : 'middle'} 
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="Nuevos Usuarios" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full grid place-items-center text-slate-500 text-sm">
                    No hay datos disponibles para el filtro y periodo seleccionados.
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Solicitudes de retiro (semana)</CardTitle></CardHeader>
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
            <div className="flex gap-2 mt-3 flex-wrap">
              {state.retiros.map((s) => (
                <Badge key={s.cliente} variant={s.estado === "Pagado" ? "default" : "secondary"}>{s.cliente}: {s.estado}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* TABLA DE CLIENTES Y EXPORTACIÓN CSV */}
      <Card className="mt-4">
        <CardHeader><CardTitle>Clientes activos ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Input placeholder="Filtrar por nombre…" className="h-9 max-w-xs" value={filter} onChange={e=>setFilter(e.target.value)} />
            
            <Button variant="outline" className="h-9" onClick={()=>downloadCSV('clientes.csv', dataForCSV)}>Exportar CSV</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total ventas</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Canales Poseídos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                  const canalData = canalesPorCliente[c.telegramId] || { count: 0, names: [] };
                  const limitedChannelNames = canalData.names.slice(0, 3);
                  const displayChannels = limitedChannelNames.join(', ') + (canalData.count > 3 ? '...etc.' : '');
                  
                  return (
                    <TableRow key={c.nombre}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-200 grid place-items-center text-xs font-medium">{c.nombre.substring(0,2).toUpperCase()}</div>
                            <div>
                              <p className="font-medium leading-tight">{c.nombre}</p>
                              <p className="text-xs text-slate-500">Canales asignados · {canalData.count || 0}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{c.ventas}</TableCell>
                        <TableCell className="text-right">{c.roi.toFixed(2)}x</TableCell>
                        <TableCell className="text-right">$ {c.balance.toLocaleString("es-AR")}</TableCell>
                        <TableCell className="text-right">
                          <span className='text-xs text-slate-600'>{displayChannels || 'Ninguno'}</span> 
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                              size="sm" 
                              variant="secondary" 
                              onClick={() => handleExportMembersDetail(c.telegramId, c.nombre)}
                          >
                              Exportar Miembros
                          </Button>
                        </TableCell>
                      </TableRow>
                  );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  )
}

function Kpi({ title, value, icon, delta, muted }:{ title: string; value: number; icon: React.ReactNode; delta?: number; muted?: boolean }) {
// ... (Componente Kpi sin cambios)
  const isUp = (delta ?? 0) >= 0
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <span className={`h-8 w-8 grid place-items-center rounded-xl ${muted ? 'bg-slate-100' : 'bg-emerald-100'}`}>{icon}</span>
          {title}
        </CardTitle>
        {!muted && typeof delta === 'number' && (<Badge variant={isUp ? 'default' : 'secondary'}>{isUp ? '+' : ''}{delta}%</Badge>)}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">$ {value.toLocaleString('es-AR')}</div>
        {!muted && (<p className="text-xs text-slate-500 mt-1">vs día anterior</p>)}
      </CardContent>
    </Card>
  )
}
// --------------------------------------------------------
// --- LÓGICA DE FECHAS (DEBE IR AL FINAL DEL ARCHIVO) ---
// --------------------------------------------------------
function calculateTimeLimit(periodo: 'day' | 'week' | 'month' | 'year'): string {
    const today = new Date();
    let limitDate = new Date(today);

    switch (periodo) {
        case 'day':
            limitDate.setDate(today.getDate() - 7); 
            break;
        case 'week':
            limitDate.setDate(today.getDate() - (8 * 7)); 
            break;
        case 'month':
            limitDate.setFullYear(today.getFullYear(), today.getMonth() - 12); 
            break;
        case 'year':
            limitDate.setFullYear(today.getFullYear() - 5); 
            break;
    }
    return limitDate.toISOString(); 
}
function formatDate(tickItem: string | number): string {
    const date = new Date(tickItem);
    
    if (isNaN(date.getTime()) || date.getFullYear() === 1970) {
        return String(tickItem);
    }
    
    if (date.toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' }) !== '24:00') {
        return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
    }
    
    if (date.getMonth() !== new Date().getMonth() || date.getDate() !== 1) {
        return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    }
    
    return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'short' });
}