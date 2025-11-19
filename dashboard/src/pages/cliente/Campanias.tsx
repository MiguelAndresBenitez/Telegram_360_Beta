import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDemo } from '@/demo/DemoProvider'
import { useToast } from '@/components/Toast'

export default function CampaniasCliente() {
  const { state, addCampaña } = useDemo() 
  const { push } = useToast()
  
  // No necesitamos filtrar canales ya que el cliente está creando un *nuevo* grupo.
  const [form, setForm] = useState({ nombre: '', alias: '' }) 
  const clienteActualCampanias = state.campañas.filter(c => 
    state.canales.find(x => x.nombre === c.canal)?.cliente === state.clienteActual
  );

  // Manejador de creación de campaña/grupo
  const handleCreateCampaign = async () => {
      // 1. Validar campos
      if (!form.nombre || form.nombre.length < 5) {
          return push("El Nombre del grupo es obligatorio y debe tener al menos 5 caracteres.");
      }
      if (!form.alias || form.alias.length < 5) {
          return push("El Alias (@) es obligatorio y debe tener al menos 5 caracteres.");
      }
      
      const campaignName = form.nombre;
      // Normalizamos el alias para la llamada al worker
      const channelAlias = form.alias.replace(/@/g, ''); 

      try {
          // 2. LLAMADA AL WORKER DE CREACIÓN DE GRUPOS
          // (canal base, nombre de campaña, alias)
          const link = await addCampaña(campaignName, campaignName, channelAlias)

          // 3. Notificación al usuario (El grupo se crea en el backend)
          try { 
              // Usar un método de copia compatible
              const tempInput = document.createElement('textarea');
              tempInput.value = link;
              document.body.appendChild(tempInput);
              tempInput.select();
              document.execCommand('copy');
              document.body.removeChild(tempInput);
              push(`✅ ¡Grupo creado! Link copiado: ${link}`);
          } catch (e) {
              push(`✅ ¡Grupo creado! Copia este link manualmente: ${link}`);
          }
      } catch (error) {
          console.error("Error al crear grupo:", error);
          
          // CORRECCIÓN: Manejo de error genérico para el 404/Alias Ocupado
          let errorMessage = "❌ Error desconocido al crear el grupo. ";
          if (error instanceof Error && error.message.includes('404')) {
               errorMessage += "Verifique que el servidor de FastAPI esté corriendo.";
          } else if (error instanceof Error && error.message.includes('alias')) {
               errorMessage += `El alias '@${channelAlias}' está probablemente ocupado.`;
          } else {
               errorMessage += "Revise el log de Uvicorn/Worker.";
          }
          push(errorMessage);
      }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Campañas</h1>
      <p className="text-sm text-slate-600">Crea campañas propias y usa links trackeados.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader><CardTitle>Nueva campaña / Creación de grupo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-slate-600">Nombre del nuevo grupo</label>
              <Input 
                value={form.nombre} 
                placeholder="Ej: Grupo VIP - Verano 2026" 
                onChange={e=>setForm({ ...form, nombre: e.target.value })} 
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Alias (Identificador público: @)</label>
              <Input 
                value={form.alias} 
                placeholder="ejemplo_vip" 
                onChange={e=>setForm({ ...form, alias: e.target.value.replace(/@/g, '') })} 
              />
            </div>
            <Button className="w-full" onClick={handleCreateCampaign} disabled={state.isLoading}>
              Crear Grupo y Generar Link
            </Button>
            <p className="text-xs text-slate-500 text-center">* Esto inicia el worker de creación de grupo en el backend.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mis campañas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {clienteActualCampanias.map((c,i)=>(
              <div key={c.link+i} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{c.nombre} · {c.canal}</div>
                  <div className="text-xs text-slate-500 truncate max-w-[40ch]">{c.link}</div>
                </div>
                <Button size="sm" variant="outline" onClick={async ()=>{ try { await navigator.clipboard.writeText(c.link) } catch {}; }}>Copiar</Button>
              </div>
            ))}
            {!clienteActualCampanias.length && <p className="text-sm text-slate-500">Aún no creaste campañas.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
