--
-- PostgreSQL Modernized Database Schema
-- Based on recommendations for security, consistency, and modern best practices
--

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
COMMENT ON EXTENSION pgcrypto IS 'Provides cryptographic functions, e.g., for UUID generation.';

--
-- Custom Data Types (ENUMs) for better data integrity
--

CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed');
CREATE TYPE order_status AS ENUM ('pending', 'checking', 'finalised', 'cancelled', 'assigned');
CREATE TYPE picking_status AS ENUM ('pending', 'backorder', 'completed', 'unavailable');
CREATE TYPE run_status AS ENUM ('pending', 'checking', 'finalised');
CREATE TYPE security_event_type AS ENUM ('login_success', 'login_failure', 'logout', 'password_reset_request', 'password_reset_success', 'user_lockout');
CREATE TYPE connection_type AS ENUM ('none', 'qbo', 'xero');

--
-- Reusable trigger function for auditing timestamps
--

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--
-- Table Definitions
--

CREATE TABLE public.companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name text NOT NULL,
    connection_type connection_type NOT NULL DEFAULT 'none',
    qbo_realm_id text,
    xero_tenant_id text,
    qbo_token_data text,
    xero_token_data text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    -- Ensure only one connection type is active at a time
    CONSTRAINT one_connection_type CHECK (
        (connection_type = 'none' AND qbo_realm_id IS NULL AND xero_tenant_id IS NULL) OR
        (connection_type = 'qbo' AND qbo_realm_id IS NOT NULL AND xero_tenant_id IS NULL) OR
        (connection_type = 'xero' AND xero_tenant_id IS NOT NULL AND qbo_realm_id IS NULL)
    )
);
COMMENT ON TABLE public.companies IS 'Stores information about customer companies and their accounting software connections.';
COMMENT ON COLUMN public.companies.connection_type IS 'Type of accounting software connection (none, qbo, xero).';
COMMENT ON COLUMN public.companies.qbo_realm_id IS 'QuickBooks Realm ID, used as the primary identifier for a company.';
COMMENT ON COLUMN public.companies.xero_tenant_id IS 'Xero Tenant ID, used as the primary identifier for a company.';

CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL, -- Allow NULL for users without company
    given_name text NOT NULL,
    family_name text,
    display_email text NOT NULL UNIQUE,
    normalised_email text NOT NULL UNIQUE,
    password_hash text NOT NULL, -- CRITICAL: Store a strong hash (e.g., Argon2, bcrypt), not a password.
    is_admin boolean NOT NULL DEFAULT false,
    failed_attempts integer NOT NULL DEFAULT 0,
    last_failed_attempt timestamptz,
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.users IS 'Stores user accounts and authentication details.';
CREATE INDEX ON public.users(company_id);
CREATE INDEX ON public.users(normalised_email);
CREATE INDEX ON public.users(locked_until);

-- New tables for improved security and access control
CREATE TYPE access_level AS ENUM ('read', 'write', 'admin');
CREATE TYPE connection_status AS ENUM ('healthy', 'warning', 'expired', 'revoked');

CREATE TABLE public.user_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    access_level access_level NOT NULL DEFAULT 'read',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, company_id)
);
COMMENT ON TABLE public.user_permissions IS 'Stores user-specific permissions for company operations.';
COMMENT ON COLUMN public.user_permissions.access_level IS 'User access level: read (basic access), write (can modify data), admin (full access + user management)';
CREATE INDEX ON public.user_permissions(user_id);
CREATE INDEX ON public.user_permissions(company_id);

CREATE TABLE public.api_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    api_endpoint text NOT NULL,
    connection_type connection_type NOT NULL,
    request_method text NOT NULL,
    response_status integer,
    error_message text,
    ip_address inet,
    user_agent text,
    timestamp timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.api_audit_log IS 'Tracks API calls for auditing and security monitoring.';
CREATE INDEX ON public.api_audit_log(user_id);
CREATE INDEX ON public.api_audit_log(company_id);
CREATE INDEX ON public.api_audit_log(timestamp);
CREATE INDEX ON public.api_audit_log(connection_type);

CREATE TABLE public.connection_health (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    connection_type connection_type NOT NULL,
    status connection_status NOT NULL DEFAULT 'healthy',
    last_check timestamptz NOT NULL DEFAULT now(),
    last_successful_call timestamptz,
    failure_count integer NOT NULL DEFAULT 0,
    last_error_message text,
    next_check_due timestamptz NOT NULL DEFAULT now() + interval '1 hour',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(company_id, connection_type)
);
COMMENT ON TABLE public.connection_health IS 'Monitors the health of company connections to external services.';
CREATE INDEX ON public.connection_health(company_id);
CREATE INDEX ON public.connection_health(status);
CREATE INDEX ON public.connection_health(next_check_due);

