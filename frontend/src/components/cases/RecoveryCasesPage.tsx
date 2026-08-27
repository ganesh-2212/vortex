import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { PageHeader, DataTable, RiskBadge, StatusBadge, MoneyValue } from '../common/UI';

interface RecoveryCasesPageProps {
  cases: any[];
  priorities: any[];
  onSelectCase: (caseId: string) => void;
}

type SortField = 'id' | 'amount_at_risk' | 'priority_score' | 'created_at' | 'status';
type SortOrder = 'asc' | 'desc';

export default function RecoveryCasesPage({
  cases,
  priorities,
  onSelectCase
}: RecoveryCasesPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('priority_score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Cross-reference cases list with priorities metadata
  const enrichedCases = cases.map((c) => {
    const activeIntel = priorities.find((p) => p.case_id === c.id);
    return {
      ...c,
      priority_score: activeIntel ? activeIntel.priority_score : (c.status === 'RECOVERED' ? 100 : 0),
      time_category: activeIntel ? activeIntel.time_sensitivity.category : 'N/A',
      estimated_recoverable: activeIntel ? activeIntel.estimated_recoverable : '0.00'
    };
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredCases = enrichedCases.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_id.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRisk = riskFilter === 'ALL' || c.risk_level.toUpperCase() === riskFilter.toUpperCase();
    const matchesStatus = statusFilter === 'ALL' || c.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesRisk && matchesStatus;
  });

  const sortedCases = [...filteredCases].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'amount_at_risk') {
      aVal = Number(a.amount_at_risk);
      bVal = Number(b.amount_at_risk);
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const sortArrow = (field: SortField) => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const columns = [
    {
      header: `Case ID${sortArrow('id')}`,
      accessor: (row: any) => <span className="font-mono text-xs">{row.id.substring(0, 8)}...</span>,
      className: 'cursor-pointer select-none',
      onClick: () => handleSort('id')
    },
    {
      header: 'Risk Level',
      accessor: (row: any) => <RiskBadge level={row.risk_level} />
    },
    {
      header: `Amount at Risk${sortArrow('amount_at_risk')}`,
      accessor: (row: any) => <MoneyValue amount={row.amount_at_risk} />,
      align: 'right' as const,
      className: 'cursor-pointer select-none'
    },
    {
      header: `Priority Score${sortArrow('priority_score')}`,
      accessor: (row: any) => <span className="font-mono">{row.priority_score.toFixed(0)}</span>,
      align: 'center' as const,
      className: 'cursor-pointer select-none'
    },
    {
      header: 'Age Status',
      accessor: (row: any) => <span className="text-text-secondary">{row.time_category}</span>
    },
    {
      header: `Status${sortArrow('status')}`,
      accessor: (row: any) => <StatusBadge status={row.status} />,
      className: 'cursor-pointer select-none'
    },
    {
      header: 'Outcome Recovered',
      accessor: (row: any) => row.status === 'RECOVERED' ? (
        <span className="text-success"><MoneyValue amount={row.recovered_amount || row.amount_at_risk} /></span>
      ) : (
        <span className="text-text-muted italic">Unresolved</span>
      ),
      align: 'right' as const
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Recovery Cases" 
        subtitle="Manage and investigate active operational queues and revenue anomalies."
      />
      
      {/* Search & Filters Controls */}
      <div className="bg-surface border border-border rounded-lg p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search Case or Customer UUID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background text-sm text-text-primary rounded-md pl-9 pr-4 py-2 outline-none border border-border focus:border-text-secondary transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md border border-border">
            <span className="text-xs text-text-secondary font-medium">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-transparent text-sm text-text-primary outline-none cursor-pointer"
            >
              <option value="ALL">All Risks</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md border border-border">
            <span className="text-xs text-text-secondary font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm text-text-primary outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RECOVERED">Recovered</option>
              <option value="STOPPED">Stopped</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={sortedCases} 
        keyExtractor={(row) => row.id} 
        onRowClick={(row) => onSelectCase(row.id)}
        emptyMessage="No cases matched the current filters."
      />
    </div>
  );
}
