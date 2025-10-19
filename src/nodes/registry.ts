// src/nodes/registry.ts
import { TextUpdaterNode } from '@/nodes/TextUpdaterNode';
import { AddNode } from '@/nodes/AddNode';
import { SubtractNode } from '@/nodes/SubtractNode';
// Importe os outros componentes aqui quando existirem
// import { LoadCheckpointNode } from '@/nodes/LoadCheckpointNode';
// import { EmptyLatentImageNode } from '@/nodes/EmptyLatentImageNode';
// import { ListDirectoryNode } from '@/nodes/ListDirectoryNode';
// import { KSamplerNode } from '@/nodes/KSamplerNode';

export type NodeTypeKey =
  | 'textUpdater'
  | 'add'
  | 'subtract'
  | 'loadCheckpoint'
  | 'emptyLatentImage'
  | 'listDirectory'
  | 'ksampler';

export const nodeTypes = {
  textUpdater: TextUpdaterNode,
  add: AddNode,
  subtract: SubtractNode,
  // Adicione os outros mapeamentos aqui
  // loadCheckpoint: LoadCheckpointNode,
  // emptyLatentImage: EmptyLatentImageNode,
  // listDirectory: ListDirectoryNode,
  // ksampler: KSamplerNode,
};

export interface NodePaletteItem {
  type: NodeTypeKey;
  label: string;
  defaultData: any;
}