import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

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

  useEffect(() => {
    async function processCallback() {
      if (!code) {
        navigate({ to: '/api' });
        return;
      }

      try {
        const resolvedState = state || localStorage.getItem('ml_oauth_state') || '';
        const { error } = await supabase.functions.invoke('ml-auth-callback', {
          body: { code, state: resolvedState }
        });
        if (error) throw error;
        localStorage.removeItem('ml_oauth_state');
        navigate({ to: '/api' });
      } catch (err) {
        console.error('Callback error:', err);
        navigate({ to: '/api' });
      }
    }

    processCallback();
  }, [code, state, navigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-12 h-12 text-[#CCFF00] animate-spin" />
      <p className="text-[#CCFF00] font-mono text-xl animate-pulse">
        AUTENTICANDO COM MERCADO LIVRE...
      </p>
    </div>
  );
}
