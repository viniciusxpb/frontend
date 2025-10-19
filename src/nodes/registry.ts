// src/nodes/registry.ts
// Este arquivo agora SÓ define a interface para os dados que vêm do backend.
// Não há mais mapeamento estático para componentes React aqui.

// Interface que define a estrutura de cada item na lista de nodes
// que o backend envia via WebSocket (mensagem NODE_CONFIG).
export interface NodePaletteItem {
  type: string; // Agora é apenas string, React Flow cuidará do mapeamento
  label: string;
  defaultData: any; // Mantemos any para flexibilidade
}

// O tipo NodeTypeKey e a constante nodeTypes foram REMOVIDOS.