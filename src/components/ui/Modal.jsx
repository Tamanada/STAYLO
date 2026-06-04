import { useEffect } from 'react'
import { X } from 'lucide-react'

// `size` lets a caller override the default width WITHOUT touching every
// existing usage. The default `lg` matches the previous max-w-lg so
// every modal we already ship looks unchanged. Larger forms (front-desk
// walk-in check-in, where the receptionist is staring at the modal for
// 60+ seconds) can opt into `2xl`/`3xl` for legibility.
const SIZE_CLASSES = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-xl',
  '2xl': 'max-w-3xl',
  '3xl': 'max-w-4xl',
}

export function Modal({ open, onClose, children, title, size = 'lg' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const widthClass = SIZE_CLASSES[size] || SIZE_CLASSES.lg

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl ${widthClass} w-full max-h-[90vh] overflow-y-auto p-6`}>
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-semibold text-deep-navy">{title}</h3>}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
