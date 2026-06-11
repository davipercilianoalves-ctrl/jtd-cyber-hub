CREATE TABLE public.ml_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id TEXT NOT NULL,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ml_tokens TO authenticated;
GRANT ALL ON public.ml_tokens TO service_role;

ALTER TABLE public.ml_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ML tokens" ON public.ml_tokens
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE INDEX idx_ml_tokens_owner_id ON public.ml_tokens(owner_id);