CREATE TABLE public.products (
    id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    sku text NOT NULL,
    barcode text,
    -- Generic external ID fields
    external_item_id text, -- Can be QBO item ID or Xero item ID
    category text,
    tax_code_ref text,
    price numeric(10, 2) NOT NULL DEFAULT 0.00,
    quantity_on_hand numeric(10, 2) NOT NULL DEFAULT 0.00,
    is_archived boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(company_id, sku),
    UNIQUE(company_id, external_item_id)
);
COMMENT ON TABLE public.products IS 'Stores product and inventory information.';
CREATE INDEX ON public.products(company_id);
CREATE UNIQUE INDEX products_barcode_company_idx ON public.products (barcode, company_id) WHERE barcode IS NOT NULL AND barcode <> '';

CREATE TABLE public.customers (
    id text PRIMARY KEY, -- External Customer ID (QBO int or Xero UUID)
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_name text NOT NULL
);
COMMENT ON TABLE public.customers IS 'Stores customer records for each company.';
COMMENT ON COLUMN public.customers.id IS 'External Customer ID from QBO (int) or Xero (UUID)';
CREATE INDEX ON public.customers(company_id);
CREATE INDEX ON public.customers(id);

CREATE TABLE public.quotes (
    id text PRIMARY KEY, -- External Quote ID (QBO int or Xero UUID)
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    status order_status NOT NULL DEFAULT 'pending',
    total_amount numeric(12, 2) NOT NULL,
    preparer_names text,
    order_note text,
    picker_note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.quotes IS 'Represents customer orders or quotes.';
COMMENT ON COLUMN public.quotes.id IS 'External Quote ID from QBO (int) or Xero (UUID)';
CREATE INDEX ON public.quotes(company_id);
CREATE INDEX ON public.quotes(customer_id);
CREATE INDEX ON public.quotes(id);

CREATE TABLE public.quote_items (
    quote_id text NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name text NOT NULL, -- Denormalized for historical accuracy
    sku text NOT NULL,           -- Denormalized for historical accuracy
    price numeric(10, 2) NOT NULL, -- Denormalized for historical accuracy
    tax_code_ref text,
    original_quantity numeric(10, 2) NOT NULL,
    picking_quantity numeric(10, 2) NOT NULL DEFAULT 0,
    picking_status picking_status NOT NULL DEFAULT 'pending',
    PRIMARY KEY (quote_id, product_id)
);
COMMENT ON TABLE public.quote_items IS 'Line items associated with a quote.';
CREATE INDEX ON public.quote_items(product_id);

CREATE TABLE public.jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    s3_key text NOT NULL,
    status job_status NOT NULL DEFAULT 'queued',
    progress_percentage integer NOT NULL DEFAULT 0,
    progress_message text DEFAULT 'File is queued for processing.',
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.jobs IS 'Tracks the status of background processing jobs.';
CREATE INDEX ON public.jobs(company_id);

CREATE TABLE public.runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    run_number bigint NOT NULL,
    status run_status NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.runs IS 'Groups quotes into a logistical run for picking or delivery.';
CREATE INDEX ON public.runs(company_id);

CREATE TABLE public.run_items (
    id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    run_id uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    quote_id text NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    priority integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(run_id, quote_id)
);
COMMENT ON TABLE public.run_items IS 'Associates quotes with a specific run.';

CREATE TABLE public.security_events (
    id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL, -- Keep event log even if user is deleted
    company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    email text, -- Denormalized for logging purposes
    event_type security_event_type NOT NULL,
    ip_address inet,
    user_agent text,
    metadata jsonb,
    timestamp timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.security_events IS 'Logs important security-related activities.';
COMMENT ON COLUMN public.security_events.metadata IS 'Additional event data in JSONB format for flexible querying.';
CREATE INDEX ON public.security_events(user_id);
CREATE INDEX ON public.security_events(company_id);
CREATE INDEX ON public.security_events(ip_address);
CREATE INDEX ON public.security_events(timestamp);

-- FUTURE IMPLEMENTATION: Company Connections Management Table
-- This table will be used for tracking connection status, health monitoring,
-- and multi-platform support when needed in the future.
-- 
-- Purpose: Manage connection metadata without storing sensitive token data
-- Benefits: Connection health monitoring, multi-platform support, admin reporting
-- 
-- Uncomment and implement when you need:
-- - Multiple platforms per company
-- - Connection health monitoring
-- - Admin dashboard for connection status
-- - Platform migration tracking
--
-- CREATE TABLE public.company_connections (
--     id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
--     company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
--     platform VARCHAR(50) NOT NULL, -- 'qbo', 'xero', 'myob', etc.
--     is_active boolean NOT NULL DEFAULT true,
--     connection_status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'revoked', 'inactive'
--     last_sync_at timestamptz,
--     last_health_check timestamptz,
--     health_status VARCHAR(50) DEFAULT 'unknown', -- 'healthy', 'unhealthy', 'unknown'
--     error_count integer DEFAULT 0,
--     last_error_message text,
--     created_at timestamptz NOT NULL DEFAULT now(),
--     updated_at timestamptz NOT NULL DEFAULT now(),
--     UNIQUE(company_id, platform)
-- );
-- COMMENT ON TABLE public.company_connections IS 'Manages connection metadata and health status for different accounting platforms.';
-- COMMENT ON COLUMN public.company_connections.platform IS 'Accounting software platform (qbo, xero, myob, etc.).';
-- COMMENT ON COLUMN public.company_connections.connection_status IS 'Current status of the connection.';
-- COMMENT ON COLUMN public.company_connections.health_status IS 'Health status based on last API test.';
-- 
-- -- Indexes for performance
-- CREATE INDEX idx_company_connections_company_platform ON public.company_connections(company_id, platform);
-- CREATE INDEX idx_company_connections_status ON public.company_connections(connection_status);
-- CREATE INDEX idx_company_connections_health ON public.company_connections(health_status);
-- CREATE INDEX idx_company_connections_last_sync ON public.company_connections(last_sync_at);
-- 
-- -- Trigger for updated_at
-- CREATE TRIGGER set_updated_at_timestamp
-- BEFORE UPDATE ON public.company_connections
-- FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Phase 1: Essential Performance Indexes
-- Optimizes common CRUD operations and joins
CREATE INDEX products_company_sku_idx ON public.products(company_id, sku);
CREATE INDEX quotes_company_status_date_idx ON public.quotes(company_id, status, created_at DESC);
CREATE INDEX quote_items_quote_product_idx ON public.quote_items(quote_id, product_id);

-- Phase 2: Advanced Query Optimization Indexes
-- Optimizes complex filtering, sorting, and business logic queries
CREATE INDEX products_company_archived_category_idx ON public.products(company_id, is_archived, category);
CREATE INDEX quotes_company_customer_date_idx ON public.quotes(company_id, customer_id, created_at DESC);
CREATE INDEX run_items_run_priority_idx ON public.run_items(run_id, priority DESC);

-- Note: The sessions table is standard and generally doesn't need modification.
CREATE TABLE public.sessions (
    sid varchar NOT NULL PRIMARY KEY,
    sess json NOT NULL,
    expire timestamp(6) NOT NULL
);
CREATE INDEX ON public.sessions(expire);

--
-- Automated Maintenance Function (Partitioning is a more advanced alternative)
--
CREATE OR REPLACE FUNCTION public.cleanup_old_security_events()
RETURNS integer AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletes records older than 90 days.
  DELETE FROM public.security_events
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

--
-- Apply the updated_at trigger to all relevant tables
--

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

--
-- Migration script to help transition from old schema to new schema
-- Run this AFTER creating the new schema to migrate existing data
--

-- Migration function to help with the transition
CREATE OR REPLACE FUNCTION migrate_old_schema_to_new()
RETURNS void AS $$
BEGIN
    -- This function would contain the migration logic
    -- It's a placeholder for now - you'll need to implement the actual migration
    -- based on your existing data structure
    
    RAISE NOTICE 'Migration function created. Implement migration logic based on your existing data.';
    RAISE NOTICE 'Key changes:';
    RAISE NOTICE '- companyid -> company_id (uuid)';
    RAISE NOTICE '- productid -> id (bigint)';
    RAISE NOTICE '- quoteid -> id (bigint)';
    RAISE NOTICE '- customerid -> id (bigint)';
    RAISE NOTICE '- All text fields now use text type instead of varchar';
    RAISE NOTICE '- Added created_at and updated_at timestamps';
    RAISE NOTICE '- Added proper foreign key constraints';
    RAISE NOTICE '- Added ENUM types for status fields';
END;
$$ LANGUAGE plpgsql;
