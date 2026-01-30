"use client";

/**
 * `src/app/protected/instrumento/page.tsx`
 *
 * Propósito geral:
 * - Editor visual de “Instrumento / Processo Documental” por turma.
 * - Permite criar e editar uma sequência de slides contendo:
 *   - caixas de texto posicionáveis
 *   - imagens (upload/resize/rotate/crop)
 *   - estilos básicos (fonte, tamanho, alinhamento, marcação/cor)
 *
 * Integração com backend:
 * - Quando existe `t` na querystring (turmaId), tenta carregar e salvar via API:
 *   - `Requests.getInstrumentoByTurma(turmaId)` para carregar
 *   - `Requests.saveInstrumento(...)` / `Requests.createInstrumento(...)` para persistir
 * - Na ausência de `turmaId`, usa fallback em `localStorage`.
 *
 * Pontos críticos de lógica:
 * - Arquivo grande com muitos handlers; os comentários estão organizados por seções.
 * - Existem estilos inline e cores hard-coded (ex.: `#f8894a`) em alguns modais/controles;
 *   idealmente isso deveria ser tokenizado via CSS/tema, mas aqui não refatoramos.
 *
 * Se algo não estiver claro:
 * - `StorageService` está descrito como “futuro”, porém não parece ser usado no fluxo principal.
 * - Há TODOs indicando migração de persistência para API; parte disso já foi implementada via `Requests`.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Requests } from "@/contexts/ApiRequests";
import { Client, type IMessage } from "@stomp/stompjs";
import "./publication.css";

type InstrumentoChangeLogDto = {
  id: number;
  instrumentoId: number;
  turmaId: number;
  actor: string;
  eventType: string;
  summary: string;
  payloadJson?: string;
  createdAt: unknown;
};

type InstrumentoWsUpdateBroadcast = {
  instrumentoId: number;
  turmaId: number;
  slides: unknown;
  version: number;
  actor: string;
  updatedAt: string;
  clientId?: string;
  logEntry?: InstrumentoChangeLogDto;
};

type InstrumentoWsError = {
  code: string;
  message: string;
  turmaId?: number;
  clientId?: string;
  at?: string;
};

function isUserVisibleChangeLog(e: InstrumentoChangeLogDto): boolean {
  const eventType = (e.eventType || "").toUpperCase();
  if (eventType.startsWith("INTERNAL_")) return false;

  const summary = (e.summary || "").toLowerCase();
  // Não mostrar mensagens internas/erros no painel de log.
  if (summary.includes("retry")) return false;
  if (summary.includes("conflito de versão")) return false;
  if (summary.includes("version_conflict")) return false;
  if (summary.startsWith("erro")) return false;
  if (summary.includes("falha") && summary.includes("salvar")) return false;
  return true;
}

function buildWsUrlFromApiBase(apiBase: string): string {
  const u = new URL(apiBase);
  const protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${u.host}/ws`;
}

function getClientId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = typeof crypto !== "undefined" ? crypto : null;
    if (c?.randomUUID) return c.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatAt(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }
  if (Array.isArray(value)) {
    // Suporta LocalDateTime serializado como array: [YYYY,MM,DD,HH,mm,ss,...]
    const [y, m, d, hh = 0, mm = 0, ss = 0] = value as number[];
    if (
      typeof y === "number" &&
      typeof m === "number" &&
      typeof d === "number"
    ) {
      return new Date(y, m - 1, d, hh, mm, ss).toLocaleString();
    }
  }
  return String(value);
}

function parseVersionConflictMessage(msg: string): {
  expected?: number;
  actual?: number;
} {
  if (!msg) return {};
  // Ex.: "Versão desatualizada. expected=20 actual=21"
  const expectedMatch = msg.match(/expected\s*=\s*(\d+)/i);
  const actualMatch = msg.match(/actual\s*=\s*(\d+)/i);
  const expected = expectedMatch ? parseInt(expectedMatch[1], 10) : undefined;
  const actual = actualMatch ? parseInt(actualMatch[1], 10) : undefined;
  return {
    expected: Number.isFinite(expected as number) ? expected : undefined,
    actual: Number.isFinite(actual as number) ? actual : undefined,
  };
}

// ============================================================================
// STORAGE SERVICE - Camada abstrata para persistência (localStorage ou API)
// ============================================================================

const STORAGE_KEY = "publication_slides";

/**
 * Interface para resposta da API (futuro)
 * Padrão RESTful com status e data
 */
interface StorageResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Serviço de Storage - Abstração para localStorage/API
 * Futuro: trocar implementação para chamadas HTTP sem mudar o resto do código
 */
const StorageService = {
  /**
   * Carrega publicação
   * Futuro: GET /api/publications
   */
  async loadPublication(): Promise<Slide[] | null> {
    try {
      if (typeof window === "undefined") return null;

      // TODO: Futuro - trocar para:
      // const response = await fetch('/api/publications');
      // const result: StorageResponse<Slide[]> = await response.json();
      // return result.success ? result.data : null;

      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Erro ao carregar publicação:", error);
      return null;
    }
  },

  /**
   * Salva publicação
   * Futuro: POST /api/publications
   */
  async savePublication(slides: Slide[]): Promise<boolean> {
    try {
      if (typeof window === "undefined") return false;
      // TODO: Futuro - trocar para:
      return true;
    } catch (error) {
      console.error("Erro ao salvar publicação:", error);
      return false;
    }
  },
};

// ============================================================================
// Tipos principais usados no editor
// ============================================================================
interface TextBox {
  id: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  rotation?: number;
  zIndex?: number;
  locked?: boolean;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textAlign?: "left" | "center" | "right" | "justify";
  color?: string;
}

interface SlideImage {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  rotation?: number;
  zIndex?: number;
  locked?: boolean;
}

interface Slide {
  id: number;
  content: string;
  styles?: {
    fontSize?: string | number;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    fontFamily?: string;
  };
  textBoxes: TextBox[];
  images: SlideImage[];
  instrument?: string;
  tags?: string[];
}

type SlideItemProps = {
  slide: Slide;
  isActive: boolean;
  onContentChange: (id: number, newContent: string) => void;
  onTextBoxChange: (slideId: number, boxId: number, content: string) => void;
  onTextBoxMove: (slideId: number, boxId: number, x: number, y: number) => void;
  onTextBoxResize: (
    slideId: number,
    boxId: number,
    width: number,
    height: number
  ) => void;
  onImageMove: (slideId: number, imgId: number, x: number, y: number) => void;
  onImageResize: (
    slideId: number,
    imgId: number,
    width: number,
    height: number
  ) => void;
  onTextBoxRotate: (slideId: number, boxId: number, deg: number) => void;
  onImageRotate: (slideId: number, imgId: number, deg: number) => void;
  onTextBoxZIndex: (slideId: number, boxId: number, z: number) => void;
  onImageZIndex: (slideId: number, imgId: number, z: number) => void;
  onImageCrop: (slideId: number, imgId: number) => void;
  onImageDelete: (slideId: number, imgId: number) => void;
  onTextBoxDelete: (slideId: number, boxId: number) => void;
  onFocus: (id: number) => void;
  onTextBoxSelect: (slideId: number, boxId: number) => void;
  onImageSelect: (slideId: number, imgId: number) => void;
  onTextBoxSaveSelection: (range: Range) => void;
  selectedTextBox: { slideId: number; boxId: number } | null;
  selectedImage: { slideId: number; imgId: number } | null;
  onBackgroundClick: () => void;
};

// ============================================================================
// Wrappers síncronos para carregar/salvar no localStorage
// ============================================================================
function loadPublicationFromStorage(): Slide[] | null {
  try {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Slide[]) : null;
  } catch (e) {
    console.error("Erro ao ler localStorage:", e);
    return null;
  }
}

function savePublicationToStorage(slides: Slide[]): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slides));
  } catch (e) {
    console.error("Erro ao salvar localStorage:", e);
  }
}

// ============================================================================
// ImageCropper - Recorte simples de imagem com seleção arrastável
// ============================================================================
const ImageCropper = ({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [displaySrc, setDisplaySrc] = useState<string>(src);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [crop, setCrop] = useState({ x: 20, y: 20, width: 200, height: 150 });

  /** Inicia o arraste da área de recorte (drag). */
  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    const localX = rect ? e.clientX - rect.left : e.clientX;
    const localY = rect ? e.clientY - rect.top : e.clientY;
    setDragOffset({ x: localX - crop.x, y: localY - crop.y });
    setIsDragging(true);
  };

  /** Inicia o resize do retângulo de recorte (alça no canto). */
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    // Ensure cropping works for remote images by converting to blob URL
    let revokedUrl: string | null = null;
    const prepare = async () => {
      try {
        const isDataUrl = src.startsWith("data:");
        const isBlobUrl = src.startsWith("blob:");
        const isHttp = src.startsWith("http://") || src.startsWith("https://");
        if (isHttp && !isDataUrl && !isBlobUrl) {
          const resp = await fetch(src, { credentials: "include" });
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          revokedUrl = url;
          setDisplaySrc(url);
        } else {
          setDisplaySrc(src);
        }
      } catch {
        setDisplaySrc(src);
      }
    };
    prepare();
    return () => {
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [src]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      if (isDragging) {
        let newX = e.clientX - rect.left - dragOffset.x;
        let newY = e.clientY - rect.top - dragOffset.y;
        newX = Math.max(0, Math.min(newX, rect.width - crop.width));
        newY = Math.max(0, Math.min(newY, rect.height - crop.height));
        setCrop((c) => ({ ...c, x: newX, y: newY }));
      } else if (isResizing) {
        const newW = Math.max(
          20,
          Math.min(e.clientX - rect.left - crop.x, rect.width - crop.x)
        );
        const newH = Math.max(
          20,
          Math.min(e.clientY - rect.top - crop.y, rect.height - crop.y)
        );
        setCrop((c) => ({ ...c, width: newW, height: newH }));
      }
    };
    const onUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, isResizing, dragOffset, crop.x, crop.y]);

  const confirmCrop = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(crop.width));
    canvas.height = Math.max(1, Math.floor(crop.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ajustar para escala da imagem exibida
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const displayedW = img.clientWidth;
    const displayedH = img.clientHeight;
    const scaleX = naturalW / displayedW;
    const scaleY = naturalH / displayedH;

    ctx.drawImage(
      img,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    onConfirm(canvas.toDataURL("image/png"));
  };

  return (
    <div
      className="modal-root"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000000,
      }}
      onClick={onCancel}
    >
      <div
        style={{ background: "white", padding: 16, borderRadius: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={wrapperRef}
          style={{
            position: "relative",
            maxWidth: 800,
            maxHeight: 600,
            overflow: "hidden",
          }}
        >
          <img
            ref={imgRef}
            src={displaySrc}
            alt="crop"
            draggable={false}
            crossOrigin="anonymous"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              display: "block",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: crop.x,
              top: crop.y,
              width: crop.width,
              height: crop.height,
              border: "2px solid #f88a4a",
              boxShadow: "0 0 0 10000px rgba(0,0,0,0.35)",
              cursor: isDragging ? "grabbing" : "grab",
              touchAction: "none",
              background: "rgba(0,0,0,0.0001)",
            }}
            onMouseDown={handleCropMouseDown}
          >
            <div
              style={{
                position: "absolute",
                right: -6,
                bottom: -6,
                width: 12,
                height: 12,
                borderRadius: 12,
                background: "#f88a4a",
                cursor: "se-resize",
              }}
              onMouseDown={handleResizeMouseDown}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={confirmCrop}
            style={{
              background: "#f8894a",
              color: "white",
              padding: "8px 12px",
              borderRadius: 4,
              border: 0,
            }}
          >
            Confirmar
          </button>
          <button
            onClick={onCancel}
            style={{
              background: "#e9665c",
              color: "white",
              padding: "8px 12px",
              borderRadius: 4,
              border: 0,
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

const ColorHighlightModal = ({
  initialColor,
  onClose,
  onApply,
}: {
  initialColor: string;
  onClose: () => void;
  onApply: (hex: string) => void;
}) => {
  const normalizeHex = (raw: string) => {
    const trimmed = (raw || "").trim().toUpperCase();
    if (!trimmed) return "";
    const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    return withHash.replace(/[^#0-9A-F]/g, "");
  };

  const expand3To6 = (hex: string) => {
    // expects #RGB
    const h = hex.replace("#", "");
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  };

  const toApplyableHex = (raw: string): string | null => {
    const normalized = normalizeHex(raw);
    if (!normalized) return null;
    if (/^#[0-9A-F]{6}$/.test(normalized)) return normalized;
    if (/^#[0-9A-F]{3}$/.test(normalized)) return expand3To6(normalized);
    return null;
  };

  const toColorInputValue = (raw: string) => {
    const applyable = toApplyableHex(raw);
    return applyable || "#000000";
  };

  const [draft, setDraft] = useState<string>(normalizeHex(initialColor) || "#FFFF00");

  useEffect(() => {
    const trimmed = (initialColor || "").trim().toUpperCase();
    const withHash = trimmed
      ? trimmed.startsWith("#")
        ? trimmed
        : `#${trimmed}`
      : "";
    const normalized = withHash ? withHash.replace(/[^#0-9A-F]/g, "") : "";
    setDraft(normalized || "#FFFF00");
  }, [initialColor]);

  const applySelected = () => {
    const applyable = toApplyableHex(draft);
    if (!applyable) return;
    setDraft(applyable);
    onApply(applyable);
  };

  return (
    <div
      className="modal-root"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          width: "min(560px, calc(100vw - 40px))",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>Selecionar Cor</h3>
            <div style={{ fontSize: 12, color: "#6B7280" }}>
              Use o seletor ou digite o HEX.
            </div>
          </div>

          <div
            title={normalizeHex(draft) || ""}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: toApplyableHex(draft) || "transparent",
              boxShadow: "0 6px 18px rgba(0,0,0,0.10)",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px",
            gap: 10,
            marginTop: 8,
            marginBottom: 16,
            alignItems: "end",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Código HEX
            </label>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(normalizeHex(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applySelected();
                }
              }}
              placeholder="#FFFFFF"
              style={{
                width: "100%",
                height: 36,
                padding: "0 10px",
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.15)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Seletor
            </label>
            <input
              type="color"
              value={toColorInputValue(draft)}
              onChange={(e) => setDraft(normalizeHex(e.target.value))}
              style={{
                width: "100%",
                height: 36,
                padding: 0,
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "transparent",
              }}
              title="Escolher cor"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={applySelected}
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor: "#f8894a",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Aplicar
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor: "#e9665c",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

const DraggableResizableImage = ({
  img,
  onMove,
  onResize,
  onRotate,
  onCrop,
  onDelete,
  onSelect,
  onChangeZIndex,
  slideContainerRef,
  snapPosition,
  clearGuides,
  selected,
}: {
  img: SlideImage;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onRotate: (deg: number) => void;
  onCrop: () => void;
  onDelete: () => void;
  onSelect?: () => void;
  onChangeZIndex?: (z: number) => void;
  slideContainerRef: React.RefObject<HTMLDivElement | null>;
  snapPosition?: (rect: {
    id: number;
    type: "image" | "box";
    x: number;
    y: number;
    width: number;
    height: number;
  }) => { x: number; y: number };
  clearGuides?: () => void;
  selected?: boolean;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [widthInput, setWidthInput] = useState<string>(String(img.width));
  const [heightInput, setHeightInput] = useState<string>(String(img.height));
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeSide, setResizeSide] = useState("");
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    originalX: 0,
    originalY: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotateStart, setRotateStart] = useState({
    angleRad: 0,
    baseDeg: 0,
    cx: 0,
    cy: 0,
  });

  useEffect(() => {
    // Mantém inputs sincronizados quando a imagem é redimensionada via drag.
    setWidthInput(String(img.width));
    setHeightInput(String(img.height));
  }, [img.width, img.height]);

  const clampResizeToSlide = (w: number, h: number) => {
    const minSize = 50;
    const slideW = slideContainerRef.current?.clientWidth ?? Infinity;
    const slideH = slideContainerRef.current?.clientHeight ?? Infinity;
    const maxW = Number.isFinite(slideW) ? Math.max(minSize, slideW - img.x) : w;
    const maxH = Number.isFinite(slideH) ? Math.max(minSize, slideH - img.y) : h;
    const cw = Math.max(minSize, Math.min(w, maxW));
    const ch = Math.max(minSize, Math.min(h, maxH));
    return { w: cw, h: ch };
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    // Evita iniciar drag quando clicar em qualquer handle de resize/rotate
    const target = e.target as HTMLElement;
    if (
      target.closest(".resize-handle") ||
      target.closest(".rotate-handle") ||
      target.closest(".image-toolbar")
    ) {
      return;
    }
    // Se clicar próximo às bordas do próprio bloco, entrar em modo resize
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const margin = 12; // distância de ativação da borda
      const nearLeft = localX <= margin;
      const nearRight = localX >= rect.width - margin;
      const nearTop = localY <= margin;
      const nearBottom = localY >= rect.height - margin;

      // Detecção de cantos primeiro
      if (nearTop && nearLeft) {
        handleResizeMouseDown(e, "top-left");
        return;
      }
      if (nearTop && nearRight) {
        handleResizeMouseDown(e, "top-right");
        return;
      }
      if (nearBottom && nearLeft) {
        handleResizeMouseDown(e, "bottom-left");
        return;
      }
      if (nearBottom && nearRight) {
        handleResizeMouseDown(e, "bottom-right");
        return;
      }
      if (nearLeft) {
        handleResizeMouseDown(e, "left");
        return;
      }
      if (nearRight) {
        handleResizeMouseDown(e, "right");
        return;
      }
      if (nearTop) {
        handleResizeMouseDown(e, "top");
        return;
      }
      if (nearBottom) {
        handleResizeMouseDown(e, "bottom");
        return;
      }
    }
    // Caso não esteja próximo às bordas, inicia drag normal
    handleMouseDown(e);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelect?.();
    setIsDragging(true);
    if (slideContainerRef.current) {
      const rect = slideContainerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - img.x,
        y: e.clientY - rect.top - img.y,
      });
    } else {
      setDragOffset({ x: e.clientX - img.x, y: e.clientY - img.y });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent, side: string) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.();
    // Garante que não vamos entrar em modo de drag/rotate simultaneamente
    setIsDragging(false);
    setIsRotating(false);
    setIsResizing(true);
    setResizeSide(side);
    if (slideContainerRef.current) {
      const rect = slideContainerRef.current.getBoundingClientRect();
      setResizeStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        width: img.width,
        height: img.height,
        originalX: img.x,
        originalY: img.y,
      });
    }
  };

  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.();
    if (!slideContainerRef.current) return;
    const rect = slideContainerRef.current.getBoundingClientRect();
    const cx = img.x + img.width / 2;
    const cy = img.y + img.height / 2;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const startRad = Math.atan2(mouseY - cy, mouseX - cx);
    setRotateStart({ angleRad: startRad, baseDeg: img.rotation ?? 0, cx, cy });
    setIsRotating(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && slideContainerRef.current) {
        const rect = slideContainerRef.current.getBoundingClientRect();
        const containerW = slideContainerRef.current.clientWidth;
        const containerH = slideContainerRef.current.clientHeight;
        let newX = e.clientX - rect.left - dragOffset.x;
        let newY = e.clientY - rect.top - dragOffset.y;
        const imgWidth = img.width || 0;
        const imgHeight = img.height || 0;

        const maxX = containerW - imgWidth;
        const maxY = containerH - imgHeight;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        if (snapPosition) {
          const snapped = snapPosition({
            id: img.id,
            type: "image",
            x: newX,
            y: newY,
            width: imgWidth,
            height: imgHeight,
          });
          newX = snapped.x;
          newY = snapped.y;
        }
        onMove(newX, newY);
      } else if (isResizing && slideContainerRef.current) {
        const rect = slideContainerRef.current.getBoundingClientRect();
        const containerW = slideContainerRef.current.clientWidth;
        const containerH = slideContainerRef.current.clientHeight;
        const currentMouseX = e.clientX - rect.left;
        const currentMouseY = e.clientY - rect.top;
        const deltaX = currentMouseX - resizeStart.x;
        const deltaY = currentMouseY - resizeStart.y;

        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = resizeStart.originalX;
        const newY = resizeStart.originalY;

        const minSize = 50;

        if (resizeSide === "right") {
          newWidth = Math.max(minSize, resizeStart.width + deltaX);
          newWidth = Math.min(newWidth, containerW - img.x);
        } else if (resizeSide === "left") {
          // Mantém a borda direita fixa; move X e recalcula largura
          const rightEdge = resizeStart.originalX + resizeStart.width;
          newX = Math.max(0, Math.min(currentMouseX, rightEdge - minSize));
          newWidth = rightEdge - newX;
          // garantir que não ultrapasse o container
          newWidth = Math.min(newWidth, containerW - newX);
        } else if (resizeSide === "top") {
          // Mantém a borda inferior fixa; move Y e recalcula altura
          const bottomEdge = resizeStart.originalY + resizeStart.height;
          const newTop = Math.max(
            0,
            Math.min(currentMouseY, bottomEdge - minSize)
          );
          const limitedHeight = Math.min(
            bottomEdge - newTop,
            containerH - newTop
          );
          onResize(newWidth, limitedHeight);
          onMove(newX, newTop);
          return; // já atualizamos acima
        } else if (resizeSide === "bottom") {
          newHeight = Math.max(minSize, resizeStart.height + deltaY);
          newHeight = Math.min(newHeight, containerH - img.y);
        } else if (resizeSide === "bottom-right") {
          newWidth = Math.max(minSize, resizeStart.width + deltaX);
          newWidth = Math.min(newWidth, containerW - img.x);
          newHeight = Math.max(minSize, resizeStart.height + deltaY);
          newHeight = Math.min(newHeight, containerH - img.y);
        } else if (resizeSide === "top-left") {
          const rightEdge = resizeStart.originalX + resizeStart.width;
          const bottomEdge = resizeStart.originalY + resizeStart.height;
          const nx = Math.max(0, Math.min(currentMouseX, rightEdge - minSize));
          const ny = Math.max(0, Math.min(currentMouseY, bottomEdge - minSize));
          const w = rightEdge - nx;
          const h = bottomEdge - ny;
          const lw = Math.min(w, containerW - nx);
          const lh = Math.min(h, containerH - ny);
          onResize(lw, lh);
          onMove(nx, ny);
          return;
        } else if (resizeSide === "top-right") {
          const bottomEdge = resizeStart.originalY + resizeStart.height;
          const ny = Math.max(0, Math.min(currentMouseY, bottomEdge - minSize));
          const w = Math.max(minSize, resizeStart.width + deltaX);
          const lw = Math.min(w, containerW - img.x);
          const lh = Math.min(bottomEdge - ny, containerH - ny);
          onResize(lw, lh);
          if (ny !== resizeStart.originalY) {
            onMove(resizeStart.originalX, ny);
          }
          return;
        } else if (resizeSide === "bottom-left") {
          const rightEdge = resizeStart.originalX + resizeStart.width;
          const nx = Math.max(0, Math.min(currentMouseX, rightEdge - minSize));
          const w = rightEdge - nx;
          const h = Math.max(minSize, resizeStart.height + deltaY);
          const lw = Math.min(w, containerW - nx);
          const lh = Math.min(h, containerH - img.y);
          onResize(lw, lh);
          if (nx !== resizeStart.originalX) {
            onMove(nx, resizeStart.originalY);
          }
          return;
        }
        onResize(newWidth, newHeight);
        if (newX !== resizeStart.originalX || newY !== resizeStart.originalY) {
          onMove(newX, newY);
        }
      } else if (isRotating && slideContainerRef.current) {
        const rect = slideContainerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const currentRad = Math.atan2(my - rotateStart.cy, mx - rotateStart.cx);
        const deltaDeg = (currentRad - rotateStart.angleRad) * (180 / Math.PI);
        let newDeg = rotateStart.baseDeg + deltaDeg;
        // Normalize angle to [0, 360)
        newDeg = ((newDeg % 360) + 360) % 360;
        // Snap to common angles if close
        const SNAP_TOL = 3; // degrees
        const targets = [0, 45, 90, 135, 180, 225, 270, 315];
        let snapped = newDeg;
        for (const t of targets) {
          const d = Math.abs(newDeg - t);
          const alt = Math.min(d, 360 - d);
          if (alt <= SNAP_TOL) {
            snapped = t;
            break;
          }
        }
        onRotate(snapped);
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeSide("");
      setIsRotating(false);
      clearGuides?.();
    };
    if (isDragging || isResizing || isRotating) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    isRotating,
    dragOffset,
    resizeStart,
    resizeSide,
    onMove,
    onResize,
    onRotate,
    img,
    slideContainerRef,
    snapPosition,
    clearGuides,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: img.x,
        top: img.y,
        width: img.width,
        height: img.height,
        zIndex: img.zIndex ?? 1,
        transform: `rotate(${img.rotation ?? 0}deg)`,
        transformOrigin: "center",
        cursor: img.locked ? "default" : isDragging ? "grabbing" : "grab",
        border: "none",
        userSelect: "none", // Evita highlight azul durante o drag
        pointerEvents: img.locked ? "none" : "auto",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleContainerMouseDown}
      className="draggable-image-container"
    >
      {/* Removido: faixa de arrasto no topo para liberar a área de resize */}
      {/* Rotate Handle (quando selecionado ou hover) */}
      {!img.locked && (selected || isHovered) && (
        <div
          style={{
            position: "absolute",
            top: -22,
            left: "50%",
            transform: "translateX(-50%)",
            width: 18,
            height: 18,
            borderRadius: 18,
            background: isHovered ? "#f88a4a" : "#f88a4ab2",
            cursor: "grab",
            zIndex: 10,
            boxShadow: "0 0 0 2px white",
          }}
          className="rotate-handle"
          onMouseDown={handleRotateMouseDown}
        />
      )}
      {isRotating && selected && !img.locked && (
        <div
          style={{
            position: "absolute",
            top: -44,
            left: "50%",
            transform: `translateX(-50%) rotate(${-(img.rotation ?? 0)}deg)`,
            background: "rgba(0,0,0,0.6)",
            color: "white",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 12,
            zIndex: 11,
            pointerEvents: "none",
          }}
        >
          {(img.rotation ?? 0).toFixed(0)}°
        </div>
      )}
      {/* Resize Handles */}
      {/* Mid-side handles (mais fáceis de pegar que a borda fina) */}
      {!img.locked && (selected || isHovered) && (
        <>
          {/* Mid-Right */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translate(50%, -50%)",
              width: 14,
              height: 14,
              borderRadius: 3,
              cursor: "e-resize",
              zIndex: 70,
              background: "#f88a4ab2",
              boxShadow: "0 0 0 2px white",
            }}
            className="resize-handle"
            onMouseDown={(e) => handleResizeMouseDown(e, "right")}
          />
          {/* Mid-Left */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 14,
              height: 14,
              borderRadius: 3,
              cursor: "w-resize",
              zIndex: 70,
              background: "#f88a4ab2",
              boxShadow: "0 0 0 2px white",
            }}
            className="resize-handle"
            onMouseDown={(e) => handleResizeMouseDown(e, "left")}
          />
          {/* Mid-Top */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 14,
              height: 14,
              borderRadius: 3,
              cursor: "n-resize",
              zIndex: 70,
              background: "#f88a4ab2",
              boxShadow: "0 0 0 2px white",
            }}
            className="resize-handle"
            onMouseDown={(e) => handleResizeMouseDown(e, "top")}
          />
          {/* Mid-Bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: "50%",
              transform: "translate(-50%, 50%)",
              width: 14,
              height: 14,
              borderRadius: 3,
              cursor: "s-resize",
              zIndex: 70,
              background: "#f88a4ab2",
              boxShadow: "0 0 0 2px white",
            }}
            className="resize-handle"
            onMouseDown={(e) => handleResizeMouseDown(e, "bottom")}
          />
        </>
      )}
      {/* Right */}
      {!img.locked && (
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "10px",
          height: "100%",
          cursor: "e-resize",
          zIndex: 50,
          background: "rgba(0,0,0,0.0001)",
          pointerEvents: "auto",
        }}
        className="resize-handle"
        onMouseDown={(e) => handleResizeMouseDown(e, "right")}
      />
      )}
      {/* Left */}
      {!img.locked && (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "10px",
          height: "100%",
          cursor: "w-resize",
          zIndex: 50,
          background: "rgba(0,0,0,0.0001)",
          pointerEvents: "auto",
        }}
        className="resize-handle"
        onMouseDown={(e) => handleResizeMouseDown(e, "left")}
      />
      )}

      {/* Bottom */}
      {!img.locked && (
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "10px",
          cursor: "s-resize",
          zIndex: 50,
          background: "rgba(0,0,0,0.0001)",
          pointerEvents: "auto",
        }}
        className="resize-handle"
        onMouseDown={(e) => handleResizeMouseDown(e, "bottom")}
      />
      )}
      {/* Top */}
      {!img.locked && (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "10px",
          cursor: "n-resize",
          zIndex: 50,
          background: "rgba(0,0,0,0.0001)",
          pointerEvents: "auto",
        }}
        className="resize-handle"
        onMouseDown={(e) => handleResizeMouseDown(e, "top")}
      />
      )}
      {/* Bottom-Right */}
      {!img.locked && (
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: "14px",
          height: "14px",
          cursor: "se-resize",
          // Fica acima dos handles de borda (right/bottom) para permitir resize diagonal.
          zIndex: 60,
          background: selected || isHovered ? "#f88a4ab2" : "transparent",
          pointerEvents: "auto",
          boxShadow: selected || isHovered ? "0 0 0 2px white" : "none",
        }}
        className="resize-handle"
        onMouseDown={(e) => handleResizeMouseDown(e, "bottom-right")}
      />
      )}
      {/* Top-Left */}
      {!img.locked && (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "14px",
          height: "14px",
          cursor: "nw-resize",
          // Fica acima dos handles de borda (left/top) para permitir resize diagonal.
          zIndex: 60,
          background: selected || isHovered ? "#f88a4ab2" : "transparent",
          pointerEvents: "auto",
          boxShadow: selected || isHovered ? "0 0 0 2px white" : "none",
        }}
        className="resize-handle"
        onMouseDown={(e) => handleResizeMouseDown(e, "top-left")}
      />
      )}
      {/* Top-Right */}
      {!img.locked && (
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "14px",
          height: "14px",
          cursor: "ne-resize",
          // Fica acima dos handles de borda (right/top) para permitir resize diagonal.
          zIndex: 60,
          background: selected || isHovered ? "#f88a4ab2" : "transparent",
          pointerEvents: "auto",
          boxShadow: selected || isHovered ? "0 0 0 2px white" : "none",
        }}
        className="resize-handle"
        onMouseDown={(e) => handleResizeMouseDown(e, "top-right")}
      />
      )}
      {/* Bottom-Left */}
      {!img.locked && (
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "14px",
          height: "14px",
          cursor: "sw-resize",
          // Fica acima dos handles de borda (left/bottom) para permitir resize diagonal.
          zIndex: 60,
          background: selected || isHovered ? "#f88a4ab2" : "transparent",
          pointerEvents: "auto",
          boxShadow: selected || isHovered ? "0 0 0 2px white" : "none",
        }}
        className="resize-handle"
        onMouseDown={(e) => handleResizeMouseDown(e, "bottom-left")}
      />
      )}
      {isHovered && !img.locked && (
        <div className="image-toolbar">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCrop();
            }}
            title="Cortar"
          >
            ✂️
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 6px",
            }}
            onMouseDown={(e) => {
              // Não iniciar drag/resize ao clicar nos inputs
              e.stopPropagation();
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
              }}
              title="Largura (px)"
            >
              W
              <input
                type="number"
                value={widthInput}
                min={50}
                style={{
                  width: 70,
                  height: 26,
                  borderRadius: 6,
                  border: "1px solid rgba(0,0,0,0.15)",
                  padding: "0 8px",
                  fontSize: 12,
                }}
                onChange={(e) => setWidthInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const next = parseInt(widthInput, 10);
                  if (isNaN(next)) return;
                  const clamped = clampResizeToSlide(next, img.height);
                  onResize(clamped.w, clamped.h);
                }}
                onBlur={() => {
                  const next = parseInt(widthInput, 10);
                  if (isNaN(next)) {
                    setWidthInput(String(img.width));
                    return;
                  }
                  const clamped = clampResizeToSlide(next, img.height);
                  setWidthInput(String(clamped.w));
                  onResize(clamped.w, clamped.h);
                }}
              />
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
              }}
              title="Altura (px)"
            >
              H
              <input
                type="number"
                value={heightInput}
                min={50}
                style={{
                  width: 70,
                  height: 26,
                  borderRadius: 6,
                  border: "1px solid rgba(0,0,0,0.15)",
                  padding: "0 8px",
                  fontSize: 12,
                }}
                onChange={(e) => setHeightInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const next = parseInt(heightInput, 10);
                  if (isNaN(next)) return;
                  const clamped = clampResizeToSlide(img.width, next);
                  onResize(clamped.w, clamped.h);
                }}
                onBlur={() => {
                  const next = parseInt(heightInput, 10);
                  if (isNaN(next)) {
                    setHeightInput(String(img.height));
                    return;
                  }
                  const clamped = clampResizeToSlide(img.width, next);
                  setHeightInput(String(clamped.h));
                  onResize(clamped.w, clamped.h);
                }}
              />
            </label>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Excluir"
          >
            🗑️
          </button>
        </div>
      )}
      <img
        src={img.src}
        alt="Slide Image"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "fill",
          pointerEvents: "none", // Prevent native drag
        }}
      />
    </div>
  );
};

