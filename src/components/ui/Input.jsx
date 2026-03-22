export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-deep mb-1.5">{label}</label>
      )}
      <input
        className={`w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all duration-300 ${error ? 'border-sunset focus:ring-sunset/30' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-sunset">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-deep mb-1.5">{label}</label>
      )}
      <textarea
        className={`w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all duration-300 resize-none ${error ? 'border-sunset focus:ring-sunset/30' : ''} ${className}`}
        rows={4}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-sunset">{error}</p>}
    </div>
  )
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-deep mb-1.5">{label}</label>
      )}
      <select
        className={`w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-deep focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all duration-300 ${error ? 'border-sunset focus:ring-sunset/30' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-sm text-sunset">{error}</p>}
    </div>
  )
}
