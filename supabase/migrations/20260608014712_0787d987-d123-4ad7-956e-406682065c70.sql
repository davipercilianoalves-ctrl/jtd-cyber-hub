CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  contact_name TEXT,
  whatsapp TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  delivery_days INTEGER DEFAULT 0,
  warranty_days INTEGER DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Habilitar RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

-- Políticas
CREATE POLICY "Usuários autenticados podem gerenciar fornecedores"
ON public.suppliers
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Trigger para updated_at (opcional, mas boa prática)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Caso queira adicionar a coluna updated_at (não estava no pedido, mas é padrão JTD em outras tabelas se houver)
-- ALTER TABLE public.suppliers ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
-- CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
