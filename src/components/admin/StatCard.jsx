const colorMap = {
  ocean: 'bg-ocean/10 text-ocean',
  libre: 'bg-libre/10 text-libre',
  golden: 'bg-golden/10 text-golden',
  electric: 'bg-electric/10 text-electric',
  sunrise: 'bg-sunrise/10 text-sunrise',
  sunset: 'bg-sunset/10 text-sunset',
}

export function StatCard({ title, value, icon: Icon, color = 'ocean', trend }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-extrabold text-deep">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 font-medium ${trend > 0 ? 'text-libre' : 'text-sunset'}`}>
              {trend > 0 ? '+' : ''}{trend}% vs last week
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${colorMap[color] || colorMap.ocean}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  )
}
