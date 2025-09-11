type Props = { onOpenModal: () => void };

export default function LeftPanel({ onOpenModal }: Props) {
  return (
    <aside className="leftPanel">
      <div style={{ marginBottom: 10, opacity: .9 }}>⚙️ Ações</div>
      <button className="hacker-btn" onClick={onOpenModal}>Abrir painel</button>
    </aside>
  );
}