const DraggableTextBox = ({
  box,
  onMove,
  onResize,
  onRotate,
  onChange,
  slideWidth,
  slideHeight,
  slideContainerRef,
  slideId,
  selected,
  onSelect,
  onSaveSelection,
  onDelete,
  snapPosition,
  clearGuides,
  onChangeZIndex,
}: {
  box: TextBox;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onRotate: (deg: number) => void;
  onChange: (content: string) => void;
  slideWidth: number;
  slideHeight: number;
  slideContainerRef: React.RefObject<HTMLDivElement | null>;
  slideId: number;
  selected?: boolean;
  onSelect?: (slideId: number, boxId: number) => void;
  onSaveSelection?: (range: Range) => void;
  onDelete?: () => void;
  snapPosition?: (rect: {
    id: number;
    type: "image" | "box";
    x: number;
    y: number;
    width: number;
    height: number;
  }) => { x: number; y: number };
  clearGuides?: () => void;
  onChangeZIndex?: (z: number) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [minWidth, setMinWidth] = useState(150);
  const [minHeight, setMinHeight] = useState(30);
  const [isEditing, setIsEditing] = useState(false);
  const [shouldOverflowY, setShouldOverflowY] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [resizeSide, setResizeSide] = useState("");
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    originalX: 0,
    originalY: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const hasCalculatedSizeRef = useRef(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotateStart, setRotateStart] = useState({
    angleRad: 0,
    baseDeg: 0,
    cx: 0,
    cy: 0,
  });

  // Se outra caixa/imagem for selecionada, esta caixa deve perder o modo de edição
  // (senão ela continua com borda por causa do isEditing e parece "não desselecionar").
  useEffect(() => {
    if (selected) return;
    if (isEditing) setIsEditing(false);
    if (isDragging) setIsDragging(false);
    if (isResizing) setIsResizing(false);
    if (isRotating) setIsRotating(false);
    setResizeSide("");
    setShouldOverflowY(false);
  }, [selected]);

  const getSlideClientSize = () => {
    const w = slideContainerRef.current?.clientWidth ?? slideWidth ?? 0;
    const h = slideContainerRef.current?.clientHeight ?? slideHeight ?? 0;
    return { w, h };
  };

  const clampSizeToSlide = (width: number, height: number, x: number, y: number) => {
    const { w: slideW, h: slideH } = getSlideClientSize();
    const maxW = slideW ? Math.max(minWidth, slideW - x) : Infinity;
    const maxH = slideH ? Math.max(minHeight, slideH - y) : Infinity;
    return {
      width: Math.max(minWidth, Math.min(width, maxW)),
      height: Math.max(minHeight, Math.min(height, maxH)),
    };
  };

  const recomputeOverflowY = () => {
    const el = textRef.current;
    if (!el) return;
    const contentHeight = el.scrollHeight;
    const available = slideHeight ? Math.max(minHeight, slideHeight - box.y) : Infinity;
    const needsScroll = Number.isFinite(available) && contentHeight > available;
    setShouldOverflowY(needsScroll);
  };

  // Inicializar conteúdo HTML
  useEffect(() => {
    if (textRef.current && textRef.current.innerHTML === "" && box.content) {
      textRef.current.innerHTML = box.content;
    }
  }, []);

  // Mantém o conteúdo sincronizado quando `box.content` mudar (ex.: atualização remota via WS).
  // Importante: não sobrescrever enquanto o usuário está editando localmente.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    if (isEditing) return;
    const nextHtml = box.content || "";
    if (el.innerHTML !== nextHtml) {
      el.innerHTML = nextHtml;
      window.requestAnimationFrame(() => {
        recomputeOverflowY();
      });
    }
  }, [box.content, isEditing]);

  // Calcular tamanho ideal do texto apenas na primeira renderização ou quando estilos mudam
  useEffect(() => {
    if (textRef.current && !hasCalculatedSizeRef.current) {
      // Usar setTimeout para garantir que o DOM foi renderizado com os estilos
      setTimeout(() => {
        if (textRef.current) {
          const scrollWidth = textRef.current.scrollWidth;
          const scrollHeight = textRef.current.scrollHeight;

          const { w: slideW, h: slideH } = getSlideClientSize();
          const maxW = slideW ? Math.max(minWidth, slideW - box.x) : Infinity;
          const maxH = slideH ? Math.max(minHeight, slideH - box.y) : Infinity;

          // Se a caixa não tem tamanho definido ou é o tamanho padrão, usar o tamanho do conteúdo
          if (!box.width || box.width === minWidth) {
            const nextW = Math.max(scrollWidth + 10, minWidth);
            const nextH = box.height || Math.max(scrollHeight + 5, minHeight);
            onResize(
              Math.max(minWidth, Math.min(nextW, maxW)),
              Math.max(minHeight, Math.min(nextH, maxH))
            );
          } else if (!box.height || box.height === minHeight) {
            const nextW = box.width || minWidth;
            const nextH = Math.max(scrollHeight + 5, minHeight);
            onResize(
              Math.max(minWidth, Math.min(nextW, maxW)),
              Math.max(minHeight, Math.min(nextH, maxH))
            );
          }
          hasCalculatedSizeRef.current = true;
        }
      }, 0);
    }
  }, [box.fontSize, box.fontFamily, box.fontWeight, box.fontStyle]);

  // Aplicar estilos salvos quando o textBox renderizar
  useEffect(() => {
    if (textRef.current) {
      if (box.fontSize) {
        textRef.current.style.fontSize = `${box.fontSize}px`;
      }
      if (box.fontFamily) {
        textRef.current.style.fontFamily = box.fontFamily;
      }
      if (box.color) {
        textRef.current.style.color = box.color;
      }
      if (box.fontWeight) {
        textRef.current.style.fontWeight = box.fontWeight;
      }
      if (box.fontStyle) {
        textRef.current.style.fontStyle = box.fontStyle;
      }
      if (box.textDecoration) {
        textRef.current.style.textDecoration = box.textDecoration;
      }
      if (box.textAlign) {
        textRef.current.style.textAlign = box.textAlign;
      }
    }
  }, [box]);

  // Seleção global controlada pelo componente pai; nenhum listener local para deselecionar

  const handleDoubleClick = () => {
    if (box.locked) return;
    setIsEditing(true);
    setTimeout(() => {
      if (textRef.current) {
        textRef.current.focus();
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);

        // Só ativa scroll se o conteúdo iria ultrapassar o slide.
        recomputeOverflowY();
      }
    }, 0);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setShouldOverflowY(false);
  };

  // Enquanto edita, reavaliar quando conteúdo/tamanho/posição mudarem.
  useEffect(() => {
    if (!isEditing) return;
    const t = window.setTimeout(() => recomputeOverflowY(), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, box.content, box.height, box.y, slideHeight]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (box.locked) return;
    setIsDragging(true);
    if (slideContainerRef.current) {
      const rect = slideContainerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - box.x,
        y: e.clientY - rect.top - box.y,
      });
    } else {
      setDragOffset({
        x: e.clientX - box.x,
        y: e.clientY - box.y,
      });
    }
  };

  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (box.locked) return;
    if (!slideContainerRef.current) return;
    const rect = slideContainerRef.current.getBoundingClientRect();
    const w = box.width || minWidth;
    const h = box.height || minHeight;
    const cx = box.x + w / 2;
    const cy = box.y + h / 2;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const startRad = Math.atan2(my - cy, mx - cx);
    setRotateStart({ angleRad: startRad, baseDeg: box.rotation ?? 0, cx, cy });
    setIsRotating(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && slideContainerRef.current) {
        const rect = slideContainerRef.current.getBoundingClientRect();
        const containerW = slideContainerRef.current.clientWidth;
        const containerH = slideContainerRef.current.clientHeight;
        let newX = e.clientX - rect.left - dragOffset.x;
        let newY = e.clientY - rect.top - dragOffset.y;
        const boxWidth = box.width || minWidth || 0;
        const boxHeight = box.height || minHeight || 0;

        const maxX = containerW - boxWidth;
        const maxY = containerH - boxHeight;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        if (snapPosition) {
          const snapped = snapPosition({
            id: box.id,
            type: "box",
            x: newX,
            y: newY,
            width: boxWidth,
            height: boxHeight,
          });
          newX = snapped.x;
          newY = snapped.y;
        }
        onMove(newX, newY);
      } else if (isResizing && slideContainerRef.current) {
        const rect = slideContainerRef.current.getBoundingClientRect();
        const currentMouseX = e.clientX - rect.left;
        const currentMouseY = e.clientY - rect.top;
        const deltaX = currentMouseX - resizeStart.x;
        const deltaY = currentMouseY - resizeStart.y;

        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = resizeStart.originalX;
        const newY = resizeStart.originalY;

        if (resizeSide === "right") {
          const containerW = slideContainerRef.current.clientWidth;
          newWidth = Math.max(minWidth, resizeStart.width + deltaX);
          newWidth = Math.min(newWidth, containerW - box.x);
        } else if (resizeSide === "left") {
          const containerW = slideContainerRef.current.clientWidth;
          newX = Math.max(0, resizeStart.originalX + deltaX);
          newWidth = Math.max(minWidth, resizeStart.width - deltaX);
          // Garante que a largura não ultrapasse o slide ao redimensionar pelo lado esquerdo
          const maxW = Math.max(minWidth, containerW - newX);
          if (newWidth > maxW) {
            newWidth = maxW;
          }
          // Se o maxW ficou menor que o minWidth (muito perto da borda direita), recua X
          if (containerW - newX < minWidth) {
            newX = Math.max(0, containerW - minWidth);
          }
        } else if (resizeSide === "bottom") {
          const containerH = slideContainerRef.current.clientHeight;
          newHeight = Math.max(minHeight, resizeStart.height + deltaY);
          newHeight = Math.min(newHeight, containerH - box.y);
        } else if (resizeSide === "bottom-right") {
          const containerW = slideContainerRef.current.clientWidth;
          const containerH = slideContainerRef.current.clientHeight;
          newWidth = Math.max(minWidth, resizeStart.width + deltaX);
          newWidth = Math.min(newWidth, containerW - box.x);
          newHeight = Math.max(minHeight, resizeStart.height + deltaY);
          newHeight = Math.min(newHeight, containerH - box.y);
        }
        onResize(newWidth, newHeight);
        if (newX !== resizeStart.originalX || newY !== resizeStart.originalY) {
          onMove(newX, newY);
        }
      } else if (isRotating && slideContainerRef.current) {
        const rect = slideContainerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const currentRad = Math.atan2(my - rotateStart.cy, mx - rotateStart.cx);
        const deltaDeg = (currentRad - rotateStart.angleRad) * (180 / Math.PI);
        let newDeg = rotateStart.baseDeg + deltaDeg;
        // Normalize angle to [0, 360)
        newDeg = ((newDeg % 360) + 360) % 360;
        // Snap to common angles if close
        const SNAP_TOL = 3; // degrees
        const targets = [0, 45, 90, 135, 180, 225, 270, 315];
        let snapped = newDeg;
        for (const t of targets) {
          const d = Math.abs(newDeg - t);
          const alt = Math.min(d, 360 - d);
          if (alt <= SNAP_TOL) {
            snapped = t;
            break;
          }
        }
        onRotate(snapped);
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeSide("");
      setIsRotating(false);
      clearGuides?.();
    };

    if (isDragging || isResizing || isRotating) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    isRotating,
    dragOffset,
    resizeStart,
    onMove,
    onResize,
    onRotate,
    snapPosition,
    clearGuides,
  ]);

  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.width || minWidth || "auto",
        height: box.height || minHeight || "auto",
        minWidth: minWidth,
        minHeight: minHeight,
        maxWidth: slideWidth ? Math.max(minWidth, slideWidth - box.x) : undefined,
        maxHeight: slideHeight ? Math.max(minHeight, slideHeight - box.y) : undefined,
        zIndex: box.zIndex ?? 1,
        transform: `rotate(${box.rotation ?? 0}deg)`,
        transformOrigin: "center",
        border:
          selected || isHovered || isEditing ? "1px dashed #f88a4ab2" : "none",
        background: "transparent",
        cursor: box.locked ? "default" : isDragging ? "grabbing" : "grab",
        overflow: "visible",
        pointerEvents: box.locked ? "none" : "auto",
      }}
      onClick={() => {
        // Seleciona ao clicar e mantém seleção até clicar fora (controlado pelo pai)
        if (box.locked) return;
        onSelect?.(slideId, box.id);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!box.locked && (
        <>
          <div
            ref={handleRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "5px",
              cursor: "move",
              zIndex: 3,
            }}
            onMouseDown={handleMouseDown}
          />
          {/* Resize handles */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: "5px",
              height: "100%",
              cursor: "e-resize",
              zIndex: 4,
              background: selected ? "#f88a4ab2" : "transparent",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (slideContainerRef.current) {
                const rect = slideContainerRef.current.getBoundingClientRect();
                setResizeStart({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  width: box.width || minWidth,
                  height: box.height || minHeight,
                  originalX: box.x,
                  originalY: box.y,
                });
              }
              setIsResizing(true);
              setResizeSide("right");
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "5px",
              height: "100%",
              cursor: "w-resize",
              zIndex: 4,
              background: selected ? "#f88a4ab2" : "transparent",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (slideContainerRef.current) {
                const rect = slideContainerRef.current.getBoundingClientRect();
                setResizeStart({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  width: box.width || minWidth,
                  height: box.height || minHeight,
                  originalX: box.x,
                  originalY: box.y,
                });
              }
              setIsResizing(true);
              setResizeSide("left");
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "5px",
              cursor: "s-resize",
              zIndex: 4,
              background: selected ? "#f88a4ab2" : "transparent",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (slideContainerRef.current) {
                const rect = slideContainerRef.current.getBoundingClientRect();
                setResizeStart({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  width: box.width || minWidth,
                  height: box.height || minHeight,
                  originalX: box.x,
                  originalY: box.y,
                });
              }
              setIsResizing(true);
              setResizeSide("bottom");
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: "5px",
              height: "5px",
              cursor: "se-resize",
              zIndex: 4,
              background: selected ? "#f88a4ab2" : "transparent",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (slideContainerRef.current) {
                const rect = slideContainerRef.current.getBoundingClientRect();
                setResizeStart({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  width: box.width || minWidth,
                  height: box.height || minHeight,
                  originalX: box.x,
                  originalY: box.y,
                });
              }
              setIsResizing(true);
              setResizeSide("bottom-right");
            }}
          />
          {/* Rotate Handle (quando selecionado ou hover) */}
          {(selected || isHovered) && (
            <div
              style={{
                position: "absolute",
                top: -18,
                left: "50%",
                transform: "translateX(-50%)",
                width: 12,
                height: 12,
                borderRadius: 12,
                background: selected ? "#f88a4a" : "#f88a4ab2",
                cursor: "grab",
                zIndex: 5,
              }}
              onMouseDown={handleRotateMouseDown}
            />
          )}
          {isRotating && selected && (
            <div
              style={{
                position: "absolute",
                top: -40,
                left: "50%",
                transform: `translateX(-50%) rotate(${-(box.rotation ?? 0)}deg)`,
                background: "rgba(0,0,0,0.6)",
                color: "white",
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 12,
                zIndex: 7,
                pointerEvents: "none",
              }}
            >
              {(box.rotation ?? 0).toFixed(0)}°
            </div>
          )}
          {(selected || isHovered) && onDelete && (
            <div className="textbox-toolbar" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Excluir"
              >
                🗑️
              </button>
            </div>
          )}
        </>
      )}
      <div
        ref={textRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        data-box-id={box.id}
        style={{
          width: "100%",
          height: "100%",
          margin: "0",
          padding: "0px",
          outline: "none",
          cursor: isEditing ? "text" : "grab",
          position: "relative",
          zIndex: 2,
          userSelect: isEditing ? "text" : "none",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          maxWidth: "100%",
          maxHeight: "100%",
          overflowY: shouldOverflowY ? "auto" : "visible",
        }}
        onInput={(e) => {
          // Atualiza conteúdo
          onChange(e.currentTarget.innerHTML);

          // Não muda o tamanho da caixa enquanto digita.
          // Scroll só aparece quando o conteúdo iria ultrapassar o slide.
          window.requestAnimationFrame(() => {
            recomputeOverflowY();
          });
        }}
        onMouseUp={() => {
          // Salvar a seleção quando o usuário termina de selecionar
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0 && onSaveSelection) {
            onSaveSelection(selection.getRangeAt(0));
          }
        }}
        onKeyUp={() => {
          // Salvar a seleção quando o usuário usa teclado
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0 && onSaveSelection) {
            onSaveSelection(selection.getRangeAt(0));
          }
        }}
        onDoubleClick={handleDoubleClick}
        onBlur={handleBlur}
        onMouseDown={(e) => {
          if (!isEditing) {
            handleMouseDown(e);
          }
        }}
      />
    </div>
  );
};

