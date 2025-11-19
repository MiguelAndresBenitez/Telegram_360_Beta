
import React from 'react'
export function Avatar({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-full bg-slate-200 text-slate-700 grid place-items-center ${className}`}>{children}</div>
}
export function AvatarFallback({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium">{children}</span>
}
