// src/nodes/registry.ts
// Este arquivo agora define os tipos e mapeia os componentes React,
// mas a lista de nodes disponíveis (palette) virá do backend.

import { TextUpdaterNode } from '@/nodes/TextUpdaterNode';
import { AddNode } from '@/nodes/AddNode';
import { SubtractNode } from '@/nodes/SubtractNode';
// Importe aqui os componentes React para os outros tipos de node quando criá-los
// Ex: import { LoadCheckpointNode } from '@/nodes/LoadCheckpointNode';

// Este tipo deve incluir todas as chaves ('type') que o backend pode enviar
export type NodeTypeKey =
  | 'textUpdater'
  | 'add'
  | 'subtract'
  | 'loadCheckpoint'
  | 'emptyLatentImage'
  | 'listDirectory'
  | 'ksampler'; // Adicionado ksampler

// Mapeamento dos tipos ('type' vindo do backend) para os componentes React
export const nodeTypes = {
  textUpdater: TextUpdaterNode,
  add: AddNode,
  subtract: SubtractNode,
  // Adicione os outros mapeamentos quando os componentes existirem
  // loadCheckpoint: LoadCheckpointNode,
  // emptyLatentImage: EmptyLatentImageNode,
  // listDirectory: ListDirectoryNode,
  // ksampler: KSamplerNode, // Exemplo
};

// Interface que define a estrutura de cada item na lista de nodes
// que o backend envia via WebSocket (mensagem NODE_CONFIG).
export interface NodePaletteItem {
  type: NodeTypeKey; // Garante que o tipo vindo do backend existe no nosso mapeamento
  label: string;
  defaultData: any; // Usamos 'any' para os dados default por flexibilidade
}