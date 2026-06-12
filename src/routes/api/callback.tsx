import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/api/callback')({
  component: CallbackComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    code: (search.code as string) || undefined,
    state: (search.state as string) || undefined,
  }),
});

function CallbackComponent() {
  const { code, state } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processCallback() {
      if (!code) {
        navigate({ to: '/api' });
        return;
      }

      try {
        const savedState = localStorage.getItem('ml_oauth_state') || state || '';

        const { data, error: invokeError } = await supabase.functions.invoke(
          'ml-auth-callback',
          { body: { code, state: savedState } }
        );

        if (invokeError) throw invokeError;
        if (data?.error) throw new Error(data.error);

        localStorage.removeItem('ml_oauth_state');
        navigate({ to: '/api' });
      } catch (err: any) {
        console.error('Callback error:', err);
        setError(err.message || 'Erro desconhecido');
        setTimeout(() => navigate({ to: '/api' }), 3000);
      }
    }

    processCallback();
  }, [code, state, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4 p-6">
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h1 className="text-lg font-bold text-red-500 font-mono">ERRO NA AUTENTICAÇÃO</h1>
          </div>
          <p className="text-sm text-gray-300 font-mono break-words">{error}</p>
          <p className="mt-4 text-xs text-muted-foreground font-mono">Redirecionando em 3 segundos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-12 h-12 text-[#CCFF00] animate-spin" />
      <p className="text-[#CCFF00] font-mono text-xl animate-pulse">
        AUTENTICANDO COM MERCADO LIVRE...
      </p>
    </div>
  );
}
