import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';

type AddData = {
  inputs: string[];    // ['in_0', 'in_1', ...]
};

export function AddNode({ data }: NodeProps<AddData>) {
  const inputs = data?.inputs ?? ['in_0'];

  return (
    <div className="hacker-node">
      <strong>➕ Somar</strong>

      {/* Entradas dinâmicas à esquerda */}
      {inputs.map((id, idx) => (
        <Handle
          key={id}
          type="target"
          id={id}
          position={Position.Left}
          style={{ top: 28 + idx * 18 }}
        />
      ))}

      {/* Saída única à direita */}
      <Handle type="source" id="out" position={Position.Right} />

      <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
        Entradas: {inputs.length} (autoexpansíveis)
      </div>
    </div>
  );
}
