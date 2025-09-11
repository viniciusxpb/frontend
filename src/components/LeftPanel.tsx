type Props = {
  onOpenModal: () => void;
};

export default function LeftPanel({ onOpenModal }: Props) {
  return (
    <aside className="leftPanel">
      Teste painel lateral
      <button className="hacker-btn" onClick={onOpenModal}>
        Abrir painel
      </button>
    </aside>
  );
}
