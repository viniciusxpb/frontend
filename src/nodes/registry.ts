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
  { type: 'add',         label: '➕ Somar',     defaultData: { inputs: ['in_0'] } },
  { type: 'subtract',    label: '➖ Subtrair',  defaultData: { inputs: ['in_0'] } },
];
