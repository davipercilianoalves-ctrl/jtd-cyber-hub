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
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div
        className="jtd-glass w-full max-w-sm p-8"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0.04)), linear-gradient(135deg, #BFFF00, #FF00FF)",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
          border: "1px solid transparent",
        }}
      >
        <div className="mb-8 text-center">
          <h1 className="jtd-text-gradient text-5xl font-extrabold tracking-tight">JTD</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#A0A0A0]">
            Gestão de E-commerce
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-[#A0A0A0]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[6px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-2.5 text-white placeholder:text-[#666] focus:border-[#BFFF00] focus:outline-none focus:ring-1 focus:ring-[#BFFF00]"
              placeholder="voce@empresa.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-[#A0A0A0]">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[6px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-2.5 pr-10 text-white placeholder:text-[#666] focus:border-[#BFFF00] focus:outline-none focus:ring-1 focus:ring-[#BFFF00]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#A0A0A0] hover:text-[#BFFF00]"
                aria-label="Mostrar senha"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#FF3366]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#BFFF00] px-4 py-2.5 font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
