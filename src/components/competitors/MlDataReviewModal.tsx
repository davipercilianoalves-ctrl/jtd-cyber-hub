import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MlFetchedData } from "@/lib/mlUtils";

interface Props {
  open: boolean;
  mlbId: string;
  data: MlFetchedData;
  onConfirm: (data: MlFetchedData) => void;
  onCancel: () => void;
}

export function MlDataReviewModal({ open, mlbId, data, onConfirm, onCancel }: Props) {
  const [title, setTitle] = useState(data.title);
  const [price, setPrice] = useState(data.price);
  const [description, setDescription] = useState(data.description);

  useEffect(() => {
    if (open) {
      setTitle(data.title);
      setPrice(data.price);
      setDescription(data.description);
    }
  }, [open, data]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dados puxados do ML — {mlbId}</DialogTitle>
        </DialogHeader>
        <div className="rounded border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-500">
          ⚠️ Revise e edite antes de confirmar
        </div>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
              Título
            </label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
              Preço
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">R$</span>
              <Input
                type="number"
                step="0.01"
                value={price || ""}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
              Descrição
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onConfirm({ title, price, description })}>
            Confirmar e preencher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
