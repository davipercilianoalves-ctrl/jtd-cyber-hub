import { Plug, CheckCircle, RefreshCcw, LogOut, ExternalLink, Loader2 } from "lucide-react";
import { useMercadoLivre } from "@/hooks/useMercadoLivre";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function API() {
  const [token, setToken] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const { getUserInfo } = useMercadoLivre();

  const clientId = "6630631570819220";
  const redirectUri = "https://acid-nexus-jtd.lovable.app/api/callback";

  async function handleConnect() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Você precisa estar autenticado para conectar.");
      return;
    }
    // Use an opaque random nonce as state (CSRF protection) — never the access token.
    const nonce = crypto.randomUUID();
    sessionStorage.setItem('ml_oauth_state', nonce);
    const url = `https://auth.mercadolivre.com.br/authorization?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${encodeURIComponent(nonce)}`;
    window.location.href = url;
  }

  useEffect(() => {
    fetchToken();
  }, []);

  async function fetchToken() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ml_tokens')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      setToken(data);
    } catch (err) {
      console.error("Error fetching token:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTestConnection() {
    if (!token) return;
    setTesting(true);
    setTestResult(null);
    try {
      const userInfo = await getUserInfo(token.user_id);
      setTestResult(userInfo);
      toast.success("Conexão testada com sucesso!");
    } catch (err: any) {
      console.error("Error testing connection:", err);
      toast.error("Falha ao testar conexão: " + err.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    try {
      const { error } = await supabase
        .from('ml_tokens')
        .delete()
        .eq('id', token.id);
      
      if (error) throw error;
      setToken(null);
      setTestResult(null);
      toast.success("Desconectado com sucesso");
    } catch (err: any) {
      toast.error("Erro ao desconectar: " + err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#CCFF00]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="jtd-glass p-8 transition-all duration-200">
        {!token ? (
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="rounded-full border border-[#CCFF00]/30 bg-[#CCFF00]/5 p-8">
              <Plug size={72} className="text-[#CCFF00]" strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">Conectar Mercado Livre</h2>
              <p className="text-muted-foreground">Conecte sua conta para puxar vendas e métricas</p>
            </div>
            <Button 
              className="w-full max-w-md bg-[#CCFF00] text-black hover:bg-[#B3E600] font-bold py-6 text-lg"
              onClick={handleConnect}
            >
              CONECTAR COM MERCADO LIVRE
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-green-500 border border-green-500/20">
                  <CheckCircle size={20} />
                  <span className="font-bold text-sm">✓ Conectado ao Mercado Livre</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                onClick={handleDisconnect}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">User ID da conta ML</p>
                <p className="text-xl font-bold text-foreground font-mono">{token.user_id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">Data de expiração</p>
                <p className="text-xl font-bold text-foreground font-mono">
                  {new Date(token.expires_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center gap-4 mb-6">
                <Button 
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="bg-muted/15 text-foreground hover:bg-muted/25"
                >
                  {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                  Testar Conexão
                </Button>
              </div>

              {testResult && (
                <div className="rounded-lg bg-muted/40 border border-white/10 p-6 font-mono text-sm space-y-2 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[#CCFF00] border-b border-[#CCFF00]/20 pb-2 mb-4 text-xs">RESULTADO DO TESTE (/users/me)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <p><span className="text-muted-foreground">Apelido:</span> {testResult.nickname}</p>
                    <p><span className="text-muted-foreground">Nome:</span> {testResult.first_name} {testResult.last_name}</p>
                    <p><span className="text-muted-foreground">E-mail:</span> {testResult.email}</p>
                    <p><span className="text-muted-foreground">País:</span> {testResult.country_id}</p>
                    <p><span className="text-muted-foreground">Tipo de Usuário:</span> {testResult.user_type}</p>
                    <p className="flex items-center gap-2">
                      <span className="text-muted-foreground">Link:</span>
                      <a href={testResult.permalink} target="_blank" rel="noreferrer" className="text-[#CCFF00] hover:underline flex items-center gap-1">
                        Ver perfil <ExternalLink size={12} />
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="jtd-glass p-6 opacity-50">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-[0.2em] mb-4">Informações de Segurança</h3>
        <ul className="text-[10px] font-mono text-muted-foreground space-y-2 uppercase">
          <li>• Client Secret armazenado exclusivamente em ambiente seguro (Edge Functions)</li>
          <li>• Todo tráfego roteado via proxy criptografado</li>
          <li>• Tokens de acesso nunca expostos ao cliente local</li>
        </ul>
      </div>
    </div>
  );
}
