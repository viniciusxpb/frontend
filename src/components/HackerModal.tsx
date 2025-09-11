import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function HackerModal({
  open,
  title = "⚡ Painel Hacker",
  onClose,
  children,
}: Props) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && contentRef.current) contentRef.current.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="hacker-modal-backdrop"
      onMouseDown={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="hacker-modal-title"
    >
      <div
        className="hacker-modal"
        ref={contentRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="hacker-modal-header">
          <h3 id="hacker-modal-title">{title}</h3>
          <button
            className="hacker-btn ghost"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            ✖
          </button>
        </div>
        <div className="hacker-modal-body">{children}</div>
      </div>
    </div>
  );
}
