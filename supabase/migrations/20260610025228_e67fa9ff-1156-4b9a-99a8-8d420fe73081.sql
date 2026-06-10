CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL DEFAULT 'mercado_livre',
  titles TEXT[] DEFAULT '{}',
  brief_description TEXT,
  full_description_template TEXT,
  video_name TEXT,
  video_script TEXT,
  video_youtube_url TEXT,
  cost_price NUMERIC(10,2) DEFAULT 0,
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

-- Habilitar RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;

-- Políticas
CREATE POLICY "Usuários autenticados podem gerenciar anúncios"
ON public.ads FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');