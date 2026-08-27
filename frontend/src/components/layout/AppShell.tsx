import React, { useState } from 'react';
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
} from 'lucide-react';

export type Tab = 'overview' | 'cases' | 'recommendations' | 'events' | 'webhooks' | 'guardrails' | 'configuration' | 'simulation' | 'performance' | 'explanation' | 'what-if';

interface AppShellProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  loading: boolean;
  onRefresh: () => void;
  lastRefreshed: Date | null;
  apiConnected: boolean;
  children: React.ReactNode;
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navGroups = [
    {
      label: 'Command Center',
      items: [
        { id: 'overview' as Tab, label: 'Overview', icon: Activity }
      ]
    },
    {
      label: 'Recovery',
      items: [
        { id: 'cases' as Tab, label: 'Cases', icon: Layers },
        { id: 'recommendations' as Tab, label: 'Recommendations', icon: Zap },
        { id: 'performance' as Tab, label: 'Strategy performance', icon: BarChart }
      ]
    },
    {
      label: 'Intelligence',
      items: [
        { id: 'explanation' as Tab, label: 'Decision intelligence', icon: FileText },
        { id: 'what-if' as Tab, label: 'What-if lab', icon: TestTube }
      ]
    },
    {
      label: 'Operations',
      items: [
        { id: 'events' as Tab, label: 'Activity', icon: Activity },
        { id: 'webhooks' as Tab, label: 'Webhooks', icon: Globe },
        { id: 'guardrails' as Tab, label: 'Guardrails', icon: Shield }
      ]
    },
    {
      label: 'Configuration',
      items: [
        { id: 'configuration' as Tab, label: 'Merchant settings', icon: Settings }
      ]
    }
  ];

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  const NavContent = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Logo */}
      <div className="pt-8 pb-4 px-6 shrink-0">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="bg-text-primary text-surface p-1.5 rounded-md">
            <Shield className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-text-primary">Revenue Sentinel</h1>
        </div>
        <div className="px-1 text-[10px] font-medium text-text-muted uppercase tracking-[0.2em]">
          REVENUE OPERATIONS
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-4 mb-2 text-[10px] font-semibold text-text-muted/60 uppercase tracking-widest">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-[13px] transition-all text-left relative ${
                      isActive
                        ? 'text-brand font-medium bg-brand/5'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand rounded-r-full"></span>}
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand' : 'text-text-muted'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 mt-auto">
        <div className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-border">
          <div className="w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-text-secondary">RS</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">Sandbox Merchant</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
              <span className="text-[10px] text-text-secondary">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen bg-background text-text-primary font-sans overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <aside className="sidebar hidden md:block w-64 bg-surface border-r border-border shrink-0 overflow-y-auto">
        <NavContent />
      </aside>

      {/* Sidebar - Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
          <aside className="sidebar relative flex flex-col w-64 max-w-xs bg-surface border-r border-border h-full z-50 animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="absolute top-4 right-4 z-50">
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded text-text-secondary hover:bg-surface-hover">
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main Panel Content container */}
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 lg:px-8 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 -ml-1.5 rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-text-primary capitalize">
                {activeTab.replace(/-/g, ' ')}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-text-muted" />
              <span className="text-xs font-medium text-text-secondary">Synced just now</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-success' : 'bg-danger'}`}></span>
              <span className="text-[12px] font-semibold text-text-primary">{apiConnected ? 'API Active' : 'Offline'}</span>
            </div>
          </div>
        </header>

        {/* Dashboard Pages wrapper */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
