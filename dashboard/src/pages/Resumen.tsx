import React, { useMemo, useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, DollarSign, Wallet, Link2, Plus } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Bar, BarChart } from 'recharts'
import { useDemo, useKPIs } from '@/demo/DemoProvider'
import { getMetricsResumen } from '@/api/index'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { downloadCSV } from '@/utils/csv'
import { useNavigate } from 'react-router-dom';

// Definición del tipo de periodo
type Periodo = 'day' | 'week' | 'month' | 'year';

export default function Resumen() {
  const { state, addCliente } = useDemo() 
  const { gananciaHoy, gastoHoy, balanceBilletera } = useKPIs()
  const { push } = useToast()
  const navigate = useNavigate();

  const [filter, setFilter] = useState('')
  const [openNew, setOpenNew] = useState(false)
  const [newName, setNewName] = useState('')

  // Control del periodo y datos dinámicos
  const [periodo, setPeriodo] = useState<Periodo>('day');
  const [datosDinamicos, setDatosDinamicos] = useState<any[]>([]); 
  const [cargandoMetricas, setCargandoMetricas] = useState(false);
  
  const filtered = useMemo(() => state.clientes.filter(c => c.nombre.toLowerCase().includes(filter.toLowerCase())), [state.clientes, filter])

  // Lógica de carga de métricas para la GRÁFICA DE RESUMEN
  useEffect(() => {
    async function fetchMetrics() {
        setCargandoMetricas(true);
        try {
            // 🚨 CAMBIO: CALCULAR LÍMITE DE TIEMPO
            const timeLimit = calculateTimeLimit(periodo);
            
            // 🚨 CAMBIO: ENVIAR LÍMITE DE TIEMPO A LA API
            const apiMetricas = await getMetricsResumen(periodo, 'all', 'all', timeLimit);
            
            const newMetricas = apiMetricas.map((m: any) => ({
                fecha: m.fecha,
                "Nuevos Usuarios": m.nuevos_usuarios, 
            }));
            
            setDatosDinamicos(newMetricas); 

        } catch (e) {
            console.error("Error al recargar métricas por periodo:", e);
             setDatosDinamicos([]); 
        } finally {
            setCargandoMetricas(false);
        }
    }
    
    fetchMetrics();
  }, [periodo]); 

  const metricasData = datosDinamicos;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resumen Ejecutivo</h1>
          <p className="text-sm text-slate-600">Métricas clave y estado de la plataforma.</p>
        </div>
        <div className="flex gap-2">
          {/* Botón de Nuevo Cliente (modal) */}
          <Button onClick={()=>setOpenNew(true)}><Plus className="mr-2 h-4 w-4"/>Nuevo cliente</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        <Kpi title="Ganancia de hoy" value={gananciaHoy} icon={<TrendingUp className="h-5 w-5" />} delta={+12}/>
        <Kpi title="Gasto publicitario" value={gastoHoy} icon={<DollarSign className="h-5 w-5" />} delta={-5}/>
        <Kpi title="Balance billetera" value={balanceBilletera} icon={<Wallet className="h-5 w-5" />} muted/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* GRÁFICA DE RESUMEN GENERAL */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>📈 Crecimiento de Usuarios ({periodo})</span>
              
              <div className="flex gap-2 text-sm font-normal">
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
                <div className="h-full grid place-items-center text-slate-500 text-sm">Cargando métricas...</div>
            ) : metricasData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metricasData}>
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
                    No hay datos disponibles para el periodo seleccionado.
                </div>
            )}
          </CardContent>
        </Card>

        {/* GRÁFICA DE RETIROS */}
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
                <Badge key={s.cliente} variant={s.estado === "Pagado" ? "default" : "secondary"}>{s.cliente}: {s.monto.toLocaleString('es-AR')}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* MODAL DE CREACIÓN DE CLIENTE */}
      <Modal open={openNew} onClose={()=>setOpenNew(false)} title="Nuevo cliente">
        <div>
          <label className="text-xs text-slate-600">Nombre del cliente</label>
          <Input placeholder="Ej: Tips Master" value={newName} onChange={e=>setNewName(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={()=>setOpenNew(false)}>Cancelar</Button>
          <Button onClick={()=>{ addCliente(newName || 'Cliente nuevo'); setOpenNew(false); setNewName('') }}>Crear</Button>
        </div>
      </Modal>

    </div>
  )
}

function Kpi({ title, value, icon, delta, muted }:{ title: string; value: number; icon: React.ReactNode; delta?: number; muted?: boolean }) {
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