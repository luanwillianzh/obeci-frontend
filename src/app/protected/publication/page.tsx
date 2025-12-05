"use client";
import { useState, useRef, useEffect } from "react";
import "./publication.css";

interface TextBox {
  id: number;
  x: number;
  y: number;
  content: string;
}

interface SlideImage {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
}

interface Slide {
  id: number;
  content: string; // Conteúdo de fundo (opcional)
  styles: React.CSSProperties;
  textBoxes: TextBox[];
  images: SlideImage[];
}

interface SlideItemProps {
  slide: Slide;
  isActive: boolean;
  onContentChange: (id: number, content: string) => void;
  onTextBoxChange: (slideId: number, boxId: number, content: string) => void;
  onTextBoxMove: (slideId: number, boxId: number, x: number, y: number) => void;
  onImageMove: (slideId: number, imgId: number, x: number, y: number) => void;
  onImageResize: (slideId: number, imgId: number, width: number, height: number) => void;
  onImageCrop: (slideId: number, imgId: number) => void;
  onImageDelete: (slideId: number, imgId: number) => void;
  onFocus: (id: number) => void;
}

const ImageCropper = ({ src, onConfirm, onCancel }: { src: string, onConfirm: (newSrc: string) => void, onCancel: () => void }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setImageSize({ width, height });
    setCrop({ x: width * 0.1, y: height * 0.1, width: width * 0.8, height: height * 0.8 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, width: crop.width, height: crop.height });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        let newX = e.clientX - dragStart.x;
        let newY = e.clientY - dragStart.y;

        // Constraints
        newX = Math.max(0, Math.min(newX, imageSize.width - crop.width));
        newY = Math.max(0, Math.min(newY, imageSize.height - crop.height));

        setCrop((prev) => ({ ...prev, x: newX, y: newY }));
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        let newWidth = resizeStart.width + deltaX;
        let newHeight = resizeStart.height + deltaY;

        // Constraints
        newWidth = Math.max(50, Math.min(newWidth, imageSize.width - crop.x));
        newHeight = Math.max(50, Math.min(newHeight, imageSize.height - crop.y));

        setCrop((prev) => ({ ...prev, width: newWidth, height: newHeight }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, imageSize, crop.x, crop.y, crop.width, crop.height]);

  const handleSave = () => {
    if (!imgRef.current) return;
    const canvas = document.createElement("canvas");
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.drawImage(
        imgRef.current,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
      onConfirm(canvas.toDataURL());
    }
  };

  return (
    <div className="cropper-modal">
      <div className="cropper-container">
        <div className="cropper-image-wrapper">
          <img ref={imgRef} src={src} onLoad={onImageLoad} draggable={false} alt="Crop Source" />
          <div
            className="crop-box"
            style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height }}
            onMouseDown={handleMouseDown}
          >
            <div className="crop-handle" onMouseDown={handleResizeMouseDown} />
          </div>
        </div>
        <div className="cropper-actions">
          <button onClick={handleSave}>Confirmar Corte</button>
          <button onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};

const DraggableResizableImage = ({
  img,
  onMove,
  onResize,
  onCrop,
  onDelete,
}: {
  img: SlideImage;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onCrop: () => void;
  onDelete: () => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Dragging Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - img.x,
      y: e.clientY - img.y,
    });
  };

  // Resizing Logic
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dragging when resizing
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: img.width,
      height: img.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        onMove(e.clientX - dragOffset.x, e.clientY - dragOffset.y);
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        onResize(resizeStart.width + deltaX, resizeStart.height + deltaY);
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart, onMove, onResize]);

  return (
    <div
      style={{
        position: "absolute",
        left: img.x,
        top: img.y,
        width: img.width,
        height: img.height,
        cursor: isDragging ? "grabbing" : "grab",
        border: isHovered ? "1px dashed #f8894a" : "1px dashed transparent",
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="draggable-image-container"
    >
      {isHovered && (
        <div className="image-toolbar">
          <button onClick={(e) => { e.stopPropagation(); onCrop(); }} title="Cortar">✂️</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Excluir">🗑️</button>
        </div>
      )}
      <img
        src={img.src}
        alt="Slide Image"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          pointerEvents: "none", // Prevent native drag
        }}
      />
      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "15px",
          height: "15px",
          background: "#f8894a",
          cursor: "se-resize",
          zIndex: 10,
        }}
      />
    </div>
  );
};

