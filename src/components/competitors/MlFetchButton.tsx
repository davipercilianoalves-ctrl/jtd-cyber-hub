import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { extractMlbId, fetchMlItemData, type MlFetchedData } from "@/lib/mlUtils";
import { MlDataReviewModal } from "./MlDataReviewModal";

interface Props {
  linkValue: string;
  onDataFetched: (data: MlFetchedData) => void;
  disabled?: boolean;
}

export function MlFetchButton({ linkValue, onDataFetched, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [fetched, setFetched] = useState<MlFetchedData | null>(null);
  const [mlbId, setMlbId] = useState("");

  const id = extractMlbId(linkValue);
  const isDisabled = disabled || loading || !id;

  const handleClick = async () => {
    if (!id) return;
    setLoading(true);
    setMlbId(id);
    const data = await fetchMlItemData(id);
    setLoading(false);
    if (!data) {
      toast.error(
        "Não foi possível buscar este anúncio. Verifique se o link é de um produto ativo no ML ou preencha os dados manualmente.",
        { duration: 5000 }
      );
      return;
    }
    setFetched(data);
    setModalOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        title={
          id
            ? `Buscar ${id} no ML`
            : "URL não contém ID de produto MLB válido — use a URL da página do produto"
        }
        className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          !id && linkValue
            ? "border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
            : "border-primary/40 text-primary hover:bg-primary/10"
        }`}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
        Buscar ML
      </button>
      {fetched && (
        <MlDataReviewModal
          open={modalOpen}
          mlbId={mlbId}
          data={fetched}
          onConfirm={(d) => {
            setModalOpen(false);
            onDataFetched(d);
            toast.success("Dados do concorrente preenchidos");
          }}
          onCancel={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
