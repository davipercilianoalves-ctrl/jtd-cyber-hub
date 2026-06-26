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
      toast.error("Não foi possível buscar dados deste anúncio");
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
        title={id ? `Buscar ${id} no ML` : "Cole um link válido do Mercado Livre"}
        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
