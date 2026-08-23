-- Migration: 0002_revenue_recovery.sql
-- Description: Creates the tables for merchants, customers, revenue events, recovery cases, recovery actions, and audit logs.

CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_events (
    id UUID PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recovery_cases (
    id UUID PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    revenue_event_id UUID NOT NULL REFERENCES revenue_events(id) ON DELETE CASCADE,
    amount_at_risk NUMERIC(14,2) NOT NULL,
    risk_level TEXT NOT NULL,
    risk_reason TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recovery_actions (
    id UUID PRIMARY KEY,
    recovery_case_id UUID NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    status TEXT NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    reason TEXT,
    executed_at TIMESTAMPTZ,
    result JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    recovery_case_id UUID REFERENCES recovery_cases(id) ON DELETE SET NULL,
    actor_type TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_revenue_events_merchant_id ON revenue_events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_customer_id ON revenue_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_event_type ON revenue_events(event_type);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_merchant_id ON recovery_cases(merchant_id);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_status ON recovery_cases(status);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_risk_level ON recovery_cases(risk_level);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_recovery_case_id ON recovery_actions(recovery_case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_recovery_case_id ON audit_logs(recovery_case_id);
