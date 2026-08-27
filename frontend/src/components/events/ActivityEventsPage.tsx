import React, { useState } from 'react';
import { PageHeader, DataTable, MoneyValue } from '../common/UI';

interface ActivityEventsPageProps {
  events: any[];
  auditLogs: any[];
}

type FeedFilter = 'ALL' | 'REVENUE' | 'AUDIT';

export default function ActivityEventsPage({
  events,
  auditLogs
}: ActivityEventsPageProps) {
  const [filterType, setFilterType] = useState<FeedFilter>('ALL');

  // Combine lists into a unified feed sorted chronologically descending
  const feedItems: any[] = [];

  if (filterType === 'ALL' || filterType === 'REVENUE') {
    events.forEach((ev) => {
      feedItems.push({
        id: ev.id,
        timestamp: new Date(ev.occurred_at),
        type: 'REVENUE',
        label: ev.event_type.replace(/_/g, ' '),
        description: (
          <span>
            Customer <span className="font-mono">{ev.customer_id.substring(0, 8)}</span> triggered event with value <MoneyValue amount={ev.amount} />
          </span>
        ),
        actor: 'WEBHOOK',
        status: ev.status
      });
    });
  }

  if (filterType === 'ALL' || filterType === 'AUDIT') {
    auditLogs.forEach((log) => {
      let desc = '';
      if (log.details) {
        desc = typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
      }
      feedItems.push({
        id: log.id,
        timestamp: new Date(log.created_at),
        type: 'AUDIT',
        label: log.action.replace(/_/g, ' '),
        description: desc || `Audit event recorded for case ${log.recovery_case_id?.substring(0, 8)}...`,
        actor: log.actor_type,
        status: log.details?.status || 'LOGGED'
      });
    });
  }

  feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const columns = [
    {
      header: 'Timestamp',
      accessor: (row: any) => <span className="font-mono text-xs text-text-secondary">{row.timestamp.toLocaleString()}</span>,
    },
    {
      header: 'Feed Category',
      accessor: (row: any) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
          row.type === 'REVENUE'
            ? 'text-brand bg-brand/10 border-brand/20'
            : 'text-info bg-info/10 border-info/20'
        }`}>
          {row.type === 'REVENUE' ? 'Webhook Event' : 'System Audit'}
        </span>
      )
    },
    {
      header: 'Action / Event',
      accessor: (row: any) => <span className="font-semibold text-text-primary">{row.label}</span>,
    },
    {
      header: 'Activity Details',
      accessor: (row: any) => <span className="text-text-secondary max-w-md block truncate" title={typeof row.description === 'string' ? row.description : ''}>{row.description}</span>,
    },
    {
      header: 'Origin Actor',
      accessor: (row: any) => <span className="font-mono text-text-secondary">{row.actor}</span>,
      align: 'right' as const,
    }
  ];

  const actions = (
    <div className="flex gap-2">
      {['ALL', 'REVENUE', 'AUDIT'].map((t) => (
        <button
          key={t}
          onClick={() => setFilterType(t as FeedFilter)}
          className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors cursor-pointer ${
            filterType === t
              ? 'bg-brand/10 text-brand border-brand/30'
              : 'bg-surface text-text-secondary border-border hover:text-text-primary hover:bg-surface-hover'
          }`}
        >
          {t === 'ALL' ? 'All Operations' : t === 'REVENUE' ? 'Revenue Webhooks' : 'System Audit Logs'}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Activity Log" 
        subtitle="Real-time operational feed and system audit history."
        actions={actions}
      />
      <DataTable 
        columns={columns} 
        data={feedItems} 
        keyExtractor={(row) => row.id} 
        emptyMessage="There are currently no events registered in the operational logs."
      />
    </div>
  );
}
