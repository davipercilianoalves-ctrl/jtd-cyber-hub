// Friendly formatter for Supabase / PostgREST errors so users see the real reason.
export function formatSupabaseError(err: unknown, fallback = "Erro inesperado."): string {
  if (!err) return fallback;
  const e = err as any;

  // Postgres error codes commonly seen via PostgREST
  const code: string | undefined = e?.code;
  const message: string | undefined = e?.message || e?.error_description;
  const details: string | undefined = e?.details;
  const hint: string | undefined = e?.hint;

  const map: Record<string, string> = {
    "23505": "Já existe um registro com esses dados (duplicado).",
    "23502": "Há um campo obrigatório não preenchido.",
    "23503": "Referência inválida — um item vinculado não existe.",
    "23514": "Um valor não atende às regras de validação.",
    "22001": "Um texto excede o tamanho permitido.",
    "22P02": "Formato de valor inválido em algum campo.",
    "42501": "Permissão negada (RLS). Você não pode realizar esta ação.",
    "P0001": message || "Operação bloqueada por regra do banco.",
    "PGRST301": "Sessão expirada — faça login novamente.",
    "PGRST116": "Nenhum registro encontrado.",
  };

  if (code && map[code]) {
    return `${map[code]}${details ? ` (${details})` : ""}`;
  }
  return message || details || hint || fallback;
}
