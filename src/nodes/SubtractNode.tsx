import type { NodeProps } from '@xyflow/react';
import { BaseIONode, type BaseNodeData } from './BaseIONode';

/**
 * Novo SubtractNode usando BaseIONode
 * - Mesmo esquema do AddNode: entradas dinâmicas pelo FlowInner
 * - Saída única (out_0)
 */
type SubtractData = BaseNodeData & {};

export function SubtractNode(props: NodeProps<SubtractData>) {
  const { data } = props;

  return (
    <BaseIONode
      {...props}
      data={{
        label: data.label ?? '➖ Subtrair',
        value: data.value ?? '',
        inputsMode: data.inputsMode ?? 'n',
        inputsCount: data.inputsCount ?? 1,
        outputsMode: data.outputsMode ?? 1,
        outputsCount: data.outputsCount ?? 1,
        onChange: data.onChange,
      }}
    >
      <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
        Entradas: {data.inputsCount ?? 1} (autoexpansíveis)
      </div>
    </BaseIONode>
  );
}
