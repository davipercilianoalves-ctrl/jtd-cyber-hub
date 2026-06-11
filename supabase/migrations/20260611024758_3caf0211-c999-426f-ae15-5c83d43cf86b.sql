
-- Pick the sole existing user for backfill
DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users ORDER BY created_at LIMIT 1;

  -- Add user_id columns
  ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS user_id uuid;
  ALTER TABLE public.products  ADD COLUMN IF NOT EXISTS user_id uuid;
  ALTER TABLE public.ads       ADD COLUMN IF NOT EXISTS user_id uuid;
  ALTER TABLE public.kits      ADD COLUMN IF NOT EXISTS user_id uuid;
  ALTER TABLE public.kit_products       ADD COLUMN IF NOT EXISTS user_id uuid;
  ALTER TABLE public.product_competitors ADD COLUMN IF NOT EXISTS user_id uuid;

  IF _uid IS NOT NULL THEN
    UPDATE public.suppliers SET user_id = _uid WHERE user_id IS NULL;
    UPDATE public.products  SET user_id = _uid WHERE user_id IS NULL;
    UPDATE public.ads       SET user_id = _uid WHERE user_id IS NULL;
    UPDATE public.kits      SET user_id = _uid WHERE user_id IS NULL;
    UPDATE public.kit_products       SET user_id = _uid WHERE user_id IS NULL;
    UPDATE public.product_competitors SET user_id = _uid WHERE user_id IS NULL;
  END IF;
END $$;

-- Defaults so existing app code (which doesn't set user_id) keeps working
ALTER TABLE public.suppliers ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.products  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.ads       ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.kits      ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.kit_products       ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.product_competitors ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.suppliers ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.products  ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.ads       ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.kits      ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.kit_products       ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.product_competitors ALTER COLUMN user_id SET NOT NULL;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar fornecedores" ON public.suppliers;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar produtos"     ON public.products;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar anúncios"     ON public.ads;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar kits"         ON public.kits;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar produtos dos kits" ON public.kit_products;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar concorrentes" ON public.product_competitors;

-- Owner-scoped policies
CREATE POLICY "own suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own products" ON public.products FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own ads" ON public.ads FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own kits" ON public.kits FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own kit_products" ON public.kit_products FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own product_competitors" ON public.product_competitors FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id  ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_user_id       ON public.ads(user_id);
CREATE INDEX IF NOT EXISTS idx_kits_user_id      ON public.kits(user_id);
CREATE INDEX IF NOT EXISTS idx_kit_products_user_id       ON public.kit_products(user_id);
CREATE INDEX IF NOT EXISTS idx_product_competitors_user_id ON public.product_competitors(user_id);
