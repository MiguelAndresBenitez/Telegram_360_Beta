
import React from 'react'
import { Button } from '@/components/ui/button'

export function Modal({ open, title, children, onClose, footer }:
  { open: boolean; title: string; children: React.ReactNode; onClose: () => void; footer?: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-[520px] max-w-[94vw]" onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
          {footer || <Button onClick={onClose}>Cerrar</Button>}
        </div>
      </div>
    </div>
  )
}
