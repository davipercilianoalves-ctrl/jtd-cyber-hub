-- Tabela de Produtos
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  description TEXT,
  cost_price NUMERIC(10,2),
  weight_g INTEGER,
  dimensions TEXT,
  category TEXT,
  keywords TEXT[] DEFAULT '{}',
  common_questions TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Tabela de Concorrentes dos Produtos
CREATE TABLE public.product_competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  price NUMERIC(10,2),
  url TEXT,
  keywords_found TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_competitors ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_competitors TO authenticated;
GRANT ALL ON public.product_competitors TO service_role;

-- Políticas
CREATE POLICY "Usuários autenticados podem gerenciar produtos"
ON public.products FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem gerenciar concorrentes"
ON public.product_competitors FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
