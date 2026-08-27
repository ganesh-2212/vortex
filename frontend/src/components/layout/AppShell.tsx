import React, { useState } from 'react'
import {
  Shield,
  DollarSign,
  Zap,
  Activity,
  Layers,
  Cpu,
  RefreshCw,
  Menu,
  X,
  Globe,
  BarChart,
  TestTube,
  FileText,
  Settings
} from 'lucide-react'

export type Tab = 'overview' | 'cases' | 'recommendations' | 'events' | 'webhooks' | 'guardrails' | 'configuration' | 'simulation' | 'performance' | 'explanation' | 'command-center'

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
    { id: 'command-center' as Tab, label: 'Command Center', icon: Activity, desc: 'Central hub' },
    { id: 'overview' as Tab, label: 'Overview', icon: DollarSign, desc: 'Executive dashboard' },
    { id: 'cases' as Tab, label: 'Recovery Cases', icon: Layers, desc: 'Operational queues' },
    { id: 'recommendations' as Tab, label: 'Recommendations', icon: Zap, desc: 'Automation decisions' },
    { id: 'config' as Tab, label: 'Merchant Settings', icon: Settings, desc: 'Account configuration' },
    { id: 'simulation' as Tab, label: 'F12 Simulation', icon: TestTube, desc: 'Incremental value proof' },
    { id: 'performance' as Tab, label: 'F14 Strategy Perf', icon: BarChart, desc: 'Impact metrics' },
    { id: 'explanation' as Tab, label: 'Decision Intelligence', icon: FileText, desc: 'Logic transparency' },
    { id: 'events' as Tab, label: 'Activity Feed', icon: Activity, desc: 'Realtime events log' },
    { id: 'webhooks' as Tab, label: 'Webhooks Ingestion', icon: Globe, desc: 'Signature verify status' },
    { id: 'guardrails' as Tab, label: 'Guardrails Rules', icon: Shield, desc: 'Safety enforcement' },
    { id: 'configuration' as Tab, label: 'Configuration', icon: Cpu, desc: 'Merchant policies' }
  ]

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never'
    return date.toLocaleTimeString()
  }

  return (
    <div className="flex h-screen w-screen bg-[#0d0e12] text-gray-100 font-sans overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-[#13151c] border-r border-[#202430] flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="h-16 flex items-center px-6 gap-3 border-b border-[#202430]">
            <div className="bg-purple-600/20 p-2 rounded-lg border border-purple-500/30">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wider uppercase text-purple-400">Revenue Sentinel</h1>
              <span className="text-[10px] text-gray-500 font-mono">Operations Console</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left group ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border-l-2 border-purple-500 pl-2.5'
                      : 'text-gray-400 hover:bg-[#1a1d26] hover:text-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  <div>
                    <div>{item.label}</div>
                    <div className="text-[9px] text-gray-500 font-normal leading-none mt-0.5">{item.desc}</div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#202430] bg-[#0f1015]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-700/30 flex items-center justify-center">
              <span className="text-xs font-semibold text-purple-300">RS</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-300">Sandbox Merchant</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                <span className="text-[9px] text-gray-500 font-mono">F10 Console Mode</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
          <aside className="relative flex flex-col w-64 max-w-xs bg-[#13151c] border-r border-[#202430] h-full p-4 justify-between z-50 animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#202430]">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <span className="text-xs font-bold tracking-wider uppercase text-purple-400">Sentinel Menu</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded text-gray-400 hover:bg-[#202430]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="space-y-1.5">
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
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                        isActive
                          ? 'bg-purple-600/20 text-purple-300 border-l-2 border-purple-500 pl-2.5'
                          : 'text-gray-400 hover:bg-[#1a1d26] hover:text-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-purple-400" />
                      <div>
                        <div>{item.label}</div>
                        <div className="text-[9px] text-gray-500 leading-none mt-0.5">{item.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </div>
            
            <div className="p-3 border-t border-[#202430] bg-[#0f1015] rounded-lg">
              <div className="text-xs font-semibold text-gray-300">Sandbox Merchant</div>
              <div className="text-[9px] text-gray-500 mt-0.5 font-mono">F10 Active shell</div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Panel Content container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header */}
        <header className="h-16 border-b border-[#202430] bg-[#13151c]/50 backdrop-blur-md px-6 md:px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded bg-[#1b1e28] border border-[#2e3445] text-gray-300">
              <Menu className="w-4.5 h-4.5" />
            </button>
            <div>
              <h2 className="text-base md:text-lg font-semibold text-gray-100 capitalize">{activeTab.replace(/-/g, ' ')}</h2>
              <span className="hidden sm:inline text-[10px] text-gray-400">
                Last synced: <span className="font-mono text-purple-300">{formatTime(lastRefreshed)}</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 bg-[#1b1e28] hover:bg-[#232734] text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-[#2e3445] text-xs transition duration-150 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Sync Console</span>
            </button>
            
            <div className="flex items-center gap-1.5 bg-[#1b1e28] px-2.5 py-1.5 rounded-full border border-[#2e3445] text-[10px] md:text-xs">
              <Cpu className={`w-3.5 h-3.5 ${apiConnected ? 'text-purple-400' : 'text-rose-400 animate-pulse'}`} />
              <span className="font-mono font-medium text-gray-300">
                {apiConnected ? 'Local Connected' : 'Disconnected'}
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
