import { useState } from 'react'
import {
  Shield,
  Activity,
  AlertTriangle,
  FileText,
  Sliders,
  DollarSign,
  Cpu,
  Layers,
  Sparkles,
  Server
} from 'lucide-react'

// Define tabs
type Tab = 'overview' | 'health' | 'incidents' | 'policy' | 'audit' | 'settings'

interface NavigationItem {
  id: Tab
  label: string
  icon: React.ComponentType<any>
  description: string
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const navigationItems: NavigationItem[] = [
    {
      id: 'overview',
      label: 'Revenue Overview',
      icon: DollarSign,
      description: 'Global revenue leaks, recovery metrics, and risk overview.'
    },
    {
      id: 'health',
      label: 'Revenue Health',
      icon: Activity,
      description: 'Processor degradation index and checkout abandonment charts.'
    },
    {
      id: 'incidents',
      label: 'Active Incidents',
      icon: AlertTriangle,
      description: 'Real-time anomalies investigated by Gemini AI and diagnostics.'
    },
    {
      id: 'policy',
      label: 'Policy Center',
      icon: Sliders,
      description: 'Deterministic boundaries, retry configurations, and rules.'
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: FileText,
      description: 'Cryptographically-ordered log of recommendations and executions.'
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Server,
      description: 'Integrations, webhook setups, and Gemini api configurations.'
    }
  ]

  const activeItem = navigationItems.find(item => item.id === activeTab) || navigationItems[0]

  return (
    <div className="flex h-screen w-screen bg-[#0d0e12] text-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#13151c] border-r border-[#202430] flex flex-col justify-between shrink-0">
        <div>
          {/* Brand/Logo */}
          <div className="h-16 flex items-center px-6 gap-3 border-b border-[#202430]">
            <div className="bg-purple-600/20 p-2 rounded-lg border border-purple-500/30">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wider uppercase text-purple-400">Revenue Sentinel</h1>
              <span className="text-[10px] text-gray-500 font-mono">Platform Foundation v0.1.0</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group text-left ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border-l-2 border-purple-500 pl-2.5'
                      : 'text-gray-400 hover:bg-[#1a1d26] hover:text-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-200 ${
                    isActive ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-300'
                  }`} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* User / Environment Info Footer */}
        <div className="p-4 border-t border-[#202430] bg-[#0f1015]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-700/30 flex items-center justify-center">
              <span className="text-xs font-semibold text-purple-300">RS</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-300">Sandbox Merchant</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-gray-500 font-mono">F01 Foundation Active</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-16 border-b border-[#202430] bg-[#13151c]/50 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">{activeItem.label}</h2>
            <p className="text-xs text-gray-400">{activeItem.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#1b1e28] px-3 py-1.5 rounded-full border border-[#2e3445]">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-medium text-gray-300 font-mono">FastAPI Backend: Online</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Information Banner */}
          <div className="bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-start gap-4">
              <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/30 shrink-0">
                <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-purple-200">Milestone F01: Repository & Project Foundation</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Welcome to the Revenue Sentinel workspace. You are currently viewing the **F01 Foundation Shell**.
                  This phase establishes the clean full-stack module architecture, routing setup, environment loading,
                  and backend endpoints. Real dashboard features, anomaly intelligence, and interventions will be introduced
                  incrementally in future milestones.
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <span className="bg-purple-900/30 text-purple-300 border border-purple-800/40 px-2.5 py-0.5 rounded-full text-xs font-mono">React + TS + Vite</span>
                  <span className="bg-[#1a1b24] text-gray-400 border border-gray-800 px-2.5 py-0.5 rounded-full text-xs font-mono">FastAPI</span>
                  <span className="bg-[#1a1b24] text-gray-400 border border-gray-800 px-2.5 py-0.5 rounded-full text-xs font-mono">PostgreSQL Foundation</span>
                  <span className="bg-[#1a1b24] text-gray-400 border border-gray-800 px-2.5 py-0.5 rounded-full text-xs font-mono">Tailwind CSS v4</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid Layout representing future features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6 hover:border-purple-500/20 transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform duration-200">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-gray-200">Ingestion Flow</h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Will consume live webhooks from Razorpay, perform signature validation, and persist payment events idempotently (Milestones F05-F09).
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6 hover:border-purple-500/20 transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform duration-200">
                  <Activity className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-gray-200">Anomaly Detection</h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Will calculate historical baselines and run statistical checks to flag payment degradation and calculate revenue-at-risk (Milestones F10-F14).
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6 hover:border-purple-500/20 transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform duration-200">
                  <Shield className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-gray-200">Bounded Interventions</h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                AI recommends; deterministic policy engine enforces limits, stopping conditions, and safety rollbacks (Milestones F20-F29).
              </p>
            </div>
          </div>

          {/* Placeholder details for current tab */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-8 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#202430] pb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
              <h3 className="text-base font-semibold text-gray-200">Active View: {activeItem.label}</h3>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              This layout acts as the structural shell for the **{activeItem.label}** dashboard view. Under our architectural rules, 
              the UI relies on components styled directly with Tailwind CSS variables and standard Tailwind classes to maintain consistent aesthetics.
            </p>
            <div className="bg-[#0d0e12] border border-[#202430] rounded-lg p-5 font-mono text-xs text-purple-300/80 space-y-2">
              <p>// Dashboard Component Blueprint</p>
              <p>Tab ID: "{activeItem.id}"</p>
              <p>Description: "{activeItem.description}"</p>
              <p>Status: Placeholder Shell Loaded</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
