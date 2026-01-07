import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useDemo, Cliente, Canal } from '@/demo/DemoProvider' 
import { useToast } from '@/components/Toast'
import { Modal } from '@/components/Modal'
import { getCanalMiembros, removeUserTask, updateCanalOwner } from '@/api/index' 
import { Search, Gift, ShieldCheck, UserMinus, Loader2 } from 'lucide-react'

export default function Canales() {
  const { state, assignCanalCliente, isLoading } = useDemo() 
  const { push } = useToast()
  
  const [form, setForm] = useState({ canal: '', nombre: '', alias: '' })
  const [modalOpen, setModalOpen] = useState(false);
  const [canalSeleccionado, setCanalSeleccionado] = useState<Canal | null>(null);
  const [miembros, setMiembros] = useState<any[]>([]);
  const [cargandoMiembros, setCargandoMiembros] = useState(false); 
  const [removiendoUsuario, setRemoviendoUsuario] = useState<number | null>(null);
  const [savingCanalId, setSavingCanalId] = useState<number | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(false);

  useEffect(() => {
    if (state.canales?.length > 0 && form.canal === '') {
      setForm(f => ({ ...f, canal: state.canales[0].nombre }));
    }
  }, [state.canales, form.canal]); 

  const filteredCanales = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return state.canales || [];
    return (state.canales || []).filter(canal => 
      (canal.nombre && canal.nombre.toLowerCase().includes(term)) ||
      (canal.clienteNombre && canal.clienteNombre.toLowerCase().includes(term))
    );
  }, [state.canales, searchTerm]);

  const handleVerMiembros = useCallback(async (canal: Canal) => {
    setCanalSeleccionado(canal);
    setModalOpen(true);
    setCargandoMiembros(true); 
    try {
      const data = await getCanalMiembros(canal.canal_id);
      setMiembros(Array.isArray(data) ? data : []);
    } catch (e) {
      push("Error al cargar miembros.");
    } finally {
      setCargandoMiembros(false);
    }
  }, [push]);
  
  const handleRemoverUsuario = useCallback(async (userId: number) => {
    if (!canalSeleccionado) return;
    if (!confirm(`¿Expulsar usuario ${userId}?`)) return;

    setRemoviendoUsuario(userId);
    try {
      await removeUserTask({ channel_id: canalSeleccionado.canal_id, user_id: userId });
      setMiembros(prev => prev.filter(m => m.telegram_id !== userId));
      push(`✅ Tarea de expulsión enviada.`);
    } catch (e) {
      push(`❌ Error al expulsar.`);
    } finally {
      setRemoviendoUsuario(null);
    }
  }, [canalSeleccionado, push]);

  const handleAssignOwner = useCallback(async (canal: Canal, newOwnerId: number) => {
    setSavingCanalId(canal.canal_id);
    try {
      await updateCanalOwner(canal.canal_id, newOwnerId);
      assignCanalCliente(canal.nombre, newOwnerId); 
      push(`✅ Admin asignado correctamente`);
    } catch (e) {
      push(`❌ Error en la asignación.`);
    } finally {
      setSavingCanalId(null);
    }
  }, [push, assignCanalCliente]); 

  const handleInvitacionGratuita = useCallback(async () => {
    const cliente = state.clientes.find(c => c.nombre === state.clienteActual);
    const canal = state.canales.find(c => c.nombre === form.canal);
    if (!cliente || !canal || !recipientId) return push("Complete todos los campos");

    setLoadingInvite(true);
    try {
      const res = await fetch('http://localhost:8000/tasks/create_invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canal_id: canal.canal_id,
          user_telegram_id: parseInt(recipientId),
          cliente_telegram_id: cliente.telegramId,
          is_paid: false
        })
      });
      if (res.ok) push("🎁 Invitación enviada con éxito");
    } catch (e) { push("❌ Error al enviar invitación"); }
    finally { setLoadingInvite(false); }
  }, [state, form.canal, recipientId, push]);

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-900" size={32} /></div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 p-2 text-left">
      <div className="border-b-2 border-slate-100 pb-4">
          <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">Gestión de Canales</h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Administración de propiedad y accesos VIP</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LISTADO DE CANALES */}
        <Card className="lg:col-span-8 border-none shadow-2xl rounded-[32px] overflow-hidden bg-white border border-slate-100">
          <CardHeader className="border-b border-slate-100 p-6 bg-slate-50/50">
            <CardTitle className="text-[11px] font-black uppercase text-slate-950 tracking-widest flex items-center gap-2" style={{ color: '#020617' }}>
              <ShieldCheck size={16} className="text-blue-600" /> ASIGNACIÓN DE ADMINISTRADORES
            </CardTitle>
            <div className="relative mt-5">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <Input 
                placeholder="BUSCAR CANAL O DUEÑO..." 
                className="pl-12 h-12 bg-white border-2 border-slate-100 rounded-2xl shadow-sm font-black text-xs uppercase text-slate-950"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow className="border-b border-slate-200">
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest">Canal</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest text-center">Usuarios</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest">Administrador</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-950 tracking-widest text-center">Acciones</th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCanales.map((c) => {
                    const currentId = c.clienteId || 0;
                    return (
                      <TableRow key={c.canal_id} className="hover:bg-slate-50 transition-all border-b border-slate-50">
                        <td className="px-8 py-6 font-black text-slate-950 text-sm uppercase tracking-tight">{c.nombre}</td>
                        <td className="px-8 py-6 text-center">
                            <Badge className="bg-blue-600 text-white border-none font-black text-[10px] px-3 py-1 rounded-lg shadow-md">
                                {c.suscriptores || 0}
                            </Badge>
                        </td>
                        <td className="px-8 py-6">
                          <select 
                            className="w-full bg-slate-100 border-none rounded-xl text-[11px] font-black uppercase p-3 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner text-slate-950"
                            defaultValue={currentId}
                            onChange={(e) => handleAssignOwner(c, parseInt(e.target.value))}
                          >
                            <option value={currentId}>{c.clienteNombre || '-- SIN ASIGNAR --'}</option>
                            {state.clientes.map(cl => <option key={cl.telegramId} value={cl.telegramId}>{cl.nombre.toUpperCase()}</option>)}
                          </select>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex justify-center gap-3">
                            {/* 🛠️ BOTÓN ACTUALIZADO: Color azul oscuro y texto solicitado */}
                            <button 
                              onClick={() => {
                                const select = document.querySelector(`select[defaultValue="${currentId}"]`) as HTMLSelectElement;
                                handleAssignOwner(c, parseInt(select?.value || '0'));
                              }}
                              className="bg-[#0f172a] text-white text-[10px] font-black uppercase rounded-2xl px-6 h-11 hover:bg-black transition-all shadow-xl active:scale-95 tracking-widest border-none"
                            >
                              ASIGNAR ADMIN
                            </button>
                            <button 
                              onClick={() => handleVerMiembros(c)} 
                              className="bg-[#0f172a] text-white text-[10px] font-black uppercase rounded-2xl px-6 h-11 hover:bg-black transition-all shadow-xl active:scale-95 tracking-widest"
                            >
                              MIEMBROS
                            </button>
                          </div>
                        </td>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* INVITACIÓN VIP */}
        <Card className="lg:col-span-4 border-none shadow-2xl rounded-[32px] bg-white self-start border border-slate-100 overflow-hidden">
          <CardHeader className="border-b border-slate-100 p-8 bg-amber-50/30">
            <CardTitle className="text-[11px] font-black uppercase text-amber-600 tracking-widest flex items-center gap-2">
              <Gift size={18} /> INVITACIÓN GRATUITA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-950 ml-1" style={{ color: '#020617' }}>Seleccionar Canal</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase p-4 outline-none shadow-sm focus:border-amber-500 transition-all text-slate-950"
                value={form.canal} onChange={e => setForm({...form, canal: e.target.value})}>
                {state.canales.map(c => <option key={c.canal_id} value={c.nombre}>{c.nombre.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-950 ml-1" style={{ color: '#020617' }}>Telegram ID Usuario</label>
              <Input placeholder="EJ: 54321234" value={recipientId} onChange={e => setRecipientId(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 text-sm font-black px-6 focus:border-amber-500 shadow-sm text-slate-950"/>
            </div>
            {/* 🛠️ BOTÓN ACTUALIZADO: Color azul oscuro */}
            <Button onClick={handleInvitacionGratuita} disabled={loadingInvite} className="w-full bg-[#0f172a] hover:bg-black h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all text-white mt-4">
              {loadingInvite ? 'ENVIANDO...' : 'ENVIAR ACCESO VIP'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* MODAL DE MIEMBROS */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`MIEMBROS: ${canalSeleccionado?.nombre.toUpperCase()}`}>
        <div className="max-h-[50vh] overflow-y-auto p-4">
          {cargandoMiembros ? (
            <div className="flex flex-col items-center justify-center p-10 gap-3">
               <Loader2 className="animate-spin text-blue-500" size={32} />
               <p className="text-sm font-black text-slate-950 uppercase tracking-widest" style={{ color: '#020617' }}>Consultando Telegram...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-slate-100">
                  <th className="text-[10px] uppercase font-black text-slate-950 pb-4 text-left tracking-widest">Nombre</th>
                  <th className="text-[10px] uppercase font-black text-slate-950 pb-4 text-left tracking-widest">ID Telegram</th>
                  <th className="text-[10px] uppercase font-black text-slate-950 text-center pb-4 tracking-widest">Acción</th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {miembros.map(m => (
                  <TableRow key={m.telegram_id} className="border-slate-50 hover:bg-slate-50/50">
                    <td className="py-4 text-sm font-black text-slate-950 uppercase">{m.first_name || 'Sin Nombre'}</td>
                    <td className="py-4 text-xs font-bold text-slate-500">{m.telegram_id}</td>
                    <td className="py-4 text-center">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleRemoverUsuario(m.telegram_id)}
                        disabled={removiendoUsuario === m.telegram_id}
                        className="text-red-500 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all px-4 h-9 shadow-sm"
                      >
                        {removiendoUsuario === m.telegram_id ? '...' : 'Expulsar'}
                      </Button>
                    </td>
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