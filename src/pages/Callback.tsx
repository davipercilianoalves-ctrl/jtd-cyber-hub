import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  useEffect(() => {
    async function processCallback() {
      if (!code) {
        console.error('No code found in URL');
        navigate('/api');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('ml-auth-callback', {
          method: 'GET',
          queryParams: { code }
        });

        if (error) throw error;
        
        navigate('/api');
      } catch (err) {
        console.error('Error during ML authentication:', err);
        navigate('/api');
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
