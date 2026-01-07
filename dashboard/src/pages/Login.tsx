import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDemo } from '@/demo/DemoProvider'
import { useToast } from '@/components/Toast'
import { Lock, Mail, Loader2 } from 'lucide-react'

export default function Login() {
  const { login } = useDemo()
  const navigate = useNavigate()
  const { push } = useToast()

  const [correo, setCorreo] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const success = await login(correo.trim(), contraseña.trim())
      
      if (success) {
        push('¡Bienvenido!', 'default')
        
        // Pequeño delay para asegurar que el State del Provider se propague
        setTimeout(() => {
          if (correo.toLowerCase().includes('miguel') || correo.toLowerCase().includes('admin')) {
            window.location.href = '/'; // Redirección total para limpiar estados colgados
          } else {
            window.location.href = '/cliente';
          }
        }, 100);
        
      } else {
        push('Credenciales incorrectas', 'error')
      }
    } catch (error) {
      push('Error de servidor', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 grid place-items-center p-4 font-sans">
      <Card className="w-full max-w-md shadow-xl border-slate-200 bg-white">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-slate-900 h-12 w-12 rounded-xl flex items-center justify-center mb-4 text-white">
            <Lock size={24} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Iniciar Sesión</CardTitle>
          <p className="text-sm text-slate-500 font-medium">Panel de Gestión de Canales</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Mail size={14} /> Usuario o Email
              </label>
              <Input 
                type="text" 
                placeholder="Ingresa tu usuario" 
                value={correo} 
                onChange={e => setCorreo(e.target.value)} 
                className="h-11 border-slate-200 focus:ring-slate-900"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Lock size={14} /> Contraseña
              </label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={contraseña} 
                onChange={e => setContraseña(e.target.value)} 
                className="h-11 border-slate-200 focus:ring-slate-900"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all mt-2" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Validando...
                </span>
              ) : 'ACCEDER AL PANEL'}
            </Button>
            
            <p className="text-[10px] text-center text-slate-400 mt-6 uppercase tracking-[0.2em] font-black italic">
              Seguridad Encriptada SSL
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}