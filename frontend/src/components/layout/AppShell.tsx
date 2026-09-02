import React, { useState, useEffect } from 'react'
import {
  Gauge,
  Activity,
  FolderKanban,
  Lightbulb,
  FlaskConical,
  BarChart3,
  BrainCircuit,
  GitCompareArrows,
  Webhook,
  ShieldCheck,
  Settings2,
  Settings,
  Menu,
  X,
  RefreshCw,
  LayoutDashboard,
  Moon,
  Sun
} from 'lucide-react'

export type Tab = 'overview' | 'cases' | 'recommendations' | 'events' | 'webhooks' | 'guardrails' | 'configuration' | 'simulation' | 'performance' | 'explanation' | 'command-center' | 'what-if' | 'config'

interface AppShellProps {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  loading: boolean
  onRefresh: () => void
  lastRefreshed: Date | null
  apiConnected: boolean
  children: React.ReactNode
}

export default function AppShell({
  activeTab,
  setActiveTab,
  loading,
  onRefresh,
  lastRefreshed,
  apiConnected,
  children
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const navItems = [
    { id: 'overview' as Tab, label: 'Overview', icon: Gauge, desc: 'Executive dashboard' },
    { id: 'command-center' as Tab, label: 'Command Center', icon: LayoutDashboard, desc: 'Central hub' },
    { id: 'cases' as Tab, label: 'Recovery Cases', icon: FolderKanban, desc: 'Operational queues' },
    { id: 'recommendations' as Tab, label: 'Recommendations', icon: Lightbulb, desc: 'Automation decisions' },
    { id: 'simulation' as Tab, label: 'Recovery Simulation', icon: FlaskConical, desc: 'Incremental value proof' },
    { id: 'performance' as Tab, label: 'Strategy Performance', icon: BarChart3, desc: 'Impact metrics' },
    { id: 'explanation' as Tab, label: 'Decision Intelligence', icon: BrainCircuit, desc: 'Logic transparency' },
    { id: 'what-if' as Tab, label: 'What-If Analysis', icon: GitCompareArrows, desc: 'Policy sandbox' },
    { id: 'events' as Tab, label: 'Activity Feed', icon: Activity, desc: 'Realtime events log' },
    { id: 'webhooks' as Tab, label: 'Webhooks', icon: Webhook, desc: 'Signature verify status' },
    { id: 'guardrails' as Tab, label: 'Guardrails', icon: ShieldCheck, desc: 'Safety enforcement' },
    { id: 'config' as Tab, label: 'Merchant Settings', icon: Settings2, desc: 'Account configuration' },
    { id: 'configuration' as Tab, label: 'Configuration', icon: Settings, desc: 'Merchant policies' }
  ]

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never'
    return date.toLocaleTimeString()
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 dark:bg-brand-bg-dark dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-brand-sidebar-dark border-r border-slate-200 dark:border-brand-border-dark flex-col justify-between shrink-0 transition-colors duration-200">
        <div>
          {/* Logo */}
          <div className="h-20 flex items-center px-6 gap-3.5 border-b border-slate-100 dark:border-brand-border-dark transition-colors duration-200">
            <img
              src="/branding/vortex-logo.png"
              alt="VORTEX Logo"
              className="w-[120px] h-[32px] object-contain transition-all duration-200 dark:invert"
            />
          </div>

          {/* Nav */}
          <nav className="p-4 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 group border-l-2 ${isActive
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-brand-ai/5 dark:text-brand-text-primary dark:border-brand-ai'
                      : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-brand-text-secondary dark:hover:bg-brand-surface-dark dark:hover:text-brand-text-primary'
                    }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-purple-600 dark:text-brand-ai' : 'text-slate-400 group-hover:text-slate-600 dark:text-brand-text-muted dark:group-hover:text-brand-text-secondary'}`} />
                  <div>
                    <div>{item.label}</div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-brand-border-dark bg-white dark:bg-brand-sidebar-dark transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-subtle flex items-center justify-center transition-colors">
              <span className="text-xs font-bold text-slate-700 dark:text-brand-text-primary">RS</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-900 dark:text-brand-text-primary">Sandbox Merchant</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-brand-success"></span>
                <span className="text-[10px] text-slate-500 dark:text-brand-text-muted font-medium">Guardrails enabled</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/20 dark:bg-brand-bg-dark/80 backdrop-blur-sm transition-colors" onClick={() => setSidebarOpen(false)}></div>
          <aside className="relative flex flex-col w-64 max-w-xs bg-white dark:bg-brand-sidebar-dark border-r border-slate-200 dark:border-brand-border-dark h-full p-4 justify-between z-50 animate-in slide-in-from-left duration-200 shadow-sm transition-colors">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-brand-border-dark">
                <div className="flex items-center gap-3.5">
                  <img
                    src="/branding/vortex-logo.png"
                    alt="VORTEX Logo"
                    className="w-[110px] h-[30px] object-contain transition-all duration-200 dark:invert"
                  />
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded text-slate-500 dark:text-brand-text-muted hover:bg-slate-100 dark:hover:bg-brand-surface-dark transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="space-y-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id)
                        setSidebarOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 border-l-2 ${isActive
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-brand-ai/5 dark:text-brand-text-primary dark:border-brand-ai'
                          : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-brand-text-secondary dark:hover:bg-brand-surface-dark dark:hover:text-brand-text-primary'
                        }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600 dark:text-brand-ai' : 'text-slate-400 dark:text-brand-text-muted'}`} />
                      <div>
                        <div>{item.label}</div>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="p-3 border border-slate-200 dark:border-brand-border-subtle bg-slate-50 dark:bg-brand-surface-dark rounded-md transition-colors duration-200">
              <div className="text-xs font-medium text-slate-900 dark:text-brand-text-primary">Sandbox Merchant</div>
              <div className="text-[9px] text-slate-500 dark:text-brand-text-muted mt-0.5 tabular-nums flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-brand-success inline-block"></span>
                Guardrails enabled
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Panel Content container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Header */}
        <header className="h-20 border-b border-slate-100 dark:border-brand-border-dark bg-white/90 dark:bg-brand-bg-dark/90 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10 shrink-0 transition-colors duration-200">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-brand-surface-dark text-slate-600 dark:text-brand-text-secondary transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-brand-text-primary tracking-tight">{navItems.find(t => t.id === activeTab)?.label || activeTab.replace(/-/g, ' ')}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-brand-text-secondary dark:hover:text-brand-text-primary hover:bg-slate-50 dark:hover:bg-brand-surface-dark rounded-full transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <span className="hidden sm:inline text-xs text-slate-500 dark:text-brand-text-muted font-medium">
              Synced: <span className="text-slate-700 dark:text-brand-text-secondary">{formatTime(lastRefreshed)}</span>
            </span>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 bg-white dark:bg-brand-surface-dark hover:bg-slate-50 dark:hover:bg-brand-card-dark text-slate-700 dark:text-brand-text-primary px-4 py-2 rounded-lg border border-slate-200 dark:border-brand-border-dark shadow-sm text-sm transition-all cursor-pointer font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 dark:text-brand-text-muted transition-transform ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Sync Data</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-brand-success/10 px-3 py-2 rounded-lg border border-slate-100 dark:border-brand-success/20 text-xs font-semibold transition-colors">
              <div className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-emerald-500 dark:bg-brand-success' : 'bg-rose-500 dark:bg-brand-danger animate-pulse'}`} />
              <span className="text-slate-700 dark:text-brand-success">
                {apiConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Pages wrapper */}
        <div className="flex-grow p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </div>
    </div>
  )
}
