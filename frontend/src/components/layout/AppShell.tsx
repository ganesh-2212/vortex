import React, { useState } from 'react'
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
  LayoutDashboard
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
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="h-20 flex items-center px-6 gap-3.5 border-b border-slate-100">
            <img src="/branding/flowmint-symbol.png" alt="FLOWMINT Logo" className="w-[44px] h-[44px] object-contain" />
            <div className="flex flex-col">
              <h1 className="text-[19px] font-bold tracking-tight text-slate-900 leading-none">FLOWMINT</h1>
              <span className="text-[11px] text-slate-500 font-medium uppercase tracking-[0.15em] mt-0.5">OPERATIONS</span>
            </div>
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all group ${
                    isActive 
                    ? 'bg-purple-50 text-purple-700 border-purple-200' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <div>
                    <div>{item.label}</div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-700">RS</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-900">Sandbox Merchant</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] text-slate-500 font-medium">Guardrails enabled</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
          <aside className="relative flex flex-col w-64 max-w-xs bg-white border-r border-slate-200 h-full p-4 justify-between z-50 animate-in slide-in-from-left duration-200 shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-3.5">
                  <img src="/branding/flowmint-symbol.png" alt="FLOWMINT Logo" className="w-[40px] h-[40px] object-contain" />
                  <div className="flex flex-col">
                    <h1 className="text-[17px] font-bold tracking-tight text-slate-900 leading-none">FLOWMINT</h1>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-[0.15em] mt-0.5">OPERATIONS</span>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded text-slate-500 hover:bg-slate-100">
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
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${
                        isActive 
                        ? 'bg-purple-50 text-purple-700' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                      <div>
                        <div>{item.label}</div>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </div>
            
            <div className="p-3 border border-slate-200 bg-slate-50 rounded-md">
              <div className="text-xs font-medium text-slate-900">Sandbox Merchant</div>
              <div className="text-[9px] text-slate-500 mt-0.5 tabular-nums">Guardrails enabled shell</div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Panel Content container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header */}
        <header className="h-20 border-b border-slate-100 bg-white/90 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{navItems.find(t => t.id === activeTab)?.label || activeTab.replace(/-/g, ' ')}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs text-slate-500 font-medium">
              Synced: <span className="text-slate-700">{formatTime(lastRefreshed)}</span>
            </span>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-sm transition-colors cursor-pointer font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Sync Data</span>
            </button>
            
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-xs font-semibold">
              <div className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
              <span className="text-slate-700">
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
