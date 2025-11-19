
import React from 'react'
export function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default'|'secondary' }) {
  const styles = variant === 'secondary'
    ? 'bg-slate-100 text-slate-800'
    : 'bg-slate-900 text-white'
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${styles}`}>{children}</span>
}
