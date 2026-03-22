const variants = {
  primary: 'bg-gradient-to-r from-ocean to-electric text-white shadow-md hover:shadow-xl hover:scale-[1.02]',
  secondary: 'bg-white text-deep border border-gray-200 hover:border-sunrise/50 hover:shadow-md',
  green: 'bg-gradient-to-r from-libre to-libre/80 text-white shadow-md hover:shadow-xl hover:scale-[1.02]',
  orange: 'bg-gradient-to-r from-sunrise to-sunset text-white shadow-md hover:shadow-xl hover:scale-[1.02]',
  ghost: 'text-ocean hover:bg-ocean/5',
  golden: 'bg-gradient-to-r from-golden to-sunrise text-white shadow-md hover:shadow-xl hover:scale-[1.02]',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export function Button({ children, variant = 'primary', size = 'md', className = '', disabled, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
