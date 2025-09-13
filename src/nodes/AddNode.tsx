import type { NodeProps } from '@xyflow/react';
import { BaseIONode, type BaseNodeData } from './BaseIONode';

/**
 * Novo AddNode usando BaseIONode
 * - As entradas são controladas por (data.inputsMode === "n") e (data.inputsCount)
 * - O FlowInner normaliza automaticamente inputsCount = (entradas usadas) + 1
 * - Saída: 1 (out_0)
 */
type AddData = BaseNodeData & {
  // campos específicos (se precisar no futuro)
};

export function AddNode(props: NodeProps<AddData>) {
  const { data } = props;

  return (
    <BaseIONode
      {...props}
      data={{
        label: data.label ?? '➕ Somar',
        value: data.value ?? '',
        inputsMode: data.inputsMode ?? 'n',  // múltiplas entradas dinâmicas
        inputsCount: data.inputsCount ?? 1,  // FlowInner ajusta isso com base nos edges
        outputsMode: data.outputsMode ?? 1,  // uma saída (out_0)
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