const DraggableTextBox = ({
  box,
  onMove,
  onChange,
}: {
  box: TextBox;
  onMove: (x: number, y: number) => void;
  onChange: (content: string) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== boxRef.current) return; // Só arrasta se clicar na borda/container, não no texto
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - box.x,
      y: e.clientY - box.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        onMove(e.clientX - dragOffset.x, e.clientY - dragOffset.y);
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, onMove]);

  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        minWidth: "150px",
        minHeight: "50px",
        border: "1px dashed #ccc",
        background: "rgba(255, 255, 255, 0.8)",
        cursor: isDragging ? "grabbing" : "grab",
        padding: "5px",
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        ref={boxRef}
        style={{
          position: "absolute",
          top: -10,
          left: -10,
          right: -10,
          bottom: -10,
          cursor: "move",
        }}
      />
      <div
        contentEditable
        suppressContentEditableWarning
        style={{
          width: "100%",
          height: "100%",
          outline: "none",
          cursor: "text",
          position: "relative",
          zIndex: 2,
        }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        dangerouslySetInnerHTML={{ __html: box.content }}
      />
    </div>
  );
};

const SlideItem = ({ slide, isActive, onContentChange, onTextBoxChange, onTextBoxMove, onImageMove, onImageResize, onImageCrop, onImageDelete, onFocus }: SlideItemProps) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current) {
      if (divRef.current !== document.activeElement && divRef.current.innerHTML !== slide.content) {
        divRef.current.innerHTML = slide.content;
      }
    }
  }, [slide.content]);

  useEffect(() => {
    if (divRef.current && divRef.current.innerHTML === "" && slide.content) {
        divRef.current.innerHTML = slide.content;
    }
  }, []);

  return (
    <div
      className={`slide-canvas ${isActive ? "active-slide" : ""}`}
      onFocus={() => onFocus(slide.id)}
      style={{
        fontFamily: "Nunito",
        marginBottom: "4rem",
        position: "relative", // Necessário para posicionamento absoluto dos filhos
      }}
    >
      {/* Camada de Fundo Editável (Texto Base) */}
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onContentChange(slide.id, e.currentTarget.innerHTML)}
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
          onCrop={() => onImageCrop(slide.id, img.id)}
          onDelete={() => onImageDelete(slide.id, img.id)}
        />
      ))}

      {/* Caixas de Texto Flutuantes */}
      {slide.textBoxes.map((box) => (
        <DraggableTextBox
          key={box.id}
          box={box}
          onMove={(x, y) => onTextBoxMove(slide.id, box.id, x, y)}
          onChange={(content) => onTextBoxChange(slide.id, box.id, content)}
        />
      ))}
    </div>
  );
};

