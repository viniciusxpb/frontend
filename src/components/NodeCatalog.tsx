// src/components/NodeCatalog.tsx
import { useMemo, useState } from 'react';
import { type NodePaletteItem } from '@/nodes/registry'; // Importa o tipo

type Props = {
  onPick: (type: string) => void;
  nodePalette: NodePaletteItem[]; // Recebe a palette como prop
};

export default function NodeCatalog({ onPick, nodePalette }: Props) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    // Usa a prop nodePalette (pode estar vazia inicialmente)
    if (!s) return nodePalette;
    return nodePalette.filter(n => n.label.toLowerCase().includes(s));
  }, [q, nodePalette]); // Depende da prop

  return (
    <div>
      <input
        className="nodrag"
        placeholder="Buscar node..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ width: '100%', marginBottom: 12 }}
      />

      <div className="node-palette">
        {/* Renderiza a lista filtrada que veio da prop */}
        {filtered.map((item) => (
          <button
            key={item.type}
            className="hacker-btn"
            style={{ width: '100%' }}
            onClick={() => onPick(item.type)}
          >
            {item.label}
          </button>
        ))}
        {/* Mostra mensagem se a lista (ou filtrada) estiver vazia */}
        {nodePalette.length > 0 && filtered.length === 0 && (
          <div style={{ opacity: .7, fontSize: 12 }}>Nada encontrado…</div>
        )}
        {/* Mostra mensagem enquanto a palette não chega */}
        {nodePalette.length === 0 && (
           <div style={{ opacity: .7, fontSize: 12 }}>Carregando nodes do backend...</div>
        )}
      </div>
    </div>
  );
}