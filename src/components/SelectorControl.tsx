// viniciusxpb/frontend/frontend-e2ff74bfb8b04c2182486c99304ae2e139575034/src/components/SelectorControl.tsx
import React, { useRef, useCallback, useState } from 'react';
import HackerModal from '@/components/HackerModal';
import { FileBrowser } from '@/components/FileBrowser'; // Importa o componente que acabamos de criar

type SelectorProps = {
  id: string;
  name: string;
  value: string;
  onChange: (id: string, path: string) => void;
  /** Se True, abre o navegador de pastas; se False, seletor de arquivos. */
  isFolderSelector: boolean; 
  placeholder?: string;
};

/**
 * Wrapper visual para campos de seleção (pasta/arquivo), que abre o FileBrowser em uma modal.
 */
export function SelectorControl({ id, name, value, onChange, isFolderSelector, placeholder }: SelectorProps) {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lógica de seleção por modal
  const handleSelectPath = useCallback((path: string) => {
    onChange(id, path);
    setIsBrowserOpen(false); // Fecha a modal após a seleção
  }, [id, onChange]);
  
  // Lógica de fallback para input file (seletor nativo - não usado no FileBrowser, mas mantido por segurança)
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedPath = e.target.value;
    if (selectedPath) {
      onChange(id, selectedPath);
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }, [id, onChange]);

  const triggerFileSelect = useCallback(() => {
    // Abre a modal de navegação
    setIsBrowserOpen(true);
  }, []);
  
  // Estilos
  const inputStyle: React.CSSProperties = {
    flexGrow: 1,
    border: 'none',
    background: 'transparent',
    padding: '4px 6px',
    color: '#c8ffdf',
    fontFamily: 'monospace',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: '12px',
    background: 'rgba(0, 77, 51, 0.5)', 
    borderColor: '#00ff99',
    color: '#00ff99',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderRight: 'none',
    borderTop: 'none',
    borderBottom: 'none',
    margin: 0,
    flexShrink: 0,
    cursor: 'pointer',
    userSelect: 'none',
  };

  return (
    <>
      <div 
        className="nodrag"
        style={{
          display: 'flex',
          border: '1px solid #00ff99', 
          background: 'rgba(0, 255, 153, 0.05)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <input
          id={`${id}-${name}`}
          type="text"
          value={value || ''}
          readOnly
          className="nodrag"
          placeholder={placeholder || `Caminho do ${name}... (Clique em 📁)`}
          style={inputStyle}
        />
        
        {/* Botão que abre a modal do FileBrowser */}
        <button
          className="nodrag hacker-btn"
          style={buttonStyle}
          onClick={triggerFileSelect} 
        >
          {isFolderSelector ? '📁' : '📄'}
        </button>

        {/* Input type=file invisível para fallback nativo (mantido) */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          {...(isFolderSelector ? { webkitdirectory: 'true', directory: 'true' } : {})}
          id={`${id}-${name}-file`} 
          style={{ display: 'none' }} 
          {...(!isFolderSelector ? { multiple: false } : {})}
        />
      </div>

      {/* Modal que contém o navegador de arquivos */}
      <HackerModal
        open={isBrowserOpen} 
        onClose={() => setIsBrowserOpen(false)}
        title={`📁 Navegar: ${name}`}
      >
        <FileBrowser
          onSelectPath={handleSelectPath}
          initialPath={value || '.'}
          isFolderPicker={isFolderSelector}
        />
      </HackerModal>
    </>
  );
}