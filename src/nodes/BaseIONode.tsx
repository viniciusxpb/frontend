// src/nodes/BaseIONode.tsx
import { useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position, NodeToolbar, useConnection } from '@xyflow/react';

type IOmode = 0 | 1 | 'n';

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
  console.log(`\n[BaseIONode ${id}] ========== RENDER START ==========`);
  console.log(`[BaseIONode ${id}] data COMPLETA (JSON.stringify):`, JSON.stringify(data, null, 2));
  console.log(`[BaseIONode ${id}] data.label:`, data.label);
  console.log(`[BaseIONode ${id}] data.inputsMode:`, data.inputsMode, `(type: ${typeof data.inputsMode})`);
  console.log(`[BaseIONode ${id}] data.outputsMode:`, data.outputsMode, `(type: ${typeof data.outputsMode})`);
  console.log(`[BaseIONode ${id}] data.input_fields (raw):`, data.input_fields);
  console.log(`[BaseIONode ${id}] data.input_fields type:`, typeof data.input_fields);
  console.log(`[BaseIONode ${id}] data.input_fields is Array.isArray():`, Array.isArray(data.input_fields));
  console.log(`[BaseIONode ${id}] data.onChange exists:`, !!data.onChange);
  console.log(`[BaseIONode ${id}] data.onChange type:`, typeof data.onChange);

  const connection = useConnection();
  const isTargetOrigin = connection.inProgress && connection.fromNode?.id === id;

  const inCount = 1;
  const outCount = 1;
  const inOffsetY = 0;
  const outOffsetY = 0;

  const firstTextInputField = useMemo(() => {
    console.log(`\n[BaseIONode ${id}] useMemo START`);
    console.log(`[BaseIONode ${id}] input_fields no useMemo:`, data.input_fields);
    
    if (!data.input_fields) {
      console.log(`[BaseIONode ${id}] ❌ input_fields é falsy (null/undefined/etc)`);
      return undefined;
    }

    console.log(`[BaseIONode ${id}] input_fields passou no falsy check`);

    if (!Array.isArray(data.input_fields)) {
      console.log(`[BaseIONode ${id}] ❌ input_fields NÃO é array! É:`, typeof data.input_fields, data.input_fields);
      return undefined;
    }

    console.log(`[BaseIONode ${id}] ✅ input_fields é um array com ${data.input_fields.length} items`);
    console.log(`[BaseIONode ${id}] Items do array:`, data.input_fields.map((f) => `{name:"${f.name}", type:"${f.type}"}`));

    const field = data.input_fields.find((f) => {
      console.log(`[BaseIONode ${id}]   → Procurando... f.type="${f.type}" === "text"?`, f.type === 'text');
      return f.type === 'text';
    });

    console.log(`[BaseIONode ${id}] ✅ Field encontrado:`, field);
    return field;
  }, [data.input_fields, id]);

  console.log(`[BaseIONode ${id}] firstTextInputField (após useMemo):`, firstTextInputField);
  console.log(`[BaseIONode ${id}] typeof data.onChange:`, typeof data.onChange);
  
  const showValueInput = !!firstTextInputField && typeof data.onChange === 'function';
  console.log(`[BaseIONode ${id}] showValueInput = !!firstTextInputField && typeof data.onChange === 'function'`);
  console.log(`[BaseIONode ${id}]              = !!${!!firstTextInputField} && ${typeof data.onChange === 'function'}`);
  console.log(`[BaseIONode ${id}]              = ${showValueInput}`);
  console.log(`[BaseIONode ${id}] ========== RENDER END ==========\n`);

  return (
    <>
      <NodeToolbar isVisible={isTargetOrigin} position={data.toolbarPosition ?? Position.Top}>
        <button className="xy-theme__button">cut</button>
        <button className="xy-theme__button">copy</button>
        <button className="xy-theme__button">
          <img src="/src/assets/icons/wire_cutter.svg" alt="Wire Cutter" style={{ width: 16, height: 16 }} />
        </button>
      </NodeToolbar>
      <div className="hacker-node base-io">
        <strong>{data.label ?? 'Node'}</strong>
        {showValueInput ? (
          <div style={{ marginTop: '4px' }}>
            <input
              id={`${id}-${firstTextInputField!.name}`}
              type="text"
              value={data.value ?? ''}
              className="nodrag"
              onChange={(e) => data.onChange?.(id, e.target.value)}
              placeholder={`Enter ${firstTextInputField!.name}...`}
              style={{ display: 'block', width: 'calc(100% - 10px)', padding: '4px' }}
            />
          </div>
        ) : (
          <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.5, color: '#888' }}>
            (showValueInput = {String(showValueInput)})
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