-- Tabela de Kits
CREATE TABLE public.kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  keywords TEXT[] DEFAULT '{}',
  titles TEXT[] DEFAULT '{}',
  brief_description TEXT,
  video_name TEXT,
  video_script TEXT,
  video_youtube_url TEXT,
  marketplace_fee NUMERIC(5,2) DEFAULT 0,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  packaging_cost NUMERIC(10,2) DEFAULT 0,
  transport_cost NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(5,2) DEFAULT 0,
  profit_margin NUMERIC(5,2) DEFAULT 0,
  fake_discount NUMERIC(5,2) DEFAULT 0,
  final_price NUMERIC(10,2) DEFAULT 0,
  fake_price NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Tabela de Produtos do Kit
CREATE TABLE public.kit_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id UUID NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Habilitar RLS
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_products ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kits TO authenticated;
GRANT ALL ON public.kits TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_products TO authenticated;
GRANT ALL ON public.kit_products TO service_role;

-- Políticas
CREATE POLICY "Usuários autenticados podem gerenciar kits"
ON public.kits FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem gerenciar produtos dos kits"
ON public.kit_products FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');