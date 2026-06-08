// Formulário de login — email + senha, sem cadastro
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Credenciais inválidas.");
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div 
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background: "radial-gradient(ellipse at center, #0D0D0D 0%, #000000 100%)"
      }}
    >
      <div
        className="w-full max-w-sm p-8"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          borderRadius: "12px",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)"
        }}
      >
        <div className="mb-8 text-center">
          <h1 
            className="jtd-text-gradient text-6xl font-[800] tracking-tight"
            style={{
              background: "linear-gradient(90deg, #BFFF00 0%, #00FFFF 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            JTD
          </h1>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.4em] text-[#A0A0A0]">
            Gestão de E-commerce
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#A0A0A0]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[6px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-4 py-3 text-sm text-white placeholder:text-[#666666] focus:border-[#BFFF00] focus:outline-none transition-colors"
              placeholder="Digite seu email"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#A0A0A0]">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[6px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-4 py-3 text-sm text-white placeholder:text-[#666666] focus:border-[#BFFF00] focus:outline-none transition-colors pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#A0A0A0] hover:text-[#BFFF00] transition-colors"
                aria-label="Mostrar senha"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-[#FF3366] animate-pulse">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#BFFF00] px-4 py-3 text-sm font-[700] text-[#000000] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            ENTRAR
          </button>
        </form>
      </div>
    </div>
  );
}
