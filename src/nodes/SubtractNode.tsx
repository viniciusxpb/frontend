import type { NodeProps } from '@xyflow/react';

export function SubtractNode({ data }: NodeProps<{ values: number[] }>) {
  const values = data?.values ?? [0, 0];
  const result = values.slice(1).reduce((acc, v) => acc - (Number(v) || 0), Number(values[0]) || 0);

  return (
    <div className="hacker-node">
      <strong>➖ Subtrair</strong>
      <div style={{ marginTop: 6, opacity: 0.8 }}>Entrada: {values.join(' , ')}</div>
      <div style={{ marginTop: 8 }}>Resultado: <b>{result}</b></div>
    </div>
  );
}
