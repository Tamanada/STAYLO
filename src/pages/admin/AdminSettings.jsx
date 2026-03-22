import { Settings, Shield, Database, Globe } from 'lucide-react'

export default function AdminSettings() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-deep">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Admin configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-ocean/10 text-ocean">
              <Settings size={20} />
            </div>
            <h3 className="font-semibold text-deep">Application</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">alpha-0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Environment</span>
              <span className="font-mono text-xs bg-libre/10 text-libre px-2 py-0.5 rounded">production</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Domain</span>
              <span className="font-medium">staylo.app</span>
            </div>
          </div>
        </div>

        {/* Admin Access */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-electric/10 text-electric">
              <Shield size={20} />
            </div>
            <h3 className="font-semibold text-deep">Admin Access</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-gray-500 text-xs mb-3">Authorized admin emails:</p>
            {['admin@staylo.app', 'david@staylo.app'].map(email => (
              <div key={email} className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-libre" />
                <span className="text-gray-700 font-mono text-xs">{email}</span>
              </div>
            ))}
            <p className="text-xs text-gray-400 mt-3 italic">
              Add more admins via VITE_ADMIN_EMAILS env variable
            </p>
          </div>
        </div>

        {/* Database */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-golden/10 text-golden">
              <Database size={20} />
            </div>
            <h3 className="font-semibold text-deep">Database</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Provider</span>
              <span className="font-medium">Supabase</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-mono text-xs bg-golden/10 text-golden px-2 py-0.5 rounded">
                {import.meta.env.VITE_SUPABASE_URL?.includes('your-project') ? 'Not Connected' : 'Connected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mode</span>
              <span className="font-mono text-xs bg-ocean/10 text-ocean px-2 py-0.5 rounded">Demo Data</span>
            </div>
          </div>
        </div>

        {/* Languages */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-sunrise/10 text-sunrise">
              <Globe size={20} />
            </div>
            <h3 className="font-semibold text-deep">Languages</h3>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {['EN', 'FR', 'TH', 'JA', 'ES', 'AR', 'RU', 'ZH', 'HI', 'PT', 'DE', 'ID', 'MY'].map(lang => (
              <span key={lang} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium">{lang}</span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">13 languages supported</p>
        </div>
      </div>

      {/* Future features */}
      <div className="mt-8 bg-gradient-to-br from-deep to-electric/80 rounded-2xl p-8 text-white">
        <h3 className="text-lg font-bold mb-2">Coming Soon</h3>
        <p className="text-white/60 text-sm mb-4">Future admin settings will include:</p>
        <ul className="space-y-2 text-sm text-white/70">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-golden" />
            Commission rate configuration
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-libre" />
            Email templates management
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-ocean" />
            Webhook integrations
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-sunrise" />
            API keys and scraping configuration
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-sunset" />
            Export data (CSV, JSON)
          </li>
        </ul>
      </div>
    </div>
  )
}
