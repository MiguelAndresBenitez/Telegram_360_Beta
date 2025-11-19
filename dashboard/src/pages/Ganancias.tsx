import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie } from 'recharts'
import { Button } from '@/components/ui/button'

// DATOS PLACEHOLDER - Esperando ser llenados por una API específica (ej: /ganancias/kpis)
const CHART_PLACEHOLDER_DATA = [] as { d: string; ingresos: number; gastos: number }[]
const CAMPAIGN_PLACEHOLDER_DATA = [] as { name: string; value: number }[]


export default function Ganancias() {
  const [days, setDays] = useState(7)
  
  // La data de las gráficas vendrá de llamadas API separadas en el futuro
  const data = CHART_PLACEHOLDER_DATA 
  const porCampaña = CAMPAIGN_PLACEHOLDER_DATA 

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Ganancias Propias</h1>
        <div className="flex gap-2">
          <Button variant={days===7?'default':'outline'} onClick={()=>setDays(7)}>7d</Button>
          <Button variant={days===30?'default':'outline'} onClick={()=>setDays(30)}>30d</Button>
          <Button variant={days===90?'default':'outline'} onClick={()=>setDays(90)}>90d</Button>
        </div>
      </div>
      <p className="text-sm text-slate-600">Visión de ingresos, gastos y contribución por campaña.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader><CardTitle>Ingresos vs Gastos</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="d" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="ingresos" strokeWidth={2} />
                <Line type="monotone" dataKey="gastos" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Aporte por campaña (%)</CardTitle></CardHeader>
          <CardContent className="h-64 grid place-items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={porCampaña} outerRadius={90} label />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}