export default function PublicacoesPage() {
  const [slides, setSlides] = useState<Slide[]>([
    { id: 1, content: "Slide 1 - Clique para editar", styles: { fontSize: "24px", fontWeight: "normal", fontStyle: "normal", textDecoration: "none", fontFamily: "Nunito" }, textBoxes: [], images: [] },
    { id: 2, content: "Slide 2", styles: { fontSize: "24px", fontWeight: "normal", fontStyle: "normal", textDecoration: "none", fontFamily: "Nunito" }, textBoxes: [], images: [] },
    { id: 3, content: "Slide 3", styles: { fontSize: "24px", fontWeight: "normal", fontStyle: "normal", textDecoration: "none", fontFamily: "Nunito" }, textBoxes: [], images: [] },
  ]);
  const [currentSlideId, setCurrentSlideId] = useState<number>(1);
  const [instrumento, setInstrumento] = useState("");
  const [tags, setTags] = useState("");
  const [croppingImage, setCroppingImage] = useState<{ slideId: number; imgId: number; src: string } | null>(null);
  const slideRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const currentSlide = slides.find((s) => s.id === currentSlideId) || slides[0];

  const handleSlideChange = (id: number) => {
    setCurrentSlideId(id);
    const element = document.getElementById(`slide-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleContentChange = (id: number, newContent: string) => {
    setSlides(
      slides.map((s) => (s.id === id ? { ...s, content: newContent } : s))
    );
  };

  const handleTextBoxChange = (slideId: number, boxId: number, content: string) => {
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

  const handleTextBoxMove = (slideId: number, boxId: number, x: number, y: number) => {
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

  const handleImageMove = (slideId: number, imgId: number, x: number, y: number) => {
    setSlides(
      slides.map((s) => {
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

  const handleImageResize = (slideId: number, imgId: number, width: number, height: number) => {
    setSlides(
      slides.map((s) => {
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
    setSlides(
      slides.map((s) => {
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

  const addTextBox = () => {
    setSlides(
      slides.map((s) => {
        if (s.id === currentSlideId) {
          return {
            ...s,
            textBoxes: [
              ...s.textBoxes,
              {
                id: Date.now(),
                x: 50,
                y: 50,
                content: "Novo Texto",
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const newImage: SlideImage = {
            id: Date.now(),
            x: 50,
            y: 50,
            width: 200,
            height: 200,
            src: ev.target.result as string,
          };

          setSlides((prevSlides) =>
            prevSlides.map((s) => {
              if (s.id === currentSlideId) {
                return { ...s, images: [...s.images, newImage] };
              }
              return s;
            })
          );
        }
      };
      reader.readAsDataURL(e.target.files[0]);
      e.target.value = "";
    }
  };

  return (
    <div className="editor-container">
      {/* Lateral Esquerda: Miniaturas */}
      <aside className="thumbnails-sidebar">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`thumbnail-item ${slide.id === currentSlideId ? "active" : ""}`}
            onClick={() => handleSlideChange(slide.id)}
          >
            <div className="thumbnail-preview">
              <div dangerouslySetInnerHTML={{ __html: slide.content }} />
            </div>
            <span className="slide-number">{index + 1}</span>
          </div>
        ))}
        <button
          className="add-slide-btn"
          onClick={() =>
            setSlides([
              ...slides,
              { id: Date.now(), content: "Novo Slide", styles: { fontSize: "24px", fontFamily: "Nunito" }, textBoxes: [], images: [] },
            ])
          }
        >
          +
        </button>
      </aside>

      {/* Área Central: Editor */}
      <main className="editor-main">
        <div className="toolbar">
          <select onChange={(e) => applyStyle("fontName", e.target.value)}>
            <option value="Nunito">Nunito</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
          </select>
          <select onChange={(e) => applyStyle("fontSize", e.target.value)}>
            <option value="3">Normal</option>
            <option value="1">Pequeno</option>
            <option value="5">Grande</option>
            <option value="7">Extra Grande</option>
          </select>
          <button onClick={() => applyStyle("bold")}><b>B</b></button>
          <button onClick={() => applyStyle("italic")}><i>I</i></button>
          <button onClick={() => applyStyle("underline")}><u>U</u></button>
          <button onClick={addTextBox}>Caixa de Texto</button>
          <label className="image-upload-btn">
            📷 Imagem
            <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
          </label>
        </div>

        <div className="slide-canvas-container">
          {slides.map((slide) => (
            <div key={slide.id} id={`slide-${slide.id}`}>
              <SlideItem
                slide={slide}
                isActive={slide.id === currentSlideId}
                onContentChange={handleContentChange}
                onTextBoxChange={handleTextBoxChange}
                onTextBoxMove={handleTextBoxMove}
                onImageMove={handleImageMove}
                onImageResize={handleImageResize}
                onImageCrop={handleImageCropRequest}
                onImageDelete={handleImageDelete}
                onFocus={setCurrentSlideId}
              />
            </div>
          ))}
        </div>
      </main>

      {/* Lateral Direita: Opções */}
      <aside className="options-sidebar">
        <div className="options-group">
          <h3>Instrumento</h3>
          <select
            value={instrumento}
            onChange={(e) => setInstrumento(e.target.value)}
            className="instrument-select"
          >
            <option value="">Selecione...</option>
            <option value="doc1">Documento 1</option>
            <option value="doc2">Documento 2</option>
            <option value="doc3">Documento 3</option>
            <option value="doc4">Documento 4</option>
            <option value="doc5">Documento 5</option>
            <option value="doc6">Documento 6</option>
          </select>
        </div>

        <div className="options-group">
          <h3>Tags</h3>
          <textarea
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Adicione comentários ou tags..."
            className="tags-input"
          />
        </div>
      </aside>

      {croppingImage && (
        <ImageCropper
          src={croppingImage.src}
          onConfirm={handleImageCropConfirm}
          onCancel={() => setCroppingImage(null)}
        />
      )}
    </div>
  );
}
