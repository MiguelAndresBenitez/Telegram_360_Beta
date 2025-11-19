
import React from 'react'

export function Table({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm">{children}</table></div>
}
export function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="text-xs uppercase text-slate-500">{children}</thead>
}
export function TableHead({ children, className='' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-2 ${className}`}>{children}</th>
}
export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>
}
export function TableRow({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-slate-50">{children}</tr>
}
export function TableCell({ children, className='' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>
}
