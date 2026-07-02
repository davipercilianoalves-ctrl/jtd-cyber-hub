-- Etapa 1 Promoções: tabela de snapshots + extensões para cron horário

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.promo_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ml_item_id text NOT NULL,
  ad_id uuid NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  price numeric NULL,
  original_price numeric NULL,
  ml_discount_pct numeric NULL,
  expected_discount_pct numeric NULL,
  deal_ids jsonb NULL,
  has_fake_promo_expected boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'unknown',
  previous_status text NULL,
  just_ended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ml_item_id)
);

CREATE INDEX idx_promo_snapshots_user ON public.promo_snapshots(user_id);
CREATE INDEX idx_promo_snapshots_status ON public.promo_snapshots(user_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_snapshots TO authenticated;
GRANT ALL ON public.promo_snapshots TO service_role;

ALTER TABLE public.promo_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own promo snapshots"
  ON public.promo_snapshots
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_promo_snapshots_updated_at
  BEFORE UPDATE ON public.promo_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();