/**
 * `SlideItem`
 *
 * Renderiza e controla a interação de um único slide no editor.
 *
 * Responsabilidades:
 * - Exibir caixas de texto e imagens posicionáveis.
 * - Encaminhar eventos (move/resize/rotate/zIndex/select/delete) ao componente pai
 *   através das callbacks recebidas por props.
 * - Implementar snapping/guia visual (linhas de alinhamento) durante movimentação.
 *
 * Observação:
 * - O estado fonte de verdade (slides, seleção) fica no componente pai.
 */
const SlideItem = ({
  slide,
  isActive,
  onContentChange,
  onTextBoxChange,
  onTextBoxMove,
  onTextBoxResize,
  onImageMove,
  onImageResize,
  onTextBoxRotate,
  onImageRotate,
  onTextBoxZIndex,
  onImageZIndex,
  onImageCrop,
  onImageDelete,
  onTextBoxDelete,
  onFocus,
  onTextBoxSelect,
  onImageSelect,
  onTextBoxSaveSelection,
  selectedTextBox,
  selectedImage,
  onBackgroundClick,
}: SlideItemProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const [slideSize, setSlideSize] = useState({ width: 0, height: 0 });
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({
    v: [],
    h: [],
  });

  const clearGuides = useCallback(() => setGuides({ v: [], h: [] }), []);

  const snapPosition = useCallback(
    (moving: {
      id: number;
      type: "image" | "box";
      x: number;
      y: number;
      width: number;
      height: number;
    }) => {
      const SNAP = 6;
      const width = slideSize.width;
      const height = slideSize.height;
      if (!width || !height) return { x: moving.x, y: moving.y };

      const vCandidates: number[] = [0, width / 2, width];
      const hCandidates: number[] = [0, height / 2, height];

      slide.textBoxes.forEach((b) => {
        if (!(moving.type === "box" && moving.id === b.id)) {
          const bw = b.width ?? 150;
          const bh = b.height ?? 30;
          vCandidates.push(b.x, b.x + bw / 2, b.x + bw);
          hCandidates.push(b.y, b.y + bh / 2, b.y + bh);
        }
      });
      slide.images.forEach((im) => {
        if (!(moving.type === "image" && moving.id === im.id)) {
          vCandidates.push(im.x, im.x + im.width / 2, im.x + im.width);
          hCandidates.push(im.y, im.y + im.height / 2, im.y + im.height);
        }
      });

      const cur = {
        left: moving.x,
        cx: moving.x + moving.width / 2,
        right: moving.x + moving.width,
        top: moving.y,
        cy: moving.y + moving.height / 2,
        bottom: moving.y + moving.height,
      };

      const trySnap = (val: number, cands: number[]) => {
        let bestDelta = SNAP + 1;
        let bestTarget = val;
        for (const c of cands) {
          const d = Math.abs(c - val);
          if (d < bestDelta) {
            bestDelta = d;
            bestTarget = c;
          }
        }
        return { delta: bestDelta, target: bestTarget };
      };

      // X axis
      const leftRes = trySnap(cur.left, vCandidates);
      const cxRes = trySnap(cur.cx, vCandidates);
      const rightRes = trySnap(cur.right, vCandidates);
      let snapX = moving.x;
      let vGuide: number | null = null;
      let bestX = leftRes;
      let modeX: "left" | "center" | "right" = "left";
      if (cxRes.delta < bestX.delta) {
        bestX = cxRes;
        modeX = "center";
      }
      if (rightRes.delta < bestX.delta) {
        bestX = rightRes;
        modeX = "right";
      }
      if (bestX.delta <= SNAP) {
        if (modeX === "left") snapX = bestX.target;
        if (modeX === "center") snapX = bestX.target - moving.width / 2;
        if (modeX === "right") snapX = bestX.target - moving.width;
        vGuide = bestX.target;
      }

      // Y axis
      const topRes = trySnap(cur.top, hCandidates);
      const cyRes = trySnap(cur.cy, hCandidates);
      const bottomRes = trySnap(cur.bottom, hCandidates);
      let snapY = moving.y;
      let hGuide: number | null = null;
      let bestY = topRes;
      let modeY: "top" | "middle" | "bottom" = "top";
      if (cyRes.delta < bestY.delta) {
        bestY = cyRes;
        modeY = "middle";
      }
      if (bottomRes.delta < bestY.delta) {
        bestY = bottomRes;
        modeY = "bottom";
      }
      if (bestY.delta <= SNAP) {
        if (modeY === "top") snapY = bestY.target;
        if (modeY === "middle") snapY = bestY.target - moving.height / 2;
        if (modeY === "bottom") snapY = bestY.target - moving.height;
        hGuide = bestY.target;
      }

      // clamp within canvas
      snapX = Math.max(0, Math.min(snapX, width - moving.width));
      snapY = Math.max(0, Math.min(snapY, height - moving.height));

      setGuides({
        v: vGuide != null ? [vGuide] : [],
        h: hGuide != null ? [hGuide] : [],
      });
      return { x: snapX, y: snapY };
    },
    [slide, slideSize]
  );

  useEffect(() => {
    if (divRef.current) {
      if (
        divRef.current !== document.activeElement &&
        divRef.current.innerHTML !== slide.content
      ) {
        divRef.current.innerHTML = slide.content;
      }
    }
  }, [slide.content]);

  useEffect(() => {
    if (divRef.current && divRef.current.innerHTML === "" && slide.content) {
      divRef.current.innerHTML = slide.content;
    }
  }, []);

  useEffect(() => {
    if (slideContainerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setSlideSize({ width, height });
        }
      });
      observer.observe(slideContainerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  return (
    <div
      ref={slideContainerRef}
      className={`slide-canvas ${isActive ? "active-slide" : ""}`}
      onFocus={() => onFocus(slide.id)}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        const isOnImage = !!target.closest(".draggable-image-container");
        const isOnTextBox = !!target.closest("[data-box-id]");
        const isOnImgToolbar = !!target.closest(".image-toolbar");
        const isOnTxtToolbar = !!target.closest(".textbox-toolbar");
        if (!isOnImage && !isOnTextBox && !isOnImgToolbar && !isOnTxtToolbar) {
          onBackgroundClick?.();
        }
      }}
      style={{
        fontFamily: "Nunito",
        marginBottom: "4rem",
        position: "relative", // Necessário para posicionamento absoluto dos filhos
      }}
    >
      {/* Camada de Fundo (sem edição direta - use blocos de texto) */}
      <div
        style={{
          width: "100%",
          height: "100%",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          outline: "none",
        }}
      />

      {/* Imagens Flutuantes */}
      {slide.images.map((img) => (
        <DraggableResizableImage
          key={img.id}
          img={img}
          onMove={(x, y) => onImageMove(slide.id, img.id, x, y)}
          onResize={(w, h) => onImageResize(slide.id, img.id, w, h)}
          onRotate={(deg) => onImageRotate(slide.id, img.id, deg)}
          onCrop={() => onImageCrop(slide.id, img.id)}
          onDelete={() => onImageDelete(slide.id, img.id)}
          onSelect={() => onImageSelect?.(slide.id, img.id)}
          onChangeZIndex={(z) => onImageZIndex(slide.id, img.id, z)}
          slideContainerRef={slideContainerRef}
          snapPosition={snapPosition}
          clearGuides={clearGuides}
          selected={
            selectedImage?.slideId === slide.id &&
            selectedImage?.imgId === img.id
          }
        />
      ))}

      {/* Caixas de Texto Flutuantes */}
      {slide.textBoxes.map((box) => (
        <DraggableTextBox
          key={box.id}
          box={box}
          slideId={slide.id}
          selected={
            selectedTextBox?.slideId === slide.id &&
            selectedTextBox?.boxId === box.id
          }
          onMove={(x, y) => onTextBoxMove(slide.id, box.id, x, y)}
          onResize={(width, height) =>
            onTextBoxResize(slide.id, box.id, width, height)
          }
          onRotate={(deg) => onTextBoxRotate(slide.id, box.id, deg)}
          onChange={(content) => onTextBoxChange(slide.id, box.id, content)}
          slideWidth={slideSize.width}
          slideHeight={slideSize.height}
          slideContainerRef={slideContainerRef}
          onSelect={onTextBoxSelect}
          onSaveSelection={onTextBoxSaveSelection}
          onDelete={() => onTextBoxDelete(slide.id, box.id)}
          snapPosition={snapPosition}
          clearGuides={clearGuides}
          onChangeZIndex={(z) => onTextBoxZIndex(slide.id, box.id, z)}
        />
      ))}

      {/* Alignment Guides */}
      {guides.v.map((x) => (
        <div
          key={`v-${x}`}
          style={{
            position: "absolute",
            left: x,
            top: 0,
            height: "100%",
            width: 1,
            background: "#f88a4a",
            pointerEvents: "none",
          }}
        />
      ))}
      {guides.h.map((y) => (
        <div
          key={`h-${y}`}
          style={{
            position: "absolute",
            top: y,
            left: 0,
            width: "100%",
            height: 1,
            background: "#f88a4a",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
};

// Miniatura com escala dinâmica
const ThumbnailItem = ({
  slide,
  index,
  isActive,
  onClick,
  onDelete,
}: {
  slide: Slide;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    if (!previewRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        // Base do slide 960px
        const nextScale = Math.max(0.01, Math.min(2, w / 960));
        setScale(nextScale);
      }
    });
    obs.observe(previewRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      id={`thumbnail-${slide.id}`}
      className={`thumbnail-item ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <div
        className="thumbnail-preview"
        ref={previewRef}
        style={{ backgroundColor: "#f5f5f5" }}
      >
        <div
          style={{
            position: "relative",
            width: 960,
            height: 540,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            boxSizing: "border-box",
            padding: 0,
            fontFamily: "Nunito",
            background: "white",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}
            dangerouslySetInnerHTML={{ __html: slide.content || "" }}
          />
          {slide.images.map((img) => (
            <div
              key={img.id}
              style={{
                position: "absolute",
                left: img.x,
                top: img.y,
                width: img.width,
                height: img.height,
                zIndex: img.zIndex ?? 1,
                transform: `rotate(${img.rotation ?? 0}deg)`,
                transformOrigin: "center",
              }}
            >
              <img
                src={img.src}
                alt="thumb"
                style={{ width: "100%", height: "100%", objectFit: "fill" }}
              />
            </div>
          ))}
          {slide.textBoxes.map((box) => (
            <div
              key={box.id}
              style={{
                position: "absolute",
                left: box.x,
                top: box.y,
                width: box.width || 150,
                height: box.height || 30,
                overflow: "hidden",
                zIndex: box.zIndex ?? 1,
                transform: `rotate(${box.rotation ?? 0}deg)`,
                transformOrigin: "center",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  fontSize: box.fontSize ? `${box.fontSize}px` : undefined,
                  fontFamily: box.fontFamily,
                  color: box.color,
                  fontWeight: box.fontWeight,
                  fontStyle: box.fontStyle,
                  textDecoration: box.textDecoration,
                  textAlign: box.textAlign,
                }}
                dangerouslySetInnerHTML={{ __html: box.content }}
              />
            </div>
          ))}
        </div>
      </div>
      <span className="slide-number">{index + 1}</span>
      <button
        className="delete-slide-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
      >
        🗑️
      </button>
    </div>
  );
};

const getInitialSlides = (): Slide[] => {
  /**
   * Determina os slides iniciais do editor.
   *
   * Regras:
   * - Se houver conteúdo no `localStorage`, usa como fonte inicial.
   * - Caso contrário, cria um slide default vazio com estilos base.
   *
   * Observação:
   * - Quando `turmaId` existe, o carregamento “real” pode sobrescrever esse valor via API.
   */
  const stored = loadPublicationFromStorage();
  if (stored && stored.length > 0) {
    return stored;
  }
  return [
    {
      id: 1,
      content: "",
      styles: {
        fontSize: "24px",
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        fontFamily: "Nunito",
      },
      textBoxes: [],
      images: [],
    },
  ];
};

/**
 * Página do editor.
 *
 * Entrada:
 * - Query param `t` (opcional): ID da turma.
 *
 * Efeitos colaterais:
 * - Leitura/escrita em `localStorage` (quando não há `turmaId`).
 * - Chamadas HTTP para carregar/salvar no backend (quando há `turmaId`).
 * - Uso de timers para debouncing de persistência (variável `saveTimeoutRef`).
 */
export default function PublicacoesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const turmaParam = searchParams.get("t");
  const turmaId = turmaParam ? parseInt(turmaParam, 10) : undefined;

  const [slides, setSlides] = useState<Slide[]>(getInitialSlides());
  const [currentSlideId, setCurrentSlideId] = useState<number>(1);
  const [selectedTextBox, setSelectedTextBox] = useState<{
    slideId: number;
    boxId: number;
  } | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    slideId: number;
    imgId: number;
  } | null>(null);
  const [selectedBoxFontSize, setSelectedBoxFontSize] = useState<string>("");
  const [selectedBoxFontFamily, setSelectedBoxFontFamily] =
    useState<string>("");
  const [selectedBoxAlign, setSelectedBoxAlign] = useState<
    "left" | "center" | "right" | "justify"
  >("left");
  const [showColorModal, setShowColorModal] = useState(false);
  const [zInput, setZInput] = useState<string>("");
  const [colorModalInitialHex, setColorModalInitialHex] = useState<string>(
    "#FFFF00"
  );
  const [tags, setTags] = useState("");
  const [croppingImage, setCroppingImage] = useState<{
    slideId: number;
    imgId: number;
    src: string;
  } | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const slideRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [loading, setLoading] = useState<boolean>(!!turmaId);
  const [loadedFromApi, setLoadedFromApi] = useState<boolean>(false);
  const [canSaveToApi, setCanSaveToApi] = useState<boolean>(!turmaId);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const [instrumentoVersion, setInstrumentoVersion] = useState<number | null>(
    null
  );
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const stompClientRef = useRef<Client | null>(null);
  const clientIdRef = useRef<string>(getClientId());
  const applyingRemoteRef = useRef<boolean>(false);
  const pendingWsSaveRef = useRef<boolean>(false);
  const wsDirtyWhileSavingRef = useRef<boolean>(false);
  const pendingWsSavedJsonRef = useRef<string | null>(null);
  const lastSavedSlidesJsonRef = useRef<string>("");
  const dirtySinceLastPersistRef = useRef<boolean>(false);
  const slidesRef = useRef<Slide[]>(slides);
  const versionRef = useRef<number | null>(instrumentoVersion);
  const [changeLogs, setChangeLogs] = useState<InstrumentoChangeLogDto[]>([]);
  const visibleChangeLogs = changeLogs.filter(isUserVisibleChangeLog);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);

  const conflictRetryRef = useRef<{ lastAt: number; lastActual: number | null }>(
    { lastAt: 0, lastActual: null }
  );
  const suppressAutosaveUntilRef = useRef<number>(0);
  const [shouldUsePost, setShouldUsePost] = useState<boolean>(!!turmaId);

  // Sempre usar POST na primeira gravação quando mudar a turma
  useEffect(() => {
    setShouldUsePost(!!turmaId);
    setCanSaveToApi(!turmaId);
    setIsRedirecting(false);
    setInstrumentoVersion(null);
    setChangeLogs([]);
    setLastSaveError(null);
    lastSavedSlidesJsonRef.current = "";
    pendingWsSavedJsonRef.current = null;
    dirtySinceLastPersistRef.current = false;
    suppressAutosaveUntilRef.current = 0;
  }, [turmaId]);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  // ---------------------------------------------------------------------------
  // Undo/Redo (Ctrl+Z / Ctrl+Y) para estado do slide (não interfere com edição de texto)
  // ---------------------------------------------------------------------------
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const historyBaselineJsonRef = useRef<string>("");
  const historyInitializedRef = useRef<boolean>(false);
  const isApplyingHistoryRef = useRef<boolean>(false);
  const historyPendingFromJsonRef = useRef<string | null>(null);
  const historyDebounceTimerRef = useRef<number | null>(null);
  const HISTORY_MAX = 60;
  const HISTORY_DEBOUNCE_MS = 350;

  const getSlidesJson = (value: Slide[]) => {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  };

  const initHistoryIfNeeded = () => {
    if (historyInitializedRef.current) return;
    // Só inicializa quando o editor já está pronto pra editar.
    if (turmaId && (loading || !loadedFromApi)) return;
    historyBaselineJsonRef.current = getSlidesJson(slidesRef.current);
    undoStackRef.current = [];
    redoStackRef.current = [];
    historyPendingFromJsonRef.current = null;
    if (historyDebounceTimerRef.current !== null) {
      window.clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    historyInitializedRef.current = true;
  };

  const flushPendingHistoryCommit = () => {
    if (!historyInitializedRef.current) return;
    if (historyDebounceTimerRef.current !== null) {
      window.clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    const fromJson = historyPendingFromJsonRef.current;
    historyPendingFromJsonRef.current = null;

    const currentJson = getSlidesJson(slidesRef.current);
    if (!currentJson) return;

    // Se não havia pendência, apenas sincronize o baseline.
    if (!fromJson) {
      historyBaselineJsonRef.current = currentJson;
      return;
    }

    if (currentJson === fromJson) {
      historyBaselineJsonRef.current = currentJson;
      return;
    }

    undoStackRef.current.push(fromJson);
    if (undoStackRef.current.length > HISTORY_MAX) {
      undoStackRef.current.splice(0, undoStackRef.current.length - HISTORY_MAX);
    }
    redoStackRef.current = [];
    historyBaselineJsonRef.current = currentJson;
  };

  // Inicializa/reinicializa histórico quando trocar a turma
  useEffect(() => {
    historyInitializedRef.current = false;
    historyBaselineJsonRef.current = "";
    undoStackRef.current = [];
    redoStackRef.current = [];
    historyPendingFromJsonRef.current = null;
    if (historyDebounceTimerRef.current !== null) {
      window.clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaId]);

  // Captura alterações locais e empilha para undo.
  // Importante: mudanças rápidas (drag/resize) são agrupadas (debounce), para não pegar "todos os frames".
  useEffect(() => {
    initHistoryIfNeeded();
    if (!historyInitializedRef.current) return;
    if (isApplyingHistoryRef.current) return;
    const nextJson = getSlidesJson(slides);
    if (!nextJson) return;

    // Atualização remota/hidratação: não entra no histórico local e reseta baseline.
    if (applyingRemoteRef.current) {
      historyBaselineJsonRef.current = nextJson;
      undoStackRef.current = [];
      redoStackRef.current = [];
      historyPendingFromJsonRef.current = null;
      if (historyDebounceTimerRef.current !== null) {
        window.clearTimeout(historyDebounceTimerRef.current);
        historyDebounceTimerRef.current = null;
      }
      return;
    }
    const prevJson = historyBaselineJsonRef.current;
    if (!nextJson || !prevJson) {
      historyBaselineJsonRef.current = nextJson;
      return;
    }
    if (nextJson === prevJson) return;

    // Marca o início do "burst" (a 1ª mudança define o estado anterior a ser empilhado).
    if (!historyPendingFromJsonRef.current) {
      historyPendingFromJsonRef.current = prevJson;
    }

    // Debounce: várias mudanças rápidas viram 1 entrada no undo.
    if (historyDebounceTimerRef.current !== null) {
      window.clearTimeout(historyDebounceTimerRef.current);
    }
    historyDebounceTimerRef.current = window.setTimeout(() => {
      historyDebounceTimerRef.current = null;
      flushPendingHistoryCommit();
    }, HISTORY_DEBOUNCE_MS);
  }, [slides, turmaId, loading, loadedFromApi]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const modPressed = isMac ? e.metaKey : e.ctrlKey;
      if (!modPressed) return;

      const key = e.key.toLowerCase();
      const isUndo = key === "z" && !e.shiftKey;
      const isRedo = key === "y" || (key === "z" && e.shiftKey);
      if (!isUndo && !isRedo) return;

      const active = (document.activeElement as HTMLElement | null) ?? null;
      const tag = active?.tagName?.toLowerCase() || "";
      const isTypingTarget =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        Boolean(active && active.isContentEditable);
      if (isTypingTarget) return;

      initHistoryIfNeeded();
      if (!historyInitializedRef.current) return;

      // Garante que o estado atual (incluindo drag/resize em andamento) vire um único passo antes do undo/redo.
      flushPendingHistoryCommit();

      const currentJson = historyBaselineJsonRef.current || getSlidesJson(slidesRef.current);
      if (!currentJson) return;

      if (isUndo) {
        const prevJson = undoStackRef.current.pop();
        if (!prevJson) return;
        e.preventDefault();
        redoStackRef.current.push(currentJson);
        isApplyingHistoryRef.current = true;
        try {
          const prevSlides = JSON.parse(prevJson) as Slide[];
          historyBaselineJsonRef.current = prevJson;
          setSlides(prevSlides);
        } finally {
          window.setTimeout(() => {
            isApplyingHistoryRef.current = false;
          }, 0);
        }
        return;
      }

      if (isRedo) {
        const nextJson = redoStackRef.current.pop();
        if (!nextJson) return;
        e.preventDefault();
        undoStackRef.current.push(currentJson);
        isApplyingHistoryRef.current = true;
        try {
          const nextSlides = JSON.parse(nextJson) as Slide[];
          historyBaselineJsonRef.current = nextJson;
          setSlides(nextSlides);
        } finally {
          window.setTimeout(() => {
            isApplyingHistoryRef.current = false;
          }, 0);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaId, loading, loadedFromApi]);

  // Marca "dirty" sempre que houver alteração local no conteúdo.
  // Importante: updates remotos/hidratação setam `applyingRemoteRef.current = true`.
  useEffect(() => {
    if (!turmaId) return;
    if (loading) return;
    if (!loadedFromApi) return;
    if (applyingRemoteRef.current) return;
    if (Date.now() < suppressAutosaveUntilRef.current) return;
    dirtySinceLastPersistRef.current = true;
    // Se um save WS está em voo, marque que houve alteração durante o voo.
    // O handler do ACK vai publicar o snapshot mais recente.
    if (wsConnected && pendingWsSaveRef.current) {
      wsDirtyWhileSavingRef.current = true;
    }
  }, [slides, turmaId, loading, loadedFromApi, wsConnected]);

  useEffect(() => {
    versionRef.current = instrumentoVersion;
  }, [instrumentoVersion]);

  // Carregar via API quando houver turmaId
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!turmaId) return;
      setLoading(true);
      try {
        const res = await Requests.getInstrumentoByTurma(turmaId);
        if (!res.ok) {
          // Se o instrumento não existir, deixa "cair" no not-found.
          if (res.status === 404 && !cancelled) {
            setIsRedirecting(true);
            setLoadedFromApi(false);
            setCanSaveToApi(false);
            router.replace("/_not-found");
            return;
          }

          setLoadedFromApi(false);
          setCanSaveToApi(false);
          return;
        }
        const data = await res.json();
        const raw = data?.slidesJson;
        const versionRaw = data?.version;
        if (typeof versionRaw === "number") {
          setInstrumentoVersion(versionRaw);
        } else if (typeof versionRaw === "string") {
          const parsedV = parseInt(versionRaw, 10);
          if (!Number.isNaN(parsedV)) setInstrumentoVersion(parsedV);
        }
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            if (!cancelled && Array.isArray(parsed)) {
              // Marca como hidratação: não disparar autosave por causa do load.
              applyingRemoteRef.current = true;
              suppressAutosaveUntilRef.current = Math.max(
                suppressAutosaveUntilRef.current,
                Date.now() + 1200
              );
              setSlides(parsed as Slide[]);
              lastSavedSlidesJsonRef.current = JSON.stringify(parsed);
              dirtySinceLastPersistRef.current = false;
              // Seleciona o primeiro slide existente
              if (parsed.length > 0 && typeof parsed[0]?.id === "number") {
                setCurrentSlideId(parsed[0].id);
              }
              setLoadedFromApi(true);
              setCanSaveToApi(true);

              window.setTimeout(() => {
                applyingRemoteRef.current = false;
              }, 0);
            }
          } catch (e) {
            console.error("Falha ao parsear slidesJson:", e);
            setLoadedFromApi(false);
            setCanSaveToApi(false);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar instrumento:", e);
        setLoadedFromApi(false);
        setCanSaveToApi(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [turmaId]);

  // Carregar log de alterações inicial (painel)
  useEffect(() => {
    let cancelled = false;
    const loadLogs = async () => {
      if (!turmaId) return;
      if (!loadedFromApi) return;
      try {
        const res = await Requests.getInstrumentoChanges(turmaId, 50);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setChangeLogs(data as InstrumentoChangeLogDto[]);
        }
      } catch (e) {
        console.error("Erro ao carregar log de alterações:", e);
      }
    };
    loadLogs();
    return () => {
      cancelled = true;
    };
  }, [turmaId, loadedFromApi]);

  // Conectar WebSocket/STOMP para colaboração em tempo real
  useEffect(() => {
    if (!turmaId) return;
    if (!loadedFromApi) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) return;

    const wsUrl = buildWsUrlFromApiBase(apiBase);
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {
        // manter silencioso por padrão
      },
    });

    client.onConnect = () => {
      setWsConnected(true);

      client.subscribe(`/topic/instrumentos/${turmaId}`, (message: IMessage) => {
        try {
          const payload = JSON.parse(
            message.body
          ) as InstrumentoWsUpdateBroadcast;

          if (typeof payload?.version === "number") {
            setInstrumentoVersion(payload.version);
            // Evita race: o próximo publish usa versionRef.current.
            versionRef.current = payload.version;
          }

          // Evita eco visual do próprio cliente (mas mantém atualização de version/status)
          if (payload?.clientId && payload.clientId === clientIdRef.current) {
            if (pendingWsSaveRef.current) {
              pendingWsSaveRef.current = false;
              if (pendingWsSavedJsonRef.current) {
                lastSavedSlidesJsonRef.current = pendingWsSavedJsonRef.current;
                pendingWsSavedJsonRef.current = null;
              }
              dirtySinceLastPersistRef.current = false;
              setLastSaveError(null);
              setSaveStatus("saved");
              window.setTimeout(() => setSaveStatus("idle"), 1200);
            }

            // Se o usuário alterou novamente enquanto o save estava em voo,
            // enviamos imediatamente o snapshot mais recente.
            if (wsDirtyWhileSavingRef.current) {
              wsDirtyWhileSavingRef.current = false;
              window.setTimeout(() => {
                // Mostra "salvando" novamente e publica o estado atual.
                setSaveStatus("saving");
                publishWsSnapshot();
              }, 0);
            }
            return;
          }

          if (Array.isArray(payload?.slides)) {
            applyingRemoteRef.current = true;
            suppressAutosaveUntilRef.current = Math.max(
              suppressAutosaveUntilRef.current,
              Date.now() + 1200
            );
            const remoteSlides = payload.slides as Slide[];
            setSlides(remoteSlides);
            try {
              lastSavedSlidesJsonRef.current = JSON.stringify(remoteSlides);
            } catch {}
            dirtySinceLastPersistRef.current = false;
            if (
              remoteSlides.length > 0 &&
              typeof remoteSlides[0]?.id === "number"
            ) {
              setCurrentSlideId((prev) => {
                const stillExists = remoteSlides.some((s) => s.id === prev);
                return stillExists ? prev : remoteSlides[0].id;
              });
            }
            window.setTimeout(() => {
              applyingRemoteRef.current = false;
            }, 0);
          }

          if (payload?.logEntry) {
            setChangeLogs((prev) => [payload.logEntry!, ...prev].slice(0, 50));
          }
        } catch (e) {
          console.error("Falha ao processar broadcast WS:", e);
        }
      });

      client.subscribe(
        `/topic/instrumentos/${turmaId}/changes`,
        (message: IMessage) => {
        try {
          const log = JSON.parse(message.body) as InstrumentoChangeLogDto;
          if (!log || typeof log.id !== "number") return;
          setChangeLogs((prev) => [log, ...prev].slice(0, 50));
        } catch (e) {
          console.error("Falha ao processar change log WS:", e);
        }
      });

      client.subscribe(`/user/queue/instrumentos/errors`, async (message: IMessage) => {
        const rawBody = typeof message.body === "string" ? message.body : "";
        let err: InstrumentoWsError | null = null;
        try {
          err = JSON.parse(rawBody) as InstrumentoWsError;
        } catch {
          setSaveStatus("error");
          pendingWsSaveRef.current = false;
          pendingWsSavedJsonRef.current = null;
          wsDirtyWhileSavingRef.current = false;
          setLastSaveError(
            `Erro WS (não-JSON): ${rawBody.slice(0, 280) || "<vazio>"}`
          );
          return;
        }

        if (!err?.code) {
          setSaveStatus("error");
          pendingWsSaveRef.current = false;
          pendingWsSavedJsonRef.current = null;
          wsDirtyWhileSavingRef.current = false;
          setLastSaveError(
            `Erro WS (sem code): ${rawBody.slice(0, 280) || "<vazio>"}`
          );
          return;
        }

        // Com a mesma conta aberta em múltiplas abas, o destino /user/** pode
        // entregar a mensagem para todas as sessões. Filtramos por clientId.
        if (err.clientId && err.clientId !== clientIdRef.current) {
          return;
        }

        // Por padrão, liberamos as flags para permitir novas tentativas.
        // (Vamos ajustar o saveStatus dependendo do tipo de erro.)
        pendingWsSaveRef.current = false;
        pendingWsSavedJsonRef.current = null;
        wsDirtyWhileSavingRef.current = false;

        if (err.code === "VERSION_CONFLICT") {
          // Conflito é esperado em cenários de edição rápida/concorrente.
          // Não "pisca" erro na UI quando vamos tentar novamente.
          setSaveStatus("saving");
          setLastSaveError(
            `VERSION_CONFLICT${err.message ? `: ${err.message}` : ""}`
          );

          const parsed = parseVersionConflictMessage(err.message || "");
          if (typeof parsed.actual === "number") {
            setInstrumentoVersion(parsed.actual);
            versionRef.current = parsed.actual;
          }

          // Tentativa automática (rate-limited): re-publica o snapshot local mais recente
          // com a versão atualizada, sem sobrescrever o estado local com o backend.
          const now = Date.now();
          const last = conflictRetryRef.current;
          const sameActual =
            typeof parsed.actual === "number" && last.lastActual === parsed.actual;
          const tooSoon = now - last.lastAt < 1500;

          if (!tooSoon || !sameActual) {
            conflictRetryRef.current = {
              lastAt: now,
              lastActual: typeof parsed.actual === "number" ? parsed.actual : null,
            };

            if (dirtySinceLastPersistRef.current) {
              window.setTimeout(() => {
                setSaveStatus("saving");
                const ok = publishWsSnapshot(undefined, "INTERNAL_RETRY");
                if (!ok) setSaveStatus("error");
              }, 150);
              return;
            }
          }

          // Se não fizer retry automático (muitas colisões), faz resync completo.
          setSaveStatus("error");
          try {
            const res = await Requests.getInstrumentoByTurma(turmaId);
            if (res.ok) {
              const data = await res.json();
              const raw = data?.slidesJson;
              const versionRaw = data?.version;
              if (typeof versionRaw === "number") {
                setInstrumentoVersion(versionRaw);
                versionRef.current = versionRaw;
              }
              if (typeof raw === "string") {
                const parsedSlides = JSON.parse(raw);
                if (Array.isArray(parsedSlides)) {
                  applyingRemoteRef.current = true;
                  suppressAutosaveUntilRef.current = Math.max(
                    suppressAutosaveUntilRef.current,
                    Date.now() + 1200
                  );
                  setSlides(parsedSlides as Slide[]);
                  try {
                    lastSavedSlidesJsonRef.current = JSON.stringify(parsedSlides);
                  } catch {}
                  dirtySinceLastPersistRef.current = false;
                  window.setTimeout(() => {
                    applyingRemoteRef.current = false;
                  }, 0);
                }
              }
            }
          } catch (e) {
            console.error("Falha ao ressincronizar após conflito:", e);
            setLastSaveError(
              e instanceof Error
                ? `Falha ao ressincronizar: ${e.message}`
                : "Falha ao ressincronizar"
            );
          }
          return;
        }

        // Outros erros: exibir como erro.
        setSaveStatus("error");
        setLastSaveError(`${err.code}${err.message ? `: ${err.message}` : ""}`);
      });
    };

    client.onWebSocketClose = () => {
      setWsConnected(false);
      setLastSaveError("WS desconectado");
    };
    client.onStompError = () => {
      setWsConnected(false);
      setLastSaveError("Erro no STOMP/WS");
    };

    stompClientRef.current = client;
    client.activate();

    return () => {
      setWsConnected(false);
      try {
        client.deactivate();
      } catch {}
      stompClientRef.current = null;
    };
  }, [turmaId, loadedFromApi]);

  const publishWsSnapshot = useCallback(
    (summary?: string, eventType?: string) => {
      if (!turmaId) return false;
      const client = stompClientRef.current;
      if (!client || !client.connected) {
        setLastSaveError("WS não conectado");
        return false;
      }

      // Garantia de ordem: apenas um save por vez.
      if (pendingWsSaveRef.current) {
        wsDirtyWhileSavingRef.current = true;
        return true;
      }

      try {
        pendingWsSaveRef.current = true;
        try {
          pendingWsSavedJsonRef.current = JSON.stringify(slidesRef.current);
        } catch {
          pendingWsSavedJsonRef.current = null;
        }
        setLastSaveError(null);
        const effectiveEventType =
          eventType && eventType.trim() ? eventType.trim() : "SNAPSHOT_UPDATE";
        client.publish({
          destination: "/app/instrumentos/update",
          body: JSON.stringify({
            turmaId,
            slides: slidesRef.current,
            expectedVersion: versionRef.current,
            clientId: clientIdRef.current,
            eventType: effectiveEventType,
            summary: summary || "Atualizou o instrumento",
          }),
        });
        return true;
      } catch (e) {
        console.error("Falha ao publicar snapshot via WS:", e);
        setLastSaveError(
          e instanceof Error ? e.message : "Falha ao publicar snapshot via WS"
        );
        pendingWsSaveRef.current = false;
        return false;
      }
    },
    [turmaId]
  );

  // Auto-save: se houver turmaId, salva via PUT com debounce; senão, fallback localStorage
  useEffect(() => {
    if (turmaId) {
      // Se não conseguiu carregar do backend, não deve tentar criar/salvar via API.
      if (!canSaveToApi) {
        return;
      }
      // Evita salvar enquanto ainda está carregando do backend
      if (loading) {
        return;
      }

      // Evita re-trigger por atualizações remotas
      if (applyingRemoteRef.current) {
        return;
      }

      // Evita ping-pong: logo após aplicar snapshot remoto/hidratação/resync,
      // ignore alterações derivadas (re-render/normalização) por um curto período.
      if (Date.now() < suppressAutosaveUntilRef.current) {
        return;
      }

      // Se não houve mudança local desde o último persist, não agendar nada.
      if (!dirtySinceLastPersistRef.current) {
        return;
      }

      // Se já existe um save WS em voo, não fique re-agendando.
      if (wsConnected && pendingWsSaveRef.current) {
        return;
      }

      // Evita salvar quando o conteúdo não mudou.
      let currentJson = "";
      try {
        currentJson = JSON.stringify(slides);
      } catch {
        // Se não conseguir serializar (improvável), permite tentar salvar.
        currentJson = "";
      }
      if (currentJson && currentJson === lastSavedSlidesJsonRef.current) {
        return;
      }

      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(async () => {
        try {
          setSaveStatus("saving");
          setLastSaveError(null);
          // Quando WS estiver conectado, a persistência passa a ser via canal colaborativo.
          if (wsConnected) {
            const ok = publishWsSnapshot();
            if (!ok) {
              setSaveStatus("error");
            }
            return;
          }

          const res = shouldUsePost
            ? await Requests.createInstrumento(turmaId, slides)
            : await Requests.saveInstrumento(turmaId, slides);
          if (!res.ok) {
            throw new Error(`Falha ao salvar instrumento: HTTP ${res.status}`);
          }
          try {
            const dto = await res.json();
            if (typeof dto?.version === "number") {
              setInstrumentoVersion(dto.version);
              versionRef.current = dto.version;
            }
          } catch {}

          if (currentJson) {
            lastSavedSlidesJsonRef.current = currentJson;
          }

          dirtySinceLastPersistRef.current = false;

          if (shouldUsePost) setShouldUsePost(false);
          setSaveStatus("saved");
          window.setTimeout(() => setSaveStatus("idle"), 1200);
        } catch (e) {
          console.error("Erro ao salvar slides na API:", e);
          setLastSaveError(e instanceof Error ? e.message : String(e));
          setSaveStatus("error");
        }
      }, 600);
      return () => {
        if (saveTimeoutRef.current) {
          window.clearTimeout(saveTimeoutRef.current);
        }
      };
    } else {
      // Persistência local (fallback)
      savePublicationToStorage(slides);
    }
  }, [
    slides,
    turmaId,
    loading,
    shouldUsePost,
    canSaveToApi,
    wsConnected,
    publishWsSnapshot,
  ]);

  const handleManualSave = async () => {
    if (!turmaId) return;
    if (!canSaveToApi) return;
    try {
      setSaveStatus("saving");
      setLastSaveError(null);

      if (wsConnected) {
        const ok = publishWsSnapshot("Salvou manualmente");
        if (!ok) setSaveStatus("error");
        return;
      }

      const res = shouldUsePost
        ? await Requests.createInstrumento(turmaId, slides)
        : await Requests.saveInstrumento(turmaId, slides);
      if (!res.ok) {
        throw new Error(`Falha ao salvar instrumento: HTTP ${res.status}`);
      }
      try {
        const dto = await res.json();
        if (typeof dto?.version === "number") {
          setInstrumentoVersion(dto.version);
          versionRef.current = dto.version;
        }
      } catch {}

      try {
        lastSavedSlidesJsonRef.current = JSON.stringify(slides);
      } catch {}
      dirtySinceLastPersistRef.current = false;

      if (shouldUsePost) setShouldUsePost(false);
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 1200);
    } catch (e) {
      console.error("Erro ao salvar slides na API:", e);
      setLastSaveError(e instanceof Error ? e.message : String(e));
      setSaveStatus("error");
    }
  };

  /**
   * Regra de UX/segurança:
   * - Se a página foi aberta com `turmaId`, só renderizamos o editor quando a API confirmou
   *   que existe um instrumento para essa turma (`loadedFromApi`).
   * - Enquanto está carregando (ou redirecionando para not-found), o retorno é `null`.
   */
  const shouldRenderEditor =
    !isRedirecting && (!turmaId || (!loading && loadedFromApi));

  const currentSlide = slides.find((s) => s.id === currentSlideId) || slides[0];
  const slideTags = currentSlide?.tags ?? [];
  const [filterTag, setFilterTag] = useState("");
  const [filterInstrument, setFilterInstrument] = useState("");
  const filteredSlides = slides.filter((s) => {
    const matchesTag = filterTag
      ? (s.tags ?? []).some((t) =>
          t.toLowerCase().includes(filterTag.toLowerCase())
        )
      : true;
    const matchesInstrument = filterInstrument
      ? (s.instrument ?? "") === filterInstrument
      : true;
    return matchesTag && matchesInstrument;
  });

  const handleSlideChange = (id: number) => {
    setCurrentSlideId(id);
    const element = document.getElementById(`slide-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleTextBoxSelection = (slideId: number, boxId: number) => {
    setSelectedTextBox({ slideId, boxId });
    setSelectedImage(null); // Desselecionar imagem ao selecionar textBox

    // Buscar os estilos da caixa de texto
    setTimeout(() => {
      const textElement = document.querySelector(
        `[data-box-id="${boxId}"]`
      ) as HTMLDivElement;
      if (textElement) {
        const fontSize = window.getComputedStyle(textElement).fontSize;
        const fontFamily = window.getComputedStyle(textElement).fontFamily;
        const textAlign =
          (window.getComputedStyle(textElement).textAlign as
            | "left"
            | "center"
            | "right"
            | "justify") || "left";

        // Extrair apenas o número do fontSize
        const sizeNumber = parseInt(fontSize) || 18;
        setSelectedBoxFontSize(sizeNumber.toString());
        setSelectedBoxFontFamily(fontFamily);
        setSelectedBoxAlign(textAlign);
      }
    }, 0);
  };

  // Quando o estado dos slides mudar (ex.: update remoto via WS), manter os controles
  // da toolbar em sincronia com a caixa atualmente selecionada.
  useEffect(() => {
    if (!selectedTextBox) return;
    const slide = slides.find((s) => s.id === selectedTextBox.slideId);
    const box = slide?.textBoxes.find((b) => b.id === selectedTextBox.boxId);
    if (!box) return;

    const nextSize = typeof box.fontSize === "number" ? String(box.fontSize) : "";
    const nextFamily = box.fontFamily || "";
    const nextAlign =
      (box.textAlign as "left" | "center" | "right" | "justify" | undefined) ||
      "left";

    setSelectedBoxFontSize(nextSize);
    setSelectedBoxFontFamily(nextFamily);
    setSelectedBoxAlign(nextAlign);
  }, [slides, selectedTextBox]);

  const clearSelection = () => {
    setSelectedTextBox(null);
    setSelectedImage(null);
  };

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Não des-selecionar ao interagir com modais (ex.: seletor de cor, cropper).
      if (target.closest(".modal-root")) return;

      // Não des-selecionar ao clicar na toolbar superior.
      if (target.closest(".toolbar")) return;

      // Se clicou fora da área do slide/canvas, des-seleciona.
      const clickedInsideSlides = Boolean(target.closest(".slide-canvas-container"));
      if (!clickedInsideSlides) {
        clearSelection();
      }
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  const handleImageSelection = (slideId: number, imgId: number) => {
    setSelectedImage({ slideId, imgId });
    setSelectedTextBox(null); // Desselecionar textBox ao selecionar imagem
  };

  const handleContentChange = (id: number, newContent: string) => {
    setSlides(
      slides.map((s) => (s.id === id ? { ...s, content: newContent } : s))
    );
  };

  const handleTextBoxChange = (
    slideId: number,
    boxId: number,
    content: string
  ) => {
    setSlides(
      slides.map((s) => {
        if (s.id === slideId) {
          return {
            ...s,
            textBoxes: s.textBoxes.map((box) =>
              box.id === boxId ? { ...box, content } : box
            ),
          };
        }
        return s;
      })
    );
  };

  const onTextBoxSaveSelection = (range: Range) => {
    savedRangeRef.current = range;
  };

  const handleTextBoxMove = (
    slideId: number,
    boxId: number,
    x: number,
    y: number
  ) => {
    setSlides(
      slides.map((s) => {
        if (s.id === slideId) {
          return {
            ...s,
            textBoxes: s.textBoxes.map((box) =>
              box.id === boxId ? { ...box, x, y } : box
            ),
          };
        }
        return s;
      })
    );
  };

  const handleTextBoxResize = (
    slideId: number,
    boxId: number,
    width: number,
    height: number
  ) => {
    setSlides(
      slides.map((s) => {
        if (s.id === slideId) {
          return {
            ...s,
            textBoxes: s.textBoxes.map((box) =>
              box.id === boxId ? { ...box, width, height } : box
            ),
          };
        }
        return s;
      })
    );
  };

  const handleTextBoxRotate = (slideId: number, boxId: number, deg: number) => {
    setSlides(
      slides.map((s) => {
        if (s.id === slideId) {
          return {
            ...s,
            textBoxes: s.textBoxes.map((box) =>
              box.id === boxId ? { ...box, rotation: deg } : box
            ),
          };
        }
        return s;
      })
    );
  };

  const handleImageMove = (
    slideId: number,
    imgId: number,
    x: number,
    y: number
  ) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id === slideId) {
          return {
            ...s,
            images: s.images.map((img) =>
              img.id === imgId ? { ...img, x, y } : img
            ),
          };
        }
        return s;
      })
    );
  };

  const handleImageResize = (
    slideId: number,
    imgId: number,
    width: number,
    height: number
  ) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id === slideId) {
          return {
            ...s,
            images: s.images.map((img) =>
              img.id === imgId ? { ...img, width, height } : img
            ),
          };
        }
        return s;
      })
    );
  };

  const handleImageRotate = (slideId: number, imgId: number, deg: number) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id === slideId) {
          return {
            ...s,
            images: s.images.map((img) =>
              img.id === imgId ? { ...img, rotation: deg } : img
            ),
          };
        }
        return s;
      })
    );
  };

  const onImageZIndex = (slideId: number, imgId: number, z: number) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id === slideId) {
          return {
            ...s,
            images: s.images.map((img) =>
              img.id === imgId ? { ...img, zIndex: z } : img
            ),
          };
        }
        return s;
      })
    );
  };

  const onTextBoxZIndex = (slideId: number, boxId: number, z: number) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id === slideId) {
          return {
            ...s,
            textBoxes: s.textBoxes.map((box) =>
              box.id === boxId ? { ...box, zIndex: z } : box
            ),
          };
        }
        return s;
      })
    );
  };

  const handleImageCropRequest = (slideId: number, imgId: number) => {
    const slide = slides.find((s) => s.id === slideId);
    const img = slide?.images.find((i) => i.id === imgId);
    if (img) {
      setCroppingImage({ slideId, imgId, src: img.src });
    }
  };

  const handleImageCropConfirm = (newSrc: string) => {
    if (!croppingImage) return;
    setSlides(
      slides.map((s) => {
        if (s.id === croppingImage.slideId) {
          return {
            ...s,
            images: s.images.map((img) =>
              img.id === croppingImage.imgId ? { ...img, src: newSrc } : img
            ),
          };
        }
        return s;
      })
    );
    setCroppingImage(null);
  };

  const handleImageDelete = (slideId: number, imgId: number) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id === slideId) {
          return {
            ...s,
            images: s.images.filter((img) => img.id !== imgId),
          };
        }
        return s;
      })
    );
  };

  const handleTextBoxDelete = (slideId: number, boxId: number) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id === slideId) {
          return {
            ...s,
            textBoxes: s.textBoxes.filter((box) => box.id !== boxId),
          };
        }
        return s;
      })
    );
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isDeleteKey = e.key === "Delete" || e.key === "Backspace";
      if (!isDeleteKey) return;

      const active = (document.activeElement as HTMLElement | null) ?? null;
      const tag = active?.tagName?.toLowerCase() || "";
      const isTypingTarget =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        Boolean(active && active.isContentEditable);

      // Se estiver editando texto, o Delete deve apagar caracteres, não o elemento.
      if (isTypingTarget) return;

      if (selectedImage) {
        e.preventDefault();
        handleImageDelete(selectedImage.slideId, selectedImage.imgId);
        clearSelection();
        return;
      }

      if (selectedTextBox) {
        e.preventDefault();
        handleTextBoxDelete(selectedTextBox.slideId, selectedTextBox.boxId);
        clearSelection();
      }
    };

    // Capture phase para garantir que pegamos o evento mesmo se algum componente interromper.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    selectedImage,
    selectedTextBox,
    handleImageDelete,
    handleTextBoxDelete,
    clearSelection,
  ]);

  // Navegação entre slides com setas (↑/↓)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (e.repeat) return;

      const active = (document.activeElement as HTMLElement | null) ?? null;
      const tag = active?.tagName?.toLowerCase() || "";
      const isTypingTarget =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        Boolean(active && active.isContentEditable);
      if (isTypingTarget) return;

      // Se houver modificadores, não interfere (ex: Alt+seta, etc.)
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      if (!filteredSlides.length) return;
      const currentIdx = Math.max(
        0,
        filteredSlides.findIndex((s) => s.id === currentSlideId)
      );

      const delta = e.key === "ArrowDown" ? 1 : -1;
      const nextIdx = currentIdx + delta;
      if (nextIdx < 0 || nextIdx >= filteredSlides.length) return;

      e.preventDefault();
      clearSelection();
      handleSlideChange(filteredSlides[nextIdx].id);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [filteredSlides, currentSlideId, handleSlideChange, clearSelection]);

  const handleDeleteSlide = (slideId: number) => {
    if (slides.length <= 1) return; // Não permitir deletar se houver apenas um slide
    const newSlides = slides.filter((s) => s.id !== slideId);
    setSlides(newSlides);
    if (currentSlideId === slideId) {
      // Se o slide atual foi deletado, selecione o primeiro slide restante
      setCurrentSlideId(newSlides[0].id);
    }
  };

  const addTextBox = () => {
    setSlides(
      slides.map((s) => {
        if (s.id === currentSlideId) {
          const maxZImg = Math.max(
            0,
            ...(s.images.map((i) => i.zIndex ?? 0) || [0])
          );
          const maxZBox = Math.max(
            0,
            ...(s.textBoxes.map((b) => b.zIndex ?? 0) || [0])
          );
          const nextZ = Math.max(maxZImg, maxZBox) + 1;
          return {
            ...s,
            textBoxes: [
              ...s.textBoxes,
              {
                id: Date.now(),
                x: 50,
                y: 50,
                width: 150,
                height: 30,
                content: "Novo Texto",
                zIndex: nextZ,
              },
            ],
          };
        }
        return s;
      })
    );
  };

  const applyStyle = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const applyTextBoxFormatting = (command: string) => {
    if (!selectedTextBox) return;

    const textElement = document.querySelector(
      `[data-box-id="${selectedTextBox.boxId}"]`
    ) as HTMLDivElement;
    if (textElement) {
      const getSelectionOffsetsWithin = (
        root: HTMLElement,
        range: Range
      ): { start: number; end: number } | null => {
        try {
          const pre = range.cloneRange();
          pre.selectNodeContents(root);
          pre.setEnd(range.startContainer, range.startOffset);
          const start = pre.toString().length;

          const pre2 = range.cloneRange();
          pre2.selectNodeContents(root);
          pre2.setEnd(range.endContainer, range.endOffset);
          const end = pre2.toString().length;

          return { start, end };
        } catch {
          return null;
        }
      };

      const createRangeFromOffsets = (
        root: HTMLElement,
        start: number,
        end: number
      ): Range | null => {
        const doc = root.ownerDocument;
        if (!doc) return null;

        const range = doc.createRange();
        let current = 0;
        let startNode: Text | null = null;
        let endNode: Text | null = null;
        let startOffset = 0;
        let endOffset = 0;

        const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode() as Text | null;
        while (node) {
          const len = node.nodeValue?.length ?? 0;

          if (!startNode && current + len >= start) {
            startNode = node;
            startOffset = Math.max(0, start - current);
          }

          if (!endNode && current + len >= end) {
            endNode = node;
            endOffset = Math.max(0, end - current);
            break;
          }

          current += len;
          node = walker.nextNode() as Text | null;
        }

        if (!startNode || !endNode) return null;
        try {
          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);
          return range;
        } catch {
          return null;
        }
      };

      // Para backColor (highlight), abrir modal
      if (command === "backColor") {
        // Inicializa o modal com a cor atual da caixa (se houver), para o HEX já aparecer correto.
        const getHexFromCssColor = (css: string): string | null => {
          const v = (css || "").trim();
          if (!v) return null;
          // Já é HEX
          if (v.startsWith("#")) return v.toUpperCase();
          // rgb/rgba
          const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
          if (!m) return null;
          const r = Math.max(0, Math.min(255, parseInt(m[1] || "0", 10)));
          const g = Math.max(0, Math.min(255, parseInt(m[2] || "0", 10)));
          const b = Math.max(0, Math.min(255, parseInt(m[3] || "0", 10)));
          const toHex2 = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
          return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
        };

        const stateColor =
          slides
            .find((s) => s.id === selectedTextBox.slideId)
            ?.textBoxes.find((b) => b.id === selectedTextBox.boxId)?.color ??
          "";

        const cssColor = (() => {
          try {
            return window.getComputedStyle(textElement).color;
          } catch {
            return "";
          }
        })();

        const initial =
          getHexFromCssColor(stateColor) || getHexFromCssColor(cssColor);
        if (initial) {
          setColorModalInitialHex(initial);
        }
        setShowColorModal(true);
      } else if (
        command === "bold" ||
        command === "italic" ||
        command === "underline"
      ) {
        // Aplica apenas no texto selecionado dentro da caixa (não no componente inteiro).
        const selection = window.getSelection();
        // Preferir a seleção atual; fallback para o último range salvo.
        const range =
          selection && selection.rangeCount > 0
            ? selection.getRangeAt(0)
            : savedRangeRef.current;

        // Precisa ter uma seleção válida e não colapsada (usuário "arrastou" / selecionou).
        if (!range || range.collapsed) {
          return;
        }

        const containerNode = range.commonAncestorContainer;
        const containerEl =
          containerNode.nodeType === Node.ELEMENT_NODE
            ? (containerNode as Element)
            : containerNode.parentElement;

        // Garantia: não formatar seleção fora desta caixa.
        if (!containerEl || !textElement.contains(containerEl)) {
          return;
        }

        const offsets = getSelectionOffsetsWithin(textElement, range);
        if (!offsets || offsets.start === offsets.end) {
          return;
        }

        try {
          textElement.focus();
        } catch {}

        try {
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch {
          // Se não conseguir restaurar a seleção, não aplica.
          return;
        }

        document.execCommand(command);

        // Persistir o HTML resultante no estado.
        const html = textElement.innerHTML;
        setSlides((prev) =>
          prev.map((s) => {
            if (s.id !== selectedTextBox.slideId) return s;
            return {
              ...s,
              textBoxes: s.textBoxes.map((box) =>
                box.id === selectedTextBox.boxId ? { ...box, content: html } : box
              ),
            };
          })
        );

        // Mantém a mesma seleção após aplicar o comando, para permitir clicar novamente
        // e "desaplicar" sem precisar selecionar de novo.
        window.setTimeout(() => {
          try {
            const selector = `[data-textbox-id="${selectedTextBox.slideId}__${selectedTextBox.boxId}"]`;
            const latestEl =
              (document.querySelector(selector) as HTMLDivElement | null) ||
              textElement;

            const nextRange = createRangeFromOffsets(
              latestEl,
              offsets.start,
              offsets.end
            );
            if (!nextRange) return;
            const sel = window.getSelection();
            if (!sel) return;
            sel.removeAllRanges();
            sel.addRange(nextRange);
            savedRangeRef.current = nextRange;
          } catch {}
        }, 0);
      }

      // Dispara o evento de input para recalcular altura
      setTimeout(() => {
        if (textElement) {
          const event = new Event("input", { bubbles: true });
          textElement.dispatchEvent(event);
        }
      }, 0);
    }
  };

  const applyColorHighlight = (color: string) => {
    if (!selectedTextBox) return;

    const textElement = document.querySelector(
      `[data-box-id="${selectedTextBox.boxId}"]`
    ) as HTMLDivElement;
    if (textElement) {
      textElement.style.color = color;

      // Atualizar no estado
      setSlides(
        slides.map((s) => {
          if (s.id === selectedTextBox.slideId) {
            return {
              ...s,
              textBoxes: s.textBoxes.map((box) =>
                box.id === selectedTextBox.boxId
                  ? {
                      ...box,
                      color: color,
                    }
                  : box
              ),
            };
          }
          return s;
        })
      );

      // Dispara o evento de input para recalcular altura
      setTimeout(() => {
        if (textElement) {
          const event = new Event("input", { bubbles: true });
          textElement.dispatchEvent(event);
        }
      }, 0);
    }

    setShowColorModal(false);
  };

  type DepthStackItem =
    | {
        kind: "image";
        id: number;
        z: number;
        label: string;
        meta?: string;
        locked: boolean;
      }
    | {
        kind: "text";
        id: number;
        z: number;
        label: string;
        meta?: string;
        locked: boolean;
      };

  const getCurrentSlideForDepth = () =>
    slides.find((s) => s.id === currentSlideId) || null;

  const getDepthStack = (): DepthStackItem[] => {
    const slide = getCurrentSlideForDepth();
    if (!slide) return [];

    const strip = (html: string) => {
      try {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        return (tmp.textContent || tmp.innerText || "").trim();
      } catch {
        return (html || "").replace(/<[^>]*>/g, "").trim();
      }
    };

    const items: DepthStackItem[] = [
      ...slide.images.map((i) => ({
        kind: "image" as const,
        id: i.id,
        z: i.zIndex ?? 1,
        label: "Imagem",
        meta: `${i.width}×${i.height}px`,
        locked: Boolean(i.locked),
      })),
      ...slide.textBoxes.map((b) => {
        const text = strip(b.content);
        const short = text.length > 24 ? `${text.slice(0, 24)}…` : text;
        return {
          kind: "text" as const,
          id: b.id,
          z: b.zIndex ?? 1,
          label: short ? `Texto: ${short}` : "Texto",
          locked: Boolean(b.locked),
        };
      }),
    ];

    // Ordena por z (menor atrás), com desempate estável.
    items.sort((a, b) => {
      const dz = (a.z ?? 0) - (b.z ?? 0);
      if (dz !== 0) return dz;
      if (a.kind !== b.kind) return a.kind === "image" ? -1 : 1;
      return a.id - b.id;
    });
    // A lista exibida será do maior z -> menor z.
    return items.reverse();
  };

  const applyDepthOrder = (orderedTopToBottom: DepthStackItem[]) => {
    const n = orderedTopToBottom.length;
    if (n === 0) return;
    const nextZByKey = new Map<string, number>();
    orderedTopToBottom.forEach((it, idx) => {
      // topo = maior z
      nextZByKey.set(`${it.kind}:${it.id}`, n - idx);
    });

    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== currentSlideId) return s;
        return {
          ...s,
          images: s.images.map((img) => {
            const z = nextZByKey.get(`image:${img.id}`);
            return z === undefined ? img : { ...img, zIndex: z };
          }),
          textBoxes: s.textBoxes.map((box) => {
            const z = nextZByKey.get(`text:${box.id}`);
            return z === undefined ? box : { ...box, zIndex: z };
          }),
        };
      })
    );
  };

  const toggleDepthLock = (it: DepthStackItem) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== currentSlideId) return s;
        if (it.kind === "image") {
          return {
            ...s,
            images: s.images.map((img) =>
              img.id === it.id ? { ...img, locked: !Boolean(img.locked) } : img
            ),
          };
        }
        return {
          ...s,
          textBoxes: s.textBoxes.map((box) =>
            box.id === it.id ? { ...box, locked: !Boolean(box.locked) } : box
          ),
        };
      })
    );
  };

  const applyTextBoxStyle = (
    property: "fontFamily" | "fontSize",
    value: string
  ) => {
    if (!selectedTextBox) return;

    const textElement = document.querySelector(
      `[data-box-id="${selectedTextBox.boxId}"]`
    ) as HTMLDivElement;
    if (textElement) {
      if (property === "fontSize") {
        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
          const clamped = Math.max(6, Math.min(120, numValue));
          textElement.style.fontSize = clamped + "px";

          // Atualizar no estado
          setSlides(
            slides.map((s) => {
              if (s.id === selectedTextBox.slideId) {
                return {
                  ...s,
                  textBoxes: s.textBoxes.map((box) =>
                    box.id === selectedTextBox.boxId
                      ? {
                          ...box,
                          fontSize: clamped,
                        }
                      : box
                  ),
                };
              }
              return s;
            })
          );
        }
      } else if (property === "fontFamily") {
        textElement.style.fontFamily = value;

        // Atualizar no estado
        setSlides(
          slides.map((s) => {
            if (s.id === selectedTextBox.slideId) {
              return {
                ...s,
                textBoxes: s.textBoxes.map((box) =>
                  box.id === selectedTextBox.boxId
                    ? {
                        ...box,
                        fontFamily: value,
                      }
                    : box
                ),
              };
            }
            return s;
          })
        );
      }

      // Dispara o evento de input para recalcular altura
      setTimeout(() => {
        if (textElement) {
          const event = new Event("input", { bubbles: true });
          textElement.dispatchEvent(event);
        }
      }, 0);
    }
  };

  const applyTextAlign = (align: "left" | "center" | "right" | "justify") => {
    if (!selectedTextBox) return;

    const textElement = document.querySelector(
      `[data-box-id="${selectedTextBox.boxId}"]`
    ) as HTMLDivElement;
    if (textElement) {
      textElement.style.textAlign = align;

      // Atualizar no estado
      setSlides(
        slides.map((s) => {
          if (s.id === selectedTextBox.slideId) {
            return {
              ...s,
              textBoxes: s.textBoxes.map((box) =>
                box.id === selectedTextBox.boxId
                  ? {
                      ...box,
                      textAlign: align,
                    }
                  : box
              ),
            };
          }
          return s;
        })
      );

      // Dispara o evento de input para recalcular altura
      setTimeout(() => {
        if (textElement) {
          const event = new Event("input", { bubbles: true });
          textElement.dispatchEvent(event);
        }
      }, 0);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    (async () => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const targetSlide = slides.find((s) => s.id === currentSlideId);
        const maxZImg = Math.max(
          0,
          ...(targetSlide?.images.map((i) => i.zIndex ?? 0) || [0])
        );
        const maxZBox = Math.max(
          0,
          ...(targetSlide?.textBoxes.map((b) => b.zIndex ?? 0) || [0])
        );
        const nextZ = Math.max(maxZImg, maxZBox) + 1;

        let imgSrc: string | null = null;
        if (turmaId) {
          const res = await Requests.uploadInstrumentoImage(file);
          if (res.ok) {
            const relativeUrl = (await res.text()) || ""; // e.g., /api/instrumentos/images/123
            // Tenta extrair o ID para usar o helper de URL absoluta
            const match = relativeUrl.match(/\/images\/(\d+)/);
            if (match && match[1]) {
              const idNum = parseInt(match[1], 10);
              if (!isNaN(idNum)) {
                imgSrc = Requests.getInstrumentoImageUrl(idNum);
              }
            }
            // Caso não seja possível extrair o ID, montar a URL absoluta manualmente
            if (!imgSrc) {
              const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(
                /\/$/,
                ""
              );
              imgSrc = `${base}${
                relativeUrl.startsWith("/") ? relativeUrl : `/${relativeUrl}`
              }`;
            }
          } else {
            console.error("Falha no upload. Fallback para base64.");
          }
        }

        if (!imgSrc) {
          // Fallback local: base64
          const reader = new FileReader();
          const dataUrl: string = await new Promise((resolve) => {
            reader.onload = (ev) =>
              resolve((ev.target?.result as string) || "");
            reader.readAsDataURL(file);
          });
          imgSrc = dataUrl;
        }

        const measureImage = async (src: string) => {
          return await new Promise<{ w: number; h: number }>((resolve) => {
            const probe = new Image();
            probe.onload = () => {
              const w = probe.naturalWidth || probe.width || 0;
              const h = probe.naturalHeight || probe.height || 0;
              resolve({ w: w || 200, h: h || 200 });
            };
            probe.onerror = () => resolve({ w: 200, h: 200 });
            probe.src = src;
          });
        };

        // Definir tamanho inicial preservando proporção (evita "quadrado"/stretch).
        const natural = await measureImage(imgSrc);
        const maxInitialW = 320;
        const maxInitialH = 240;
        const scale = Math.min(
          1,
          maxInitialW / Math.max(1, natural.w),
          maxInitialH / Math.max(1, natural.h)
        );
        const initialW = Math.max(80, Math.round(natural.w * scale));
        const initialH = Math.max(80, Math.round(natural.h * scale));

        const newImage: SlideImage = {
          id: Date.now(),
          x: 50,
          y: 50,
          width: initialW,
          height: initialH,
          src: imgSrc,
          zIndex: nextZ,
        };

        setSlides((prevSlides) =>
          prevSlides.map((s) => {
            if (s.id === currentSlideId) {
              return { ...s, images: [...s.images, newImage] };
            }
            return s;
          })
        );
      } finally {
        e.target.value = "";
      }
    })();
  };

  const exportToJSON = () => {
    const json = JSON.stringify(slides, null, 2);
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(json)
    );
    element.setAttribute("download", "publication.json");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const importFromJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          if (Array.isArray(json)) {
            setSlides(json);
            savePublicationToStorage(json);
            alert("Publicação importada com sucesso!");
          } else {
            alert("Formato de arquivo inválido. Esperado um array de slides.");
          }
        } catch (error) {
          alert("Erro ao importar arquivo: " + error);
        }
      };
      reader.readAsText(e.target.files[0]);
      e.target.value = "";
    }
  };
  
  return shouldRenderEditor ? (
    <div className="editor-container">
      {loading && <div style={{ padding: 16 }}>Carregando instrumento...</div>}
      {/* Lateral Esquerda: Miniaturas */}
      <aside className="thumbnails-sidebar">
        {/* Filtros de busca por tag e instrumento */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 8,
          }}
        >
          <input
            type="text"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            placeholder="Pesquisar por tag"
            style={{
              padding: "8px 10px",
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
          <select
            value={filterInstrument}
            onChange={(e) => setFilterInstrument(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          >
            <option value="">Filtrar por instrumento</option>
            <option value="Capa">Capa</option>
            <option value="Ficha técnica">Ficha técnica</option>
            <option value="Informações sobre a escola">
              Informações sobre a escola
            </option>
            <option value="Informações sobre a turma">
              Informações sobre a turma
            </option>
            <option value="Prefiguração do espaço">
              Prefiguração do espaço
            </option>
            <option value="Jornada educativa">Jornada educativa</option>
            <option value="Atividades de atenção pessoal">
              Atividades de atenção pessoal
            </option>
            <option value="Processo de pesquisa do professor">
              Processo de pesquisa do professor
            </option>
            <option value="Fato observado e refletido">
              Fato observado e refletido
            </option>
            <option value="Âmbito conceitual">Âmbito conceitual</option>
            <option value="Perguntas generativas">Perguntas generativas</option>
            <option value="Planejamento de sessão semanal">
              Planejamento de sessão semanal
            </option>
            <option value="Observáveis da semana">Observáveis da semana</option>
            <option value="Mini-história">Mini-história</option>
            <option value="Reflexão semanal">Reflexão semanal</option>
            <option value="Instrumento de acompanhamento – CP">
              Instrumento de acompanhamento – CP
            </option>
          </select>
        </div>
        {filteredSlides.map((slide, index) => (
          <ThumbnailItem
            key={slide.id}
            slide={slide}
            index={index}
            isActive={slide.id === currentSlideId}
            onClick={() => handleSlideChange(slide.id)}
            onDelete={() => handleDeleteSlide(slide.id)}
          />
        ))}
        <button
          className="add-slide-btn"
          onClick={() =>
            setSlides([
              ...slides,
              {
                id: Date.now(),
                content: "Novo Slide",
                styles: { fontSize: "24px", fontFamily: "Nunito"},
                textBoxes: [],
                images: [],
              },
            ])
          }
        >
          +
        </button>
      </aside>

      {/* Área Central: Editor */}
      <main className="editor-main">
        <div className="toolbar">
          {/* Botão de salvar + indicador com largura reservada (evita a toolbar “mexer” quando o texto muda). */}
          <div className="save-block">
            <button
              onClick={handleManualSave}
              disabled={!turmaId || saveStatus === "saving"}
              title={turmaId ? "Salvar publicação" : "Selecione uma turma"}
              className={
                "save-button" +
                (saveStatus === "saving" ? " save-button--saving" : "")
              }
            >
              <span className="save-button__label">
                {saveStatus === "saving" ? "Salvando..." : "Salvar"}
              </span>
            </button>
            <span
              aria-live="polite"
              className={
                "save-status" +
                (saveStatus === "saved"
                  ? " save-status--saved"
                  : saveStatus === "error"
                  ? " save-status--error"
                  : saveStatus === "saving"
                  ? " save-status--saving"
                  : "")
              }
            >
              {saveStatus === "saved"
                ? "Salvo"
                : saveStatus === "error"
                ? "Erro ao salvar"
                : saveStatus === "saving"
                ? "Salvando..."
                : ""}
            </span>

            {saveStatus === "error" && lastSaveError ? (
              <div
                style={{
                  maxWidth: 420,
                  fontSize: 12,
                  color: "#b00020",
                  marginTop: 4,
                  lineHeight: 1.25,
                }}
              >
                {lastSaveError}
              </div>
            ) : null}

          </div><button
            type="button"
            onClick={addTextBox}
            className="toolbar-icon-btn"
            title="Adicionar caixa de texto"
          >
            <span className="toolbar-icon" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                width="18"
                height="18"
                className="toolbar-icon-svg"
              >
                <path
                  fill="currentColor"
                  d="m40-200 210-560h100l210 560h-96l-51-143H187l-51 143H40Zm176-224h168l-82-232h-4l-82 232Zm504 104v-120H600v-80h120v-120h80v120h120v80H800v120h-80Z"
                />
              </svg>
            </span>
          </button>
          <select
            disabled={selectedImage !== null}
            value={selectedBoxFontFamily}
            onChange={(e) =>
              selectedTextBox
                ? applyTextBoxStyle("fontFamily", e.target.value)
                : applyStyle("fontName", e.target.value)
            }
          >
            <option value="">Selecionar Fonte</option>
            <option value="Nunito">Nunito</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
          </select>
          <input
            disabled={selectedImage !== null}
            type="number"
            min="6"
            max="120"
            placeholder="Tamanho (6-120)"
            value={selectedBoxFontSize}
            onChange={(e) => {
              // Atualiza imediatamente (incluindo quando usa as setinhas do input number).
              // Importante: não fazemos clamp aqui para não atrapalhar digitação (ex: digitar 12).
              const raw = e.target.value;
              setSelectedBoxFontSize(raw);

              const value = parseInt(raw);
              const isValid = !Number.isNaN(value) && value >= 6 && value <= 120;
              if (isValid && selectedTextBox) {
                applyTextBoxStyle("fontSize", value.toString());
              }
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const value = parseInt(e.currentTarget.value);
              if (!Number.isNaN(value)) {
                const validValue = Math.max(6, Math.min(120, value));
                setSelectedBoxFontSize(validValue.toString());
                if (selectedTextBox) {
                  applyTextBoxStyle("fontSize", validValue.toString());
                }
              }
            }}
            onBlur={(e) => {
              const value = parseInt(e.target.value);
              if (!Number.isNaN(value)) {
                const validValue = Math.max(6, Math.min(120, value));
                setSelectedBoxFontSize(validValue.toString());
                if (selectedTextBox) {
                  applyTextBoxStyle("fontSize", validValue.toString());
                }
              }
            }}
          />
          <button
            disabled={selectedImage !== null}
            onMouseDown={(e) => {
              e.preventDefault();
              applyTextBoxFormatting("bold");
            }}
          >
            <b>B</b>
          </button>
          <button
            disabled={selectedImage !== null}
            onMouseDown={(e) => {
              e.preventDefault();
              applyTextBoxFormatting("italic");
            }}
          >
            <i>I</i>
          </button>
          <button
            disabled={selectedImage !== null}
            onMouseDown={(e) => {
              e.preventDefault();
              applyTextBoxFormatting("underline");
            }}
          >
            <u>U</u>
          </button>
          <button
            disabled={selectedImage !== null}
            onMouseDown={(e) => {
              e.preventDefault();
              applyTextBoxFormatting("backColor");
            }}
          >
            🎨
          </button>

          {/* Alinhamento de Texto (ícones) */}
          <div
            className="align-toggle"
            role="group"
            aria-label="Alinhamento de texto"
            title="Alinhamento de Texto"
          >
            <button
              type="button"
              className={
                "align-btn" +
                (selectedBoxAlign === "left" ? " align-btn--active" : "")
              }
              disabled={selectedImage !== null}
              onClick={() => {
                const align = "left" as const;
                setSelectedBoxAlign(align);
                applyTextAlign(align);
              }}
              aria-label="Alinhar à esquerda"
              title="Esquerda"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                width="20"
                height="20"
                className="align-icon"
              >
                <path
                  fill="currentColor"
                  d="M120-120v-80h720v80H120Zm0-160v-80h480v80H120Zm0-160v-80h720v80H120Zm0-160v-80h480v80H120Zm0-160v-80h720v80H120Z"
                />
              </svg>
            </button>

            <button
              type="button"
              className={
                "align-btn" +
                (selectedBoxAlign === "center" ? " align-btn--active" : "")
              }
              disabled={selectedImage !== null}
              onClick={() => {
                const align = "center" as const;
                setSelectedBoxAlign(align);
                applyTextAlign(align);
              }}
              aria-label="Centralizar"
              title="Centro"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                width="20"
                height="20"
                className="align-icon"
              >
                <path
                  fill="currentColor"
                  d="M120-120v-80h720v80H120Zm160-160v-80h400v80H280ZM120-440v-80h720v80H120Zm160-160v-80h400v80H280ZM120-760v-80h720v80H120Z"
                />
              </svg>
            </button>

            <button
              type="button"
              className={
                "align-btn" +
                (selectedBoxAlign === "right" ? " align-btn--active" : "")
              }
              disabled={selectedImage !== null}
              onClick={() => {
                const align = "right" as const;
                setSelectedBoxAlign(align);
                applyTextAlign(align);
              }}
              aria-label="Alinhar à direita"
              title="Direita"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                width="20"
                height="20"
                className="align-icon"
              >
                <path
                  fill="currentColor"
                  d="M120-760v-80h720v80H120Zm240 160v-80h480v80H360ZM120-440v-80h720v80H120Zm240 160v-80h480v80H360ZM120-120v-80h720v80H120Z"
                />
              </svg>
            </button>

            <button
              type="button"
              className={
                "align-btn" +
                (selectedBoxAlign === "justify" ? " align-btn--active" : "")
              }
              disabled={selectedImage !== null}
              onClick={() => {
                const align = "justify" as const;
                setSelectedBoxAlign(align);
                applyTextAlign(align);
              }}
              aria-label="Justificar"
              title="Justificado"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                width="20"
                height="20"
                className="align-icon"
              >
                <path
                  fill="currentColor"
                  d="M120-120v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Z"
                />
              </svg>
            </button>
          </div>
          <label className="image-upload-btn">
            Upload
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              hidden
            />
          </label>
        </div>

        <div className="slide-canvas-container">
          {filteredSlides.map((slide) => (
            <div key={slide.id} id={`slide-${slide.id}`}>
              <SlideItem
                slide={slide}
                isActive={slide.id === currentSlideId}
                onContentChange={handleContentChange}
                onTextBoxChange={handleTextBoxChange}
                onTextBoxMove={handleTextBoxMove}
                onTextBoxResize={handleTextBoxResize}
                onTextBoxRotate={handleTextBoxRotate}
                onImageMove={handleImageMove}
                onImageResize={handleImageResize}
                onImageRotate={handleImageRotate}
                onTextBoxZIndex={onTextBoxZIndex}
                onImageZIndex={onImageZIndex}
                onImageCrop={handleImageCropRequest}
                onImageDelete={handleImageDelete}
                onTextBoxDelete={handleTextBoxDelete}
                onFocus={setCurrentSlideId}
                onTextBoxSelect={handleTextBoxSelection}
                onImageSelect={handleImageSelection}
                onTextBoxSaveSelection={onTextBoxSaveSelection}
                selectedTextBox={selectedTextBox}
                selectedImage={selectedImage}
                onBackgroundClick={clearSelection}
              />
            </div>
          ))}
        </div>
      </main>

      {/* Lateral Direita: Opções */}
      <aside className="options-sidebar">
        <div className="options-group">
          <h2>Instrumento</h2>
          <select
            value={currentSlide?.instrument ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              const nextSlides = slides.map((s) =>
                s.id === currentSlideId ? { ...s, instrument: value } : s
              );
              setSlides(nextSlides);
            }}
            className="instrument-select"
          >
            <option value="">Selecione</option>
            <option value="Capa">Capa</option>
            <option value="Ficha técnica">Ficha técnica</option>
            <option value="Informações sobre a escola">
              Informações sobre a escola
            </option>
            <option value="Informações sobre a turma">
              Informações sobre a turma
            </option>
            <option value="Prefiguração do espaço">
              Prefiguração do espaço
            </option>
            <option value="Jornada educativa">Jornada educativa</option>
            <option value="Atividades de atenção pessoal">
              Atividades de atenção pessoal
            </option>
            <option value="Processo de pesquisa do professor">
              Processo de pesquisa do professor
            </option>
            <option value="Fato observado e refletido">
              Fato observado e refletido
            </option>
            <option value="Âmbito conceitual">Âmbito conceitual</option>
            <option value="Perguntas generativas">Perguntas generativas</option>
            <option value="Planejamento de sessão semanal">
              Planejamento de sessão semanal
            </option>
            <option value="Observáveis da semana">Observáveis da semana</option>
            <option value="Mini-história">Mini-história</option>
            <option value="Reflexão semanal">Reflexão semanal</option>
            <option value="Instrumento de acompanhamento – CP">
              Instrumento de acompanhamento – CP
            </option>
          </select>
        </div>

        <div className="options-group">
          <h2>Tags</h2>
          {/* Tags do slide selecionado */}
          {slideTags.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 8,
              }}
            >
              {slideTags.map((tag, idx) => (
                <span
                  key={`${tag}-${idx}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    border: "2px solid #f5a779",
                    borderRadius: 16,
                    color: "#000000",
                    background: "#f5d1bc",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                  title={tag}
                >
                  {tag}
                  <button
                    aria-label={`Remover tag ${tag}`}
                    onClick={() => {
                      const nextSlides = slides.map((s) => {
                        if (s.id !== currentSlideId) return s;
                        const nextTags = (s.tags ?? []).filter(
                          (_, i) => i !== idx
                        );
                        return { ...s, tags: nextTags };
                      });
                      setSlides(nextSlides);
                    }}
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "#f8894a",
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <textarea
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const value = tags.trim();
                if (value.length > 0) {
                  const nextSlides = slides.map((s) => {
                    if (s.id !== currentSlideId) return s;
                    const nextTags = [...(s.tags ?? []), value];
                    return { ...s, tags: nextTags };
                  });
                  setSlides(nextSlides);
                  setTags("");
                }
              }
            }}
            placeholder="Adicione comentários ou tags..."
            className="tags-input"
          />
        </div>

        <div className="options-group">
          <h2>Profundidade</h2>
          {(() => {
            const stack = getDepthStack();
            const hasItems = stack.length > 0;

            const isSelected = (it: { kind: string; id: number }) => {
              if (it.kind === "image") {
                return selectedImage?.imgId === it.id;
              }
              return selectedTextBox?.boxId === it.id;
            };

            const move = (fromIndex: number, delta: number) => {
              const next = [...stack];
              const toIndex = fromIndex + delta;
              if (toIndex < 0 || toIndex >= next.length) return;
              const tmp = next[fromIndex];
              next[fromIndex] = next[toIndex];
              next[toIndex] = tmp;
              applyDepthOrder(next);
            };

            return !hasItems ? (
              <div style={{ fontSize: 12, color: "#6B7280" }}>
                Nenhum elemento neste slide.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
                  
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    maxHeight: 260,
                    overflow: "auto",
                    paddingRight: 4,
                  }}
                >
                  {stack.map((it, idx) => {
                    const active = isSelected(it);
                    return (
                      <div
                        key={`${it.kind}:${it.id}`}
                        onClick={() => {
                          if (it.kind === "image") {
                            handleImageSelection(currentSlideId, it.id);
                          } else {
                            handleTextBoxSelection(currentSlideId, it.id);
                          }
                        }}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 8,
                          alignItems: "center",
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: active
                            ? "2px solid rgba(248,137,74,0.9)"
                            : "1px solid rgba(0,0,0,0.12)",
                          background: active ? "rgba(248,137,74,0.10)" : "#fff",
                          cursor: "pointer",
                        }}
                        title={`z-index: ${it.z}`}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#111827",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {it.kind === "image" ? "🖼️ " : "✏️ "}
                            {it.label}
                          </div>
                          {it.meta ? (
                            <div style={{ fontSize: 12, color: "#6B7280" }}>
                              {it.meta}
                            </div>
                          ) : null}
                        </div>

                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDepthLock(it);
                            }}
                            title={it.locked ? "Destravar" : "Travar"}
                            style={{
                              width: 34,
                              height: 30,
                              borderRadius: 8,
                              border: "1px solid rgba(0,0,0,0.15)",
                              background: it.locked
                                ? "rgba(17,24,39,0.08)"
                                : "#fff",
                              cursor: "pointer",
                              fontWeight: 900,
                            }}
                          >
                            {it.locked ? "🔒" : "🔓"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              move(idx, -1);
                            }}
                            disabled={idx === 0}
                            title="Mover para cima (mais à frente)"
                            style={{
                              width: 34,
                              height: 30,
                              borderRadius: 8,
                              border: "1px solid rgba(0,0,0,0.15)",
                              background: "#fff",
                              cursor: idx === 0 ? "not-allowed" : "pointer",
                              opacity: idx === 0 ? 0.5 : 1,
                              fontWeight: 900,
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              move(idx, +1);
                            }}
                            disabled={idx === stack.length - 1}
                            title="Mover para baixo (mais atrás)"
                            style={{
                              width: 34,
                              height: 30,
                              borderRadius: 8,
                              border: "1px solid rgba(0,0,0,0.15)",
                              background: "#fff",
                              cursor:
                                idx === stack.length - 1
                                  ? "not-allowed"
                                  : "pointer",
                              opacity: idx === stack.length - 1 ? 0.5 : 1,
                              fontWeight: 900,
                            }}
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>

        {turmaId && (
          <details className="change-log-panel">
            <summary>
              Log de alterações
              <span
                className={
                  "collab-indicator" +
                  (wsConnected
                    ? " collab-indicator--on"
                    : " collab-indicator--off")
                }
                title={
                  wsConnected
                    ? "Colaboração online (tempo real)"
                    : "Colaboração offline (fallback REST)"
                }
              >
                {wsConnected ? "online" : "offline"}
              </span>
            </summary>
            
            <div className="change-log-list">
              {visibleChangeLogs.length === 0 ? (
                <div className="change-log-empty">Nenhuma alteração recente</div>
              ) : (
                visibleChangeLogs.map((e) => (
                  <div key={e.id} className="change-log-item">
                    <div className="change-log-item__summary">{e.summary}</div>
                    <div className="change-log-item__meta">
                      <span className="change-log-item__actor">{e.actor}</span>
                      <span className="change-log-item__sep">·</span>
                      <span className="change-log-item__at">
                        {formatAt(e.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </details>
        )}

  
      </aside>

      {croppingImage && (
        <ImageCropper
          src={croppingImage.src}
          onConfirm={handleImageCropConfirm}
          onCancel={() => setCroppingImage(null)}
        />
      )}

      {showColorModal && (
        <ColorHighlightModal
          initialColor={colorModalInitialHex}
          onClose={() => setShowColorModal(false)}
          onApply={(hex) => applyColorHighlight(hex)}
        />
      )}
    </div>
  ) : null;
}
