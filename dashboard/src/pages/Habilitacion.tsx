import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useDemo } from '@/demo/DemoProvider'
import { useToast } from '@/components/Toast'
import { KeyRound, Mail, UserPlus, ShieldCheck, Eye, EyeOff, Copy } from 'lucide-react'

export default function Habilitacion() {
  const { state, addCliente } = useDemo()
  const { push } = useToast()
  
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telegramId, setTelegramId] = useState('') 
  const [correo, setCorreo] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [passUpdate, setPassUpdate] = useState({ clienteId: '', nuevaPass: '' })

  const handleCreateCliente = async () => {
    // 1. Validación de todos los campos necesarios
    if (!nombre || !correo || !telegramId || !contraseña) {
        push('Error: Todos los campos son obligatorios.', 'error');
        return;
    }

    try {
      await addCliente({ 
        nombre, 
        apellido, 
        telegramId, 
        correo, 
        contraseña 
      }); 
      
      push(`✅ Acceso creado para ${nombre}.`, 'success');
      
      setNombre(''); 
      setApellido(''); 
      setTelegramId(''); 
      setCorreo(''); 
      setContraseña('');
    } catch (error) {
      push('❌ Error al crear el cliente en el servidor.', 'error');
    }
  }

  const copiarSoloEmail = (c: any) => {
    const emailFinal = c.correo || (c.nombre.toLowerCase() + '@demo.com');
    navigator.clipboard.writeText(emailFinal);
    push(`📋 Email de ${c.nombre} copiado al portapapeles.`);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 p-2">
      <div className="border-b-2 border-slate-100 pb-4 text-left">
          <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">Control de Accesos</h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Habilitación y gestión de credenciales para clientes nuevos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* FORMULARIO DE ALTA */}
        <Card className="lg:col-span-4 border-none shadow-2xl rounded-[32px] bg-white border border-slate-100">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
            <CardTitle className="text-[11px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
              <UserPlus size={16} className="text-blue-600" /> REGISTRAR NUEVO CLIENTE
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6 text-left">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-950 ml-1">Nombre Completo</label>
                <Input placeholder="Ej: Juan" value={nombre} onChange={e=>setNombre(e.target.value)} className="bg-white border-2 border-slate-100 rounded-2xl h-12 text-sm font-bold text-slate-900 focus:border-blue-500 transition-all px-5" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-950 ml-1">Telegram ID (Numérico)</label>
                <Input type="number" placeholder="5115108520" value={telegramId} onChange={e=>setTelegramId(e.target.value)} className="bg-white border-2 border-slate-100 rounded-2xl h-12 text-sm font-bold text-slate-900 focus:border-blue-500 px-5" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-950 ml-1">Correo Electrónico</label>
              <Input type="email" placeholder="cliente@correo.com" value={correo} onChange={e=>setCorreo(e.target.value)} className="bg-white border-2 border-slate-100 rounded-2xl h-12 text-sm font-bold text-slate-900 focus:border-blue-500 px-5" />
            </div>
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black uppercase text-slate-950 ml-1">Contraseña de Acceso</label>
              <div className="relative">
                <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={contraseña} onChange={e=>setContraseña(e.target.value)} className="bg-white border-2 border-slate-100 rounded-2xl h-12 text-sm font-bold text-slate-900 focus:border-blue-500 px-5" />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-900">
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <Button className="w-full bg-[#0f172a] hover:bg-black text-white rounded-2xl h-14 font-black uppercase text-[11px] tracking-widest shadow-xl mt-4" onClick={handleCreateCliente}>
              HABILITAR ACCESO
            </Button>
          </CardContent>
        </Card>

        {/* TABLA DE GESTIÓN */}
        <Card className="lg:col-span-8 border-none shadow-2xl rounded-[32px] bg-white border border-slate-100 overflow-hidden">
          <CardHeader className="bg-emerald-50/30 border-b border-slate-100 p-6">
            <CardTitle className="text-[11px] font-black uppercase text-emerald-700 tracking-widest flex items-center gap-2">
              <ShieldCheck size={16} /> CLIENTES ACTIVOS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto text-left">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow className="border-b border-slate-200">
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-900 tracking-widest">NOMBRE DEL CLIENTE</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-900 tracking-widest">CONTACTO (EMAIL)</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-900 text-center tracking-widest">ESTADO</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-900 text-right tracking-widest">ACCIONES</th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.clientes.map(c => (
                    <TableRow key={c.nombre} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                      <TableCell className="px-8 py-6 font-black text-slate-950 text-sm uppercase tracking-tight">{c.nombre}</TableCell>
                      <TableCell className="px-8 py-6 text-slate-600 text-xs font-bold">{c.correo || (c.nombre.toLowerCase() + '@demo.com')}</TableCell>
                      <TableCell className="px-8 py-6 text-center">
                          <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px] uppercase px-4 py-1 rounded-lg">ACTIVO</Badge>
                      </TableCell>
                      <TableCell className="px-8 py-6 text-right">
                          <button 
                            onClick={() => copiarSoloEmail(c)}
                            className="inline-flex items-center gap-2 border-2 border-slate-100 bg-white hover:bg-slate-900 hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                          >
                            <Copy size={12} /> COPIAR MAIL
                          </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* RESETEO DE CONTRASEÑA - ETIQUETAS OSCURECIDAS */}
        <Card className="lg:col-span-12 border-none shadow-2xl rounded-[32px] bg-[#0f172a] text-white p-10 overflow-hidden">
          <div className="flex flex-col md:flex-row gap-10 items-end text-left">
              <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                      <KeyRound size={20} className="text-blue-400" />
                      {/* 🛠️ ETIQUETA OSCURECIDA (Negro intenso para visibilidad) */}
                      <label className="text-[11px] font-black uppercase text-slate-950 tracking-widest" style={{ color: '#020617' }}>GESTIÓN DE CREDENCIALES</label>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Reseteo de Clave Individual</h3>
                  <select 
                      className="w-full bg-slate-800 text-white border-2 border-slate-700 rounded-2xl text-xs font-black p-4 outline-none appearance-none cursor-pointer shadow-inner mt-2"
                      value={passUpdate.clienteId}
                      onChange={e => setPassUpdate({...passUpdate, clienteId: e.target.value})}
                  >
                      <option value="">-- SELECCIONAR CLIENTE PARA ACTUALIZAR --</option>
                      {state.clientes.map(c => <option key={c.telegramId} value={c.telegramId}>{c.nombre.toUpperCase()} (ID: {c.telegramId})</option>)}
                  </select>
              </div>
              <div className="flex-1 space-y-3">
                  {/* 🛠️ ETIQUETA OSCURECIDA (Negro intenso para visibilidad) */}
                  <label className="text-[10px] font-black uppercase text-slate-950 tracking-widest ml-1" style={{ color: '#020617' }}>INGRESAR NUEVA CLAVE</label>
                  <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="bg-slate-800 border-2 border-slate-700 rounded-2xl h-14 text-sm font-black px-6 placeholder:text-slate-600 focus:border-blue-400 transition-all mt-2"
                      value={passUpdate.nuevaPass}
                      onChange={e => setPassUpdate({...passUpdate, nuevaPass: e.target.value})}
                  />
              </div>
              <Button 
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl h-14 px-12 shadow-2xl transition-all active:scale-95 mb-0.5"
                  onClick={() => {
                      if(!passUpdate.clienteId || !passUpdate.nuevaPass) return push("Completa los datos");
                      push(`🔐 Clave actualizada para el cliente ID: ${passUpdate.clienteId}`);
                      setPassUpdate({ clienteId: '', nuevaPass: '' });
                  }}
              >
                  ACTUALIZAR CLAVE
              </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}