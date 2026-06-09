import React, { useState, useEffect, useRef } from 'react';
import { X, Tag, Move, Copy, Check, Send } from 'lucide-react';

interface FloatingKeywordPanelProps {
  title: string;
  keywords: string[];
  onClose: () => void;
  onRemoveKeyword: (keyword: string) => void;
  onAddKeyword: (keyword: string) => void;
  onSendToProduct?: (keywords: string[]) => void;
  initialX?: number;
  initialY?: number;
  isGeneral?: boolean;
}

export default function FloatingKeywordPanel({
  title,
  keywords,
  onClose,
  onRemoveKeyword,
  onAddKeyword,
  onSendToProduct,
  initialX = 100,
  initialY = 100,
  isGeneral = false
}: FloatingKeywordPanelProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [newKeyword, setNewKeyword] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const handleAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newKeyword.trim()) {
      onAddKeyword(newKeyword.trim());
      setNewKeyword("");
    }
  };

  return (
    <div
      ref={panelRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: 'fixed',
        zIndex: 100,
        width: isGeneral ? '360px' : '320px',
      }}
      className="jtd-glass flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 bg-black/95 border-primary/30"
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        className="flex cursor-move items-center justify-between border-b border-sidebar-border px-4 py-3 bg-accent/5"
      >
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Move size={14} className="text-muted-foreground opacity-50" />
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 max-h-[50vh] overflow-y-auto">
        {!isGeneral && (
          <form onSubmit={handleAdd} className="mb-4 flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Nova palavra..."
              className="flex-1 rounded border border-sidebar-border bg-accent/5 px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="rounded bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground hover:brightness-110"
            >
              ADD
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-1.5">
          {keywords.length === 0 ? (
            <p className="w-full py-4 text-center text-[10px] uppercase tracking-wider text-muted-foreground opacity-50">
              Vazio
            </p>
          ) : (
            keywords.map((kw, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary"
              >
                {kw}
                <button
                  onClick={() => onRemoveKeyword(kw)}
                  className="hover:text-foreground"
                >
                  <X size={10} />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      {onSendToProduct && keywords.length > 0 && (
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => onSendToProduct(keywords)}
            className="flex w-full items-center justify-center gap-2 rounded bg-primary/10 border border-primary/30 px-3 py-2 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors"
          >
            <Send size={12} />
            ENVIAR PARA LISTA DO PRODUTO
          </button>
        </div>
      )}
    </div>
  );
}
