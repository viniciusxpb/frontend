import { TextUpdaterNode } from './TextUpdaterNode';
import { AddNode } from './AddNode';
import { SubtractNode } from './SubtractNode';

export type NodeTypeKey = 'textUpdater' | 'add' | 'subtract';

export const nodeTypes = {
  textUpdater: TextUpdaterNode,
  add: AddNode,
  subtract: SubtractNode,
};

export const nodePalette: Array<{
  type: NodeTypeKey;
  label: string;
  defaultData: any;
}> = [
  { type: 'textUpdater', label: '📝 Texto',     defaultData: { label: 'Novo texto' } },

  // IMPORTANTE: agora usamos inputs dinâmicos por contagem (não mais array de ids)
  { type: 'add',         label: '➕ Somar',     defaultData: { label: '➕ Somar',     inputsMode: 'n', inputsCount: 1, outputsMode: 1, outputsCount: 1 } },
  { type: 'subtract',    label: '➖ Subtrair',  defaultData: { label: '➖ Subtrair',  inputsMode: 'n', inputsCount: 1, outputsMode: 1, outputsCount: 1 } },
];
