import type { NodeProps } from '@xyflow/react';

export function AddNode({ data }: NodeProps<{ values: number[] }>) {
  const values = data?.values ?? [0, 0];
  const sum = values.reduce((a, b) => a + (Number(b) || 0), 0);

  return (
    <div className="hacker-node">
      <strong>➕ Somar</strong>
      <div style={{ marginTop: 6, opacity: 0.8 }}>Entrada: {values.join(' , ')}</div>
      <div style={{ marginTop: 8 }}>Resultado: <b>{sum}</b></div>
    </div>
  );
}
