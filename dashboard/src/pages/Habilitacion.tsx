import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useDemo } from '@/demo/DemoProvider'
import { useToast } from '@/components/Toast'

export default function Habilitacion() {
  const { state, addCliente } = useDemo()
  const { push } = useToast()
  
  // ⚡ ESTADOS PARA CAPTURAR LOS DATOS DEL CLIENTE ⚡
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telegramId, setTelegramId] = useState('') 
  const [correo, setCorreo] = useState('')
  const [contraseña, setContraseña] = useState('')
  // El estado existe, pero el input está oculto. Se enviará vacío/null.
  const [infoBancaria, setInfoBancaria] = useState('') 

  // Función para manejar el alta del cliente
  const handleCreateCliente = () => {
    // 1. Validación básica de campos requeridos
    if (!nombre || !correo || !telegramId) {
        push('Error: Nombre, Correo y Telegram ID son obligatorios.');
        return;
    }
    
    // 2. Preparar los datos del nuevo cliente
    const newClientData = {
        nombre,
        apellido,
        // Convertir a número para que coincida con el modelo (BigInteger)
        telegram_id: parseInt(telegramId) || 0, 
        correo,
        contraseña,
        // Se envía la cadena vacía, que el backend (SQLModel) mapeará a None/null si es necesario.
        info_bancaria: infoBancaria, 
    };

    // 3. Simulación de creación y notificación (Aquí iría la llamada a la API real)
    
    // NOTA: 'addCliente' es una función de demostración que probablemente 
    // está causando el error 'createClienteAPI is not defined' si intenta 
    // llamar a la API internamente. Asumo que es una función de demo segura.
    addCliente(newClientData.nombre); 
    push(`Simulación: Se envió invitación a ${correo}. Cliente ID: ${newClientData.telegram_id}`);
    
    // 4. Limpiar formulario
    setNombre('');
    setApellido('');
    setTelegramId('');
    setCorreo('');
    setContraseña('');
    setInfoBancaria('');
  }


  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Habilitación de Clientes</h1>
      <p className="text-sm text-slate-600">Crear accesos y asignar visibilidad de canales.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader><CardTitle>Alta de cliente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            
            {/* Campos de Nombre y Apellido en una sola fila */}
            <div className='grid grid-cols-2 gap-2'>
                <div>
                    <label className="text-xs text-slate-600">Nombre</label>
                    <Input placeholder="Nombre" value={nombre} onChange={e=>setNombre(e.target.value)} />
                </div>
                <div>
                    <label className="text-xs text-slate-600">Apellido</label>
                    <Input placeholder="Apellido" value={apellido} onChange={e=>setApellido(e.target.value)} />
                </div>
            </div>

            {/* ID de Telegram */}
            <div>
              <label className="text-xs text-slate-600">ID de Telegram</label>
              <Input 
                type="number" 
                placeholder="Ej: 123456789 (Usado como ID en DB)" 
                value={telegramId} 
                onChange={e=>setTelegramId(e.target.value)} 
              />
            </div>

            {/* Correo */}
            <div>
              <label className="text-xs text-slate-600">Correo</label>
              <Input type="email" placeholder="cliente@dominio.com" value={correo} onChange={e=>setCorreo(e.target.value)} />
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-xs text-slate-600">Contraseña (temporal)</label>
              <Input type="password" placeholder="••••••••" value={contraseña} onChange={e=>setContraseña(e.target.value)} />
            </div>
            
            {/* El campo Info. Bancaria queda excluido del JSX por tu solicitud. */}

            <Button className="w-full" onClick={handleCreateCliente}>Crear acceso</Button>
            <p className="text-xs text-slate-500">* Demo: simula envío de invitación y alta.</p>
          </CardContent>
        </Card>

        {/* Tabla de Clientes */}
        <Card>
          <CardHeader><CardTitle>Clientes (estado)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Asegurando que solo hay TableCell como hijos directos de TableRow para evitar la advertencia */}
                {state.clientes.map(c => (
                  <TableRow key={c.nombre}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell>{c.nombre.toLowerCase().replace(/\s+/g,'')}@demo.com</TableCell>
                    <TableCell><Badge variant={'default'}>Activo</Badge></TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={()=>push(`Invitación reenviada a ${c.nombre}`)}>Reenviar invitación</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}