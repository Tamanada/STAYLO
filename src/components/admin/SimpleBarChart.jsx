const defaultColors = ['bg-ocean', 'bg-libre', 'bg-golden', 'bg-sunrise', 'bg-electric', 'bg-sunset']

export function SimpleBarChart({ data, color, title }) {
  if (!data || data.length === 0) return null

  const maxVal = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>}
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-20 text-right truncate">{item.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${
                  color || defaultColors[i % defaultColors.length]
                }`}
                style={{ width: `${Math.max((item.value / maxVal) * 100, 4)}%` }}
              >
                <span className="text-[10px] font-bold text-white">{item.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
