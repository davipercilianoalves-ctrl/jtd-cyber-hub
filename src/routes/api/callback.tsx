import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export const Route = createFileRoute('/api/callback')({
  component: CallbackComponent,
});

function CallbackComponent() {
  const { code } = Route.useSearch<{ code?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    async function processCallback() {
      if (!code) {
        console.error('No code found in URL');
        navigate({ to: '/api' });
        return;
      }

      try {
        const { error } = await supabase.functions.invoke('ml-auth-callback', {
          method: 'POST', // Changed to POST as per standard Edge Function invocation, but we pass params in URL if needed
          body: { code } // Passing code in body since invoke doesn't have queryParams property in this version
        });

        if (error) throw error;
        
        navigate({ to: '/api' });
      } catch (err) {
        console.error('Error during ML authentication:', err);
        navigate({ to: '/api' });
      }
    }

    processCallback();
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-12 h-12 text-[#CCFF00] animate-spin" />
      <p className="text-[#CCFF00] font-mono text-xl animate-pulse">
        AUTENTICANDO COM MERCADO LIVRE...
      </p>
    </div>
  );
}
