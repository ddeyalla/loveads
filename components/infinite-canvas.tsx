"use client";

// InfiniteCanvas – React Konva implementation inspired by Figma’s canvas UX.
// Features
// 1. Truly infinite stage (large background rect + draggable Stage)
// 2. Add multiple images in a row with 40 px gap
// 3. Select → resize / rotate via Transformer
// 4. Drag images smoothly; drag empty space to pan
// 5. Pinch / wheel zoom around cursor (or first touch midpoint)
// 6. Clean minimal state – no custom history layer (keep logic simple)

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Group, Line } from "react-konva";
import useImage from "use-image";
import Konva from "konva";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface CanvasImg {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

// Accepts an array of image objects for initialImages
export interface CanvasImgInput {
  id: string;
  src: string;
  width: number;
  height: number;
  rotation: number;
  x: number;
  y: number;
}

interface InfiniteCanvasProps {
  initialImages?: CanvasImgInput[];
  showGrid?: boolean;
}


const GAP = 40; // spacing when adding images in a row
const DEFAULT_W = 200;
const DEFAULT_H = 150;
const SCALE_BY = 1.04; // smoother zoom factor
const GRID_SIZE = 100;


const URLImage: React.FC<{
  img: CanvasImg;
  selected: boolean;
  onSelect: (id: string, e?: any) => void;
  onChange: (id: string, attrs: Partial<CanvasImg>) => void;
}> = ({ img, selected, onSelect, onChange }) => {
  const [image] = useImage(img.src, "anonymous");
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  // Attach transformer on selection
  useEffect(() => {
    if (selected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selected]);

  // Once natural sizes are available, update width/height
  useEffect(() => {
    if (image && (img.width === DEFAULT_W || img.height === DEFAULT_H)) {
      onChange(img.id, { width: image.width, height: image.height });
    }
  }, [image]);

  const commitPosition = () => {
    if (!shapeRef.current) return;
    onChange(img.id, { x: shapeRef.current.x(), y: shapeRef.current.y() });
  };

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={image}
        {...img}
        draggable
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(img.id, e.evt || e);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(img.id, e.evt || e);
        }}
        onDragStart={(e) => {
          e.target.getStage()?.draggable(false);
        }}
        onDragEnd={(e) => {
          e.target.getStage()?.draggable(true);
          commitPosition();
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange(img.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {selected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          boundBoxFunc={(oldB, newB) => (newB.width < 5 || newB.height < 5 ? oldB : newB)}
        />
      )}
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Main Component: InfiniteCanvas                                             */
/* -------------------------------------------------------------------------- */

const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({ initialImages = [], showGrid = false }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const groupRef = useRef<Konva.Group>(null);

  const [imgs, setImgs] = useState<CanvasImg[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // Multi-select
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // Undo/redo stacks
  const [undoStack, setUndoStack] = useState<CanvasImg[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasImg[][]>([]);

  // Push to undo stack on imgs change (not from undo/redo)
  useEffect(() => {
    setUndoStack((stack) => [...stack, imgs]);
    // Clear redo stack on normal change
    setRedoStack([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgs]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        setImgs((prev) => prev.filter(img => !selectedIds.includes(img.id)));
        setSelectedIds([]);
      }
      // Cmd/Ctrl+A: select all
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(imgs.map(img => img.id));
      }
      // Undo: Cmd+Z
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setUndoStack((prevUndo) => {
          if (prevUndo.length > 1) {
            setRedoStack((prevRedo) => [prevUndo[prevUndo.length - 1], ...prevRedo]);
            setImgs(prevUndo[prevUndo.length - 2]);
            return prevUndo.slice(0, -1);
          }
          return prevUndo;
        });
      }
      // Redo: Cmd+Y
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        setRedoStack((prevRedo) => {
          if (prevRedo.length > 0) {
            setUndoStack((prevUndo) => [...prevUndo, prevRedo[0]]);
            setImgs(prevRedo[0]);
            return prevRedo.slice(1);
          }
          return prevRedo;
        });
      }
      // Zoom in: Cmd/Ctrl + = or +
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setScale((s) => Math.min(10, s * 1.1));
      }
      // Zoom out: Cmd/Ctrl + -
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        setScale((s) => Math.max(0.1, s / 1.1));
      }
      // Bring forward: Cmd/Ctrl + ]
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        setImgs((prev) => {
          const indices = prev.map((img, i) => selectedIds.includes(img.id) ? i : -1).filter(i => i !== -1);
          if (indices.length === 0) return prev;
          const maxIdx = Math.max(...indices);
          if (maxIdx === prev.length - 1) return prev; // already at top
          // Move block up by 1
          const arr = [...prev];
          // Find the block
          const block = indices.map(i => arr[i]);
          // Remove block
          indices.sort((a, b) => b - a).forEach(i => arr.splice(i, 1));
          // Insert block after the next unselected
          arr.splice(maxIdx + 1 - indices.length + 1, 0, ...block);
          return arr;
        });
      }
      // Send backward: Cmd/Ctrl + [
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        setImgs((prev) => {
          const indices = prev.map((img, i) => selectedIds.includes(img.id) ? i : -1).filter(i => i !== -1);
          if (indices.length === 0) return prev;
          const minIdx = Math.min(...indices);
          if (minIdx === 0) return prev; // already at bottom
          // Move block down by 1
          const arr = [...prev];
          // Find the block
          const block = indices.map(i => arr[i]);
          // Remove block
          indices.sort((a, b) => b - a).forEach(i => arr.splice(i, 1));
          // Insert block before the previous unselected
          arr.splice(minIdx - 1, 0, ...block);
          return arr;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, imgs]);

  // Shift+click for multi-select
  const handleSelect = (id: string, e?: any) => {
    if (e && (e.evt?.shiftKey || e.shiftKey)) {
      setSelectedIds((prev) => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedIds([id]);
    }
  };

  // Deselect on empty space
  const handleStageMouseDown = (e: any) => {
    if (e.target === e.target.getStage()) setSelectedIds([]);
  };

  // Group drag
  const handleGroupDragMove = (e: any) => {
    const node = groupRef.current;
    if (!node) return;
    const { x: dx, y: dy } = node.position();
    setImgs((prev) => prev.map(img =>
      selectedIds.includes(img.id)
        ? { ...img, x: img.x + dx, y: img.y + dy }
        : img
    ));
    node.position({ x: 0, y: 0 });
  };

  // Helper to add a single image
  const addImage = (src: string, width: number, height: number) => {
    setImgs((prev) => {
      const startX = prev.length ? Math.max(...prev.map((i) => i.x + i.width)) + GAP : 0;
      const id = `user-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return [
        ...prev,
        {
          id,
          src,
          x: startX,
          y: 0,
          width: width || DEFAULT_W,
          height: height || DEFAULT_H,
          rotation: 0,
        },
      ];
    });
  };

  // Handle file input change (multiple images)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    // Find the rightmost x position of current images
    let startX = imgs.length ? Math.max(...imgs.map((i) => i.x + i.width)) + GAP : 0;
    const newImgsPromises = validFiles.map((file, idx) => {
      return new Promise<CanvasImg>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const src = ev.target?.result as string;
          const img = new window.Image();
          img.onload = () => {
            resolve({
              id: `user-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              src,
              x: startX + idx * (img.width + GAP),
              y: 0,
              width: img.width || DEFAULT_W,
              height: img.height || DEFAULT_H,
              rotation: 0,
            });
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(newImgsPromises).then((newImgs) => {
      setImgs((prev) => [...prev, ...newImgs]);
    });
    // Reset input so same file can be uploaded again
    e.target.value = "";
  };


  // Open file dialog
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };



  /* ------------------------- Image Utilities --------------------------- */
  const addImagesRow = useCallback((images: CanvasImgInput[]) => {
  setImgs((prev) => {
    const startX = prev.length ? Math.max(...prev.map((i) => i.x + i.width)) + GAP : 0;
    const newImgs: CanvasImg[] = images.map((img, i) => ({
      id: img.id || `${Date.now()}-${i}`,
      src: img.src,
      x: startX + i * (img.width || DEFAULT_W + GAP),
      y: 0,
      width: img.width || DEFAULT_W,
      height: img.height || DEFAULT_H,
      rotation: img.rotation || 0,
    }));
    return [...prev, ...newImgs];
  });
}, []);

  useEffect(() => {
    if (initialImages && initialImages.length) {
      addImagesRow(initialImages);
    }
  }, [initialImages, addImagesRow]);

  const updateImage = (id: string, attrs: Partial<CanvasImg>) => {
    setImgs((prev) => prev.map((img) => (img.id === id ? { ...img, ...attrs } : img)));
  };

  /* ------------------------- Zoom & Pan -------------------------------- */
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // where pointer is in world coordinates
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    // Reverse: pinch in (deltaY > 0) should zoom OUT, pinch out (deltaY < 0) should zoom IN
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;
    // Clamp scale for usability
    newScale = Math.max(0.1, Math.min(10, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setScale(newScale);
    setStagePos(newPos);
  };

  /* ------------------------- Rendering --------------------------------- */
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Floating upload button */}
      <button
        onClick={handleUploadClick}
        aria-label="Upload image to canvas"
        className="fixed top-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        style={{ position: 'absolute', top: 16, right: 16 }}
        tabIndex={0}
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-upload"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
        tabIndex={-1}
      />
      <Stage
      ref={stageRef}
      width={typeof window !== "undefined" ? window.innerWidth : 800}
      height={typeof window !== "undefined" ? window.innerHeight : 600}
      scaleX={scale}
      scaleY={scale}
      x={stagePos.x}
      y={stagePos.y}
      draggable
      onWheel={handleWheel}
      onMouseDown={(e) => {
        // deselect on empty area
        if (e.target === e.target.getStage()) setSelectedIds([]);
      }}
    >
      <Layer listening={false /* grid & bg and default objects not interactive */}>
        {/* massive background rect for infinite feeling */}
        <Rect x={-50000} y={-50000} width={100000} height={100000} fill="#fafafa" />
        {showGrid && (
          <Group>
            {Array.from({ length: 1000 }).map((_, i) => (
              <Line
                key={`h-${i}`}
                points={[-50000, -50000 + i * GRID_SIZE, 50000, -50000 + i * GRID_SIZE]}
                stroke="#eee"
                strokeWidth={1 / scale}
              />
            ))}
            {Array.from({ length: 1000 }).map((_, i) => (
              <Line
                key={`v-${i}`}
                points={[-50000 + i * GRID_SIZE, -50000, -50000 + i * GRID_SIZE, 50000]}
                stroke="#eee"
                strokeWidth={1 / scale}
              />
            ))}
          </Group>
        )}
      </Layer>

      <Layer>
        {/* Multi-select group */}
        {selectedIds.length > 1 && (
          <Group
            ref={groupRef}
            draggable
            onDragEnd={handleGroupDragMove}
          >
            {imgs.filter(img => selectedIds.includes(img.id)).map((img) => (
              <URLImage
                key={img.id}
                img={img}
                selected={selectedIds.includes(img.id)}
                onSelect={(id: string | null, e?: any) => id && handleSelect(id, e)}
                onChange={updateImage}
              />
            ))}
            <Transformer
              nodes={imgs.filter(img => selectedIds.includes(img.id)).map((_, i, arr) => {
                const node = stageRef.current?.findOne(`#${arr[i].id}`);
                return node;
              }).filter(Boolean)}
              rotateEnabled
              enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
            />
          </Group>
        )}
        {/* Individual selection or not selected */}
        {imgs.filter(img => selectedIds.length <= 1 || !selectedIds.includes(img.id)).map((img) => (
          <URLImage
            key={img.id}
            img={img}
            selected={selectedIds.includes(img.id)}
            onSelect={(id: string | null, e?: any) => id && handleSelect(id, e)}
            onChange={updateImage}
          />
        ))}
      </Layer>
    </Stage>
    </div>
  );
};

export default InfiniteCanvas;
