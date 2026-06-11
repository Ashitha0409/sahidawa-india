-- =============================================================================
-- SahiDawa — ABHA Integration Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.abha_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    abha_address    TEXT NOT NULL,
    abha_number     TEXT NOT NULL,
    encrypted_token TEXT NOT NULL,  -- Encrypted at rest
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    linked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.abha_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    abha_link_id    UUID REFERENCES public.abha_links(id) ON DELETE CASCADE,
    record_type     TEXT NOT NULL CHECK (record_type IN ('verification', 'prescription')),
    record_data     JSONB NOT NULL,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for efficient queries
CREATE INDEX IF NOT EXISTS idx_abha_links_user_id ON public.abha_links(user_id);
CREATE INDEX IF NOT EXISTS idx_abha_records_user_id ON public.abha_records(user_id);

-- Enable Row Level Security
ALTER TABLE public.abha_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abha_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for abha_links
CREATE POLICY "Users can manage their own abha links"
    ON public.abha_links
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access to abha links"
    ON public.abha_links
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for abha_records
CREATE POLICY "Users can manage their own abha records"
    ON public.abha_records
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access to abha records"
    ON public.abha_records
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
