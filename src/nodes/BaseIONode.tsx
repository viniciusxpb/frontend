import { useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position, NodeToolbar, useConnection } from "@xyflow/react";

type IOmode = 0 | 1 | "n";

// Adicionando a interface que faltou
interface InputField {
  name: string;
  type: string;
}

export interface BaseNodeData {
  label?: string;
  value?: string;
  inputsMode?: IOmode;
  outputsMode?: IOmode;
  inputsCount?: number;
  outputsCount?: number;
  onChange?: (id: string, val: string) => void;
  toolbarPosition?: Position;
  input_fields?: InputField[];
}

type BaseProps = NodeProps<BaseNodeData> & { children?: React.ReactNode };

export function BaseIONode({ id, data, children }: BaseProps) {
  const connection = useConnection();
  const isTargetOrigin = connection.inProgress && connection.fromNode?.id === id;

  // --- DEBUG: Comenta os useMemo e usa valores fixos ---
  // const inputsMode = data.inputsMode ?? 1;
  // const outputsMode = data.outputsMode ?? 1;

  // const inCount = useMemo(() => {
  //   if (inputsMode === 0) return 0;
  //   if (inputsMode === 1) return 1;
  //   return Math.max(data.inputsCount ?? 1, 1);
  // }, [inputsMode, data.inputsCount]);

  // const outCount = useMemo(() => {
  //   if (outputsMode === 0) return 0;
  //   if (outputsMode === 1) return 1;
  //   return Math.max(data.outputsCount ?? 1, 1);
  // }, [outputsMode, data.outputsCount]);

  const inCount = 1; // Fixo para debug
  const outCount = 1; // Fixo para debug
  // --- FIM DEBUG ---

  const inOffsetY = 0; // Fixo para debug
  const outOffsetY = 0; // Fixo para debug

  const firstTextInputField = useMemo(() =>
    data.input_fields?.find(field => field.type === 'text')
  , [data.input_fields]);

  const showValueInput = firstTextInputField && typeof data.onChange === 'function';

  return (
    <>
      <NodeToolbar isVisible={isTargetOrigin} position={data.toolbarPosition ?? Position.Top}>
        <button className="xy-theme__button">cut</button>
        <button className="xy-theme__button">copy</button>
        <button className="xy-theme__button">
          <img src="/src/assets/icons/wire_cutter.svg" alt="Wire Cutter" style={{ width: 16, height: 16 }}/>
        </button>
      </NodeToolbar>
      <div className="hacker-node base-io">
        <strong>{data.label ?? "Node"}</strong>
        {showValueInput && (
            <div style={{ marginTop: '4px' }}>
              <input
                id={`${id}-${firstTextInputField!.name}`}
                type="text"
                value={data.value ?? ""}
                className="nodrag"
                onChange={(e) => data.onChange?.(id, e.target.value)}
                style={{ display: 'block', width: 'calc(100% - 10px)' }}
              />
            </div>
        )}
        {children}

        {Array.from({ length: inCount }).map((_, i) => (
          <Handle
            key={`in_${i}`}
            id={`in_${i}`}
            type="target"
            position={Position.Left}
            style={{ transform: `translateY(${i * inOffsetY}px)` }}
          />
        ))}
        {Array.from({ length: outCount }).map((_, i) => (
          <Handle
            key={`out_${i}`}
            id={`out_${i}`}
            type="source"
            position={Position.Right}
            style={{ transform: `translateY(${i * outOffsetY}px)` }}
          />
        ))}
      </div>
    </>
  );
}