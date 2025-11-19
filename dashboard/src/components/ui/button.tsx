import React from 'react'
// Importamos Slot de Radix para manejar la prop asChild
import { Slot } from '@radix-ui/react-slot' 

type Variant = 'default' | 'secondary' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'icon'

// Definición de props (ahora incluye asChild)
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean; // Prop para que el hijo tome el control
}

function variantClasses(v: Variant) {
  switch (v) {
    case 'secondary': return 'bg-slate-100 text-slate-900 hover:bg-slate-200'
    case 'outline': return 'border border-slate-300 hover:bg-slate-50'
    case 'ghost': return 'hover:bg-slate-100'
    default: return 'bg-slate-900 text-white hover:bg-slate-800'
  }
}

function sizeClasses(s: Size | undefined) {
  if (s === 'sm') return 'h-8 px-3 text-sm'
  if (s === 'icon') return 'h-9 w-9 grid place-items-center'
  return 'h-10 px-4 text-sm'
}

// Usamos export const y React.forwardRef para que sea el único punto de exportación
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    // Desestructuramos 'asChild' para sacarla de 'props'
    { children, className = '', variant = 'default', size = 'md', asChild = false, ...props }, 
    ref
  ) => {
    
    // Elegimos el componente a renderizar
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={`${variantClasses(variant)} rounded-xl ${sizeClasses(size)} ${className}`}
        {...props} 
      >
        {children}
      </Comp>
    )
  }
)