const variants = {
  blue: 'bg-ocean/10 text-ocean',
  green: 'bg-libre/10 text-libre',
  orange: 'bg-sunrise/10 text-sunrise',
  gray: 'bg-gray-100 text-gray-500',
  navy: 'bg-electric/10 text-electric',
  golden: 'bg-golden/10 text-golden',
  sunset: 'bg-gradient-to-r from-sunrise/10 to-sunset/10 text-sunset',
}

export function Badge({ children, variant = 'blue', className = '' }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
