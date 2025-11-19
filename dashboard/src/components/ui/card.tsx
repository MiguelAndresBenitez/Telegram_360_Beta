
import React from 'react'

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
}
export function CardHeader({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}
export function CardTitle({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`text-base font-semibold ${className}`}>{children}</h3>
}
export function CardContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`px-4 pb-4 ${className}`}>{children}</div>
}
