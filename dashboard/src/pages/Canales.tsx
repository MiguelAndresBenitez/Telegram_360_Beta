import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useDemo, Cliente, Canal } from '@/demo/DemoProvider' 
import { useToast } from '@/components/Toast'
import { Modal } from '@/components/Modal'
// Importamos la función para enviar la tarea de invitación a Redis (backend)
import { getCanalMiembros, removeUserTask, updateCanalOwner, create_invite_task } from '@/api/index' 

// --- Tipos de Datos ---
type CanalData = Canal; 

type Miembro = {
    telegram_id: number;
    email: string;
    first_name?: string;
};


// --- COMPONENTE PRINCIPAL ---
export default function Canales() {
  // 1. DECLARACIÓN DE TODOS LOS HOOKS (INCONDICIONALMENTE)
  const { state, addCampaña, assignCanalCliente, isLoading } = useDemo() 
  const { push } = useToast()
  
  // Hooks de Estado Local
  const [form, setForm] = useState({ canal: '', nombre: '', alias: '' })
  
  const [modalOpen, setModalOpen] = useState(false);
  const [canalSeleccionado, setCanalSeleccionado] = useState<CanalData | null>(null);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargandoMiembros, setCargandoMiembros] = useState(false); 
  const [removiendoUsuario, setRemoviendoUsuario] = useState<number | null>(null);
  const [savingCanalId, setSavingCanalId] = useState<number | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  // Nuevo estado para el tipo de link
  const [linkType, setLinkType] = useState<'gratis' | 'pago'>('gratis'); 
  const [recipientId, setRecipientId] = useState('');

  // 2. HOOKS DE EFECTO (Manejo de inicialización de formulario)
  useEffect(() => {
    // Solo inicializa el formulario si tenemos canales y el campo 'canal' aún está vacío
    if (state.canales.length > 0 && form.canal === '') {
      setForm(f => ({
        ...f,
        canal: state.canales[0].nombre
      }));
    }
  }, [state.canales]); 


  // 3. HOOKS DE CÁLCULO (useMemo)
  const filteredCanales = useMemo(() => {
    if (!searchTerm) {
      return state.canales;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    return state.canales.filter(canal => 
      canal.nombre.toLowerCase().includes(lowerCaseSearch) ||
      (canal.clienteNombre && canal.clienteNombre.toLowerCase().includes(lowerCaseSearch))
    );
  }, [state.canales, searchTerm, isLoading]);


  // 4. HOOKS DE FUNCIONES (useCallback)
  const handleVerMiembros = useCallback(async (canal: CanalData) => {
    setCanalSeleccionado(canal);
    setModalOpen(true);
    setCargandoMiembros(true); 
    setMiembros([]);

    const canalId = canal.canal_id; 

    if (canalId) {
      try {
        const data = await getCanalMiembros(canalId);
        setMiembros(data);
      } catch (e) {
        push("Error al cargar la lista de miembros.");
      } finally {
        setCargandoMiembros(false);
      }
    } else {
        push("ID de canal no encontrado en el estado.");
        setCargandoMiembros(false);
    }
  }, [push]);
  
  const handleRemoverUsuario = useCallback(async (userId: number) => {
    if (!canalSeleccionado || !canalSeleccionado.canal_id) return;
    
    const confirmacion = window.confirm(`¿Está seguro de querer expulsar al usuario ID ${userId} del canal ${canalSeleccionado.nombre}?`); 
    if (!confirmacion) return;

    setRemoviendoUsuario(userId);
    try {
      await removeUserTask({
        channel_id: canalSeleccionado.canal_id, 
        user_id: userId,
      });
      push(`Tarea de expulsión enviada para ${userId}.`);
      
      setMiembros(m => m.filter(m => m.telegram_id !== userId));

    } catch (e) {
      push(`Error al expulsar a ${userId}.`);
    } finally {
      setRemoviendoUsuario(null);
    }
  }, [canalSeleccionado, push]);


  const handleAssignOwner = useCallback(async (canal: CanalData, newOwnerTelegramId: number) => {
    
    if (!canal.canal_id || !newOwnerTelegramId) {
      push("Seleccione un cliente válido (Telegram ID).");
      return;
    }

    setSavingCanalId(canal.canal_id);

    try {
      await updateCanalOwner(canal.canal_id, newOwnerTelegramId);
      
      assignCanalCliente(canal.nombre, newOwnerTelegramId); 

      const newOwnerName = state.clientes.find((cl: Cliente) => cl.telegramId === newOwnerTelegramId)?.nombre || 'Desconocido';
      push(`✅ Canal '${canal.nombre}' asignado a '${newOwnerName}'.`);

    } catch (e) {
      const errorMessage = e instanceof Error 
        ? e.message
        : 'Error desconocido al guardar la asignación.';
        
      push(`❌ Error al asignar dueño: ${errorMessage}`);
      console.error("Error API:", e);
    } finally {
      setSavingCanalId(null);
    }
  }, [push, state.clientes, assignCanalCliente]); 

  // >> FUNCIÓN PARA GENERAR LINK/INVITACIÓN
  const handleGenerarLink = useCallback(async () => {
    // Estas variables provienen de los estados del componente Canales.tsx
    // (Asumimos que 'recipientId' y 'setRecipientId' están declarados como useState)
    const clienteData = state.clientes.find(c => c.nombre === state.clienteActual);
    const canalData = state.canales.find(c => c.nombre === form.canal);
    
    const isPaid = linkType === 'pago';
    
    // --- NUEVO: OBTENER Y VALIDAR EL ID DEL TERCERO ---
    const recipientUserId = parseInt(recipientId); // Asumimos que recipientId es el string del input
    
    if (!clienteData || !canalData) {
        push("❌ Error: Seleccione un cliente y canal válidos.");
        return;
    }
    
    // Nueva validación para el ID del destinatario
    if (!recipientId || isNaN(recipientUserId)) {
        push("❌ Error: Debe ingresar el ID de Telegram del destinatario (solo números).");
        return;
    }
    // --- FIN NUEVA VALIDACIÓN ---

    if (isPaid) {
         push("⚠️ Función de link de pago no implementada. Generando link gratuito.");
    }
    
    const clienteTelegramId = clienteData.telegramId;
    const canalId = canalData.canal_id;

    try {
        // 1. Opcional: Se omite la validación PUT aquí para ahorrar una llamada a la API,
        // ya que el worker ADMIN es el que genera el link de forma directa.

        // 2. TAREA CRÍTICA: Enviar tarea al worker de invitaciones
        const response = await create_invite_task({ 
            canal_id: canalId,
            cliente_telegram_id: clienteTelegramId,
            // >> MODIFICACIÓN CLAVE: Usamos el ID del TERCERO (recipientUserId)
            user_telegram_id: recipientUserId, 
            is_paid: isPaid 
        });

        push(`✅ Tarea de invitación (${isPaid ? 'Pago' : 'Gratuita'}) enviada a Telegram ID ${recipientUserId}.`);
        
    } catch (error: any) {
        push(`❌ Fallo al enviar la invitación: ${error.message}`);
    }
}, [state.clienteActual, form.canal, push, state.clientes, state.canales, linkType, recipientId]);


  // 5. RETORNO CONDICIONAL DE CARGA
  if (isLoading) {
    return (
        <div className="flex h-64 w-full items-center justify-center text-slate-500">
            Cargando datos iniciales...
        </div>
    );
  }


  // 6. RENDERIZADO DEL COMPONENTE
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Canales</h1>
      <p className="text-sm text-slate-600">Detectados desde archivados, asignación a cliente y generación de links de campaña.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Asignación de canales a clientes</CardTitle>
            {/* Buscador de grupos (Lupa) */}
            <Input 
                placeholder="Buscar por nombre de canal o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-4"
            />
          </CardHeader>
          <CardContent>
            {/* Contenedor con altura fija y scroll lateral (Cinta) */}
            <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Suscriptores</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Usamos la lista filtrada */}
                    {filteredCanales.map((c: CanalData) => { 
                      
                      const currentOwnerId = c.clienteId || 0;
                      const initialOwnerName = c.clienteNombre || '-- Sin asignar --';

                      const [tempOwnerId, setTempOwnerId] = useState<number>(currentOwnerId);
                      
                      return (
                        <TableRow key={c.canal_id}> 
                          <TableCell className="font-medium">{c.nombre}</TableCell>
                          <TableCell><Badge variant={c.tipo === 'VIP' ? 'default' : 'secondary'}>{c.tipo}</Badge></TableCell>
                          <TableCell className="text-right">{c.suscriptores.toLocaleString('es-AR')}</TableCell>
                          <TableCell>
                            <select
                              className="border border-slate-300 rounded-xl text-sm px-2 py-1"
                              value={String(tempOwnerId)}
                              onChange={e => setTempOwnerId(parseInt(e.target.value))}
                            >
                              
                              {/* Opción por defecto (Dueño Actual) */}
                              <option value={currentOwnerId}>{initialOwnerName}</option>
                              
                              {/* Opciones de otros clientes (incluye "Sin asignar" si currentOwnerId es 0) */}
                              {currentOwnerId !== 0 && 
                                <option value={0}>-- Sin asignar --</option>
                              }

                              {state.clientes
                                // Excluimos el dueño actual solo si ya fue la opción por defecto (para evitar duplicados)
                                .filter(cl => cl.telegramId !== currentOwnerId)
                                .map((cl: Cliente) => 
                                  <option key={cl.telegramId} value={cl.telegramId}>
                                    {cl.nombre} ({cl.telegramId})
                                  </option>
                                )
                              }
                            </select>
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleAssignOwner(c, tempOwnerId)}
                              disabled={savingCanalId === c.canal_id || tempOwnerId === 0 || tempOwnerId === currentOwnerId}
                            >
                              {savingCanalId === c.canal_id ? 'Guardando...' : 'Guardar Owner'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleVerMiembros(c as CanalData)}
                            >
                              Ver Miembros
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>

        {/* Sección para crear link de publicidad */}
        <Card>
          <CardHeader><CardTitle>Crear link de publicidad</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-slate-600">Canal</label>
              <select className="w-full border border-slate-300 rounded-xl text-sm px-3 py-2"
                value={form.canal} onChange={e=>setForm({ ...form, canal: e.target.value })}>
                {state.canales.map(c => 
                  <option key={c.canal_id} value={c.nombre}>
                    {c.nombre}
                  </option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Tipo de Link</label>
              <select className="w-full border border-slate-300 rounded-xl text-sm px-3 py-2"
                value={linkType} onChange={e => setLinkType(e.target.value as 'gratis' | 'pago')}>
                <option value="gratis">Gratuito</option>
                <option value="pago">De Pago (Próximamente)</option>
              </select>
            </div>
            
            {/* >> NUEVO CAMPO: ID de Telegram del Destinatario */}
            <div>
                <label className="text-xs text-slate-600">ID de Telegram del Destinatario</label>
                <Input 
                    placeholder="Ej: 123456789 (ID numérico)" 
                    value={recipientId} 
                    onChange={e => setRecipientId(e.target.value)} 
                    // Nota: Si usas type="number" el valor recibido en onChange es siempre string en React.
                    // Lo mantenemos como texto para evitar conflictos, pero el valor debe ser numérico.
                />
            </div>
            
            <div>
              <label className="text-xs text-slate-600">Nombre de campaña</label>
              <Input placeholder="Ej: Promo agosto Free A" value={form.nombre} onChange={e=>setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-600">Alias del link</label>
              <Input placeholder="Ej: free-a-agosto" value={form.alias} onChange={e=>setForm({ ...form, alias: e.target.value })} />
            </div>
            <Button className="w-full" onClick={handleGenerarLink}>Generar Invitación</Button>
            <p className="text-xs text-slate-500">* Esto crea un link trackeado por canal/campaña (demo) y envía la invitación al DM de tu cliente.</p>
          </CardContent>
        </Card>
      </div>

      {/* MODAL DE MIEMBROS */}
      <Modal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={`Miembros de ${canalSeleccionado?.nombre || 'Canal'}`} 
      >
        <div className="max-h-[70vh] overflow-y-auto">
          {cargandoMiembros ? ( 
            <div className="text-center text-slate-500">Cargando miembros...</div>
          ) : miembros.length === 0 ? (
            <div className="text-center text-slate-500">No se encontraron miembros para este canal.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre (DB)</TableHead> 
                  <TableHead>Telegram ID</TableHead>
                  <TableHead>Email (DB)</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {miembros.map((m) => (
                  <TableRow key={m.telegram_id}>
                    <TableCell className="font-medium">{m.first_name || 'N/A'}</TableCell> 
                    <TableCell className="font-mono text-xs">{m.telegram_id}</TableCell>
                    <TableCell>{m.email || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => handleRemoverUsuario(m.telegram_id)}
                        disabled={removiendoUsuario === m.telegram_id}
                      >
                        {removiendoUsuario === m.telegram_id ? 'Expulsando...' : 'Expulsar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Modal>
    </div>
  )
}