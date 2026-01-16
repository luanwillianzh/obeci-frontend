"use client";

/**
 * `src/components/ui/Modal.tsx`
 *
 * Propósito geral:
 * - Modal genérico (overlay + conteúdo) reutilizável.
 * - Suporta fechamento por:
 *   - clique no overlay
 *   - tecla `Escape`
 *   - botão “×”
 *
 * Observação:
 * - Não implementa focus trap (acessibilidade avançada). Se isso for requisito,
 *   deve ser tratado em evolução futura.
 */
import { ReactNode, useEffect } from "react";
import styles from "./Modal.module.css";

export interface ModalProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Componente de modal controlado.
 *
 * Entrada:
 * - `isOpen`: controla visibilidade
 * - `onClose`: callback para fechar
 * - `children`: conteúdo
 */
export default function Modal({
  isOpen,
  title,
  onClose,
  children,
}: ModalProps) {
  /**
   * Listener de teclado para fechar no `Escape` enquanto o modal estiver aberto.
   */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // Click no overlay fecha; click no conteúdo é interrompido.
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeBtn}
          aria-label="Fechar"
          onClick={onClose}
        >
          ×
        </button>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
