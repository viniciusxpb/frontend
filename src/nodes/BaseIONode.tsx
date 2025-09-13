import { useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";

type IOmode = 0 | 1 | "n";

export interface BaseNodeData {
  label?: string;
  value?: string;
  inputsMode?: IOmode;   // 0, 1 ou "n"
  outputsMode?: IOmode;  // 0, 1 ou "n"
  inputsCount?: number;
  outputsCount?: number;
  onChange?: (id: string, val: string) => void;
}

export function BaseIONode({ id, data }: NodeProps<BaseNodeData>) {
  const inputsMode = data.inputsMode ?? 1;
  const outputsMode = data.outputsMode ?? 1;

  const inCount = useMemo(() => {
    if (inputsMode === 0) return 0;
    if (inputsMode === 1) return 1;
    return data.inputsCount ?? 1;
  }, [inputsMode, data.inputsCount]);

  const outCount = useMemo(() => {
    if (outputsMode === 0) return 0;
    if (outputsMode === 1) return 1;
    return data.outputsCount ?? 1;
  }, [outputsMode, data.outputsCount]);

  return (
    <div className="hacker-node base-io">
      <strong>{data.label ?? "Node"}</strong>

      <input
        type="text"
        value={data.value ?? ""}
        className="nodrag"
        onChange={(e) => data.onChange?.(id, e.target.value)}
      />

      {/* Entradas (esquerda) */}
      {Array.from({ length: inCount }).map((_, i) => (
        <Handle
          key={`in_${i}`}
          id={`in_${i}`}
          type="target"
          position={Position.Left}
          style={{ top: 40 + i * 20 }}
        />
      ))}

      {/* Saídas (direita) */}
      {Array.from({ length: outCount }).map((_, i) => (
        <Handle
          key={`out_${i}`}
          id={`out_${i}`}
          type="source"
          position={Position.Right}
          style={{ top: 40 + i * 20 }}
        />
      ))}
    </div>
  );
}
