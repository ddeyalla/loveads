"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Konva from "konva"; 
import { 
  Stage, 
  Layer, 
  Image as KonvaImage, 
  Transformer, 
  Rect, 
  Group, 
  Line, 
  Text,
  Circle,
  useImage,
} from "@/components/canvas-client-wrapper";

// Types for canvas objects
type ObjectType = 'image' | 'text' | 'rectangle' | 'circle';

// Base type for all canvas objects
export interface CanvasObject {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  selected?: boolean;
  zIndex: number; // For object layering
  fill?: string; // Fill color
  stroke?: string; // Stroke color
  strokeWidth?: number; // Stroke width
};

// Image specific properties
export interface CanvasImage extends CanvasObject {
  type: 'image';
  url: string;
  aspectRatio: number;
  effects?: any[];
};

// Text specific properties
export interface CanvasText extends CanvasObject {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle?: string;
  align?: string;
  fill: string;
};

// Rectangle specific properties
export interface CanvasRectangle extends CanvasObject {
  type: 'rectangle';
  cornerRadius?: number;
};

// Circle specific properties
export interface CanvasCircle extends CanvasObject {
  type: 'circle';
  // For circles, we'll use width/height for the bounding box
  // and calculate radius = Math.min(width, height) / 2
};

// Union type for all canvas objects
export type AnyCanvasObject = CanvasImage | CanvasText | CanvasRectangle | CanvasCircle;

// Define properties for update actions, restricting to common CanvasObject properties
export type UpdateObjectProps = Partial<Omit<CanvasObject, 'id' | 'type'>>;

// Action types for undo/redo system
export type ActionType = 
  | { type: 'add', object: AnyCanvasObject }
  | { type: 'remove', objectId: string }
  | { type: 'update', objectId: string, prevProps: UpdateObjectProps, newProps: UpdateObjectProps }
  | { type: 'reorder', objectIds: string[] }
  | { type: 'add_batch', objects: AnyCanvasObject[] };

// Helper function to safely update canvas objects
function safeUpdateObject<T extends AnyCanvasObject>(
  obj: T,
  newProps: UpdateObjectProps // Properties common to all objects, no 'id' or 'type'
): T {
  // The 'as T' is an assertion. We are telling TypeScript that spreading
  // UpdateObjectProps onto a specific CanvasObject type (like CanvasImage)
  // will result in a valid object of that same specific type.
  // This is safe because UpdateObjectProps only contains common, non-discriminant properties.
  return { ...obj, ...newProps, type: obj.type } as T;
}

// Props for the standalone CanvasObjectRenderer
interface CanvasObjectRendererProps {
  object: AnyCanvasObject;
  isSelected: boolean;
  snapToGrid: (point: { x: number; y: number }) => { x: number; y: number };
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, objectId: string) => void;
  onChange: (id: string, props: Partial<Konva.NodeConfig>, saveHistory?: boolean) => void;
  onDragStart: (id: string) => void;
}

// Standalone CanvasObjectRenderer Component
const CanvasObjectRenderer: React.FC<CanvasObjectRendererProps> = React.memo(({
  object,
  isSelected,
  snapToGrid,
  onSelect,
  onChange,
  onDragStart,
}) => {
  switch (object.type) {
    case 'image':
      return (
        <URLImage
          image={object as CanvasImage}
          isSelected={isSelected}
          snapToGrid={snapToGrid} 
          onSelect={onSelect}
          onChange={onChange} 
          onDragStart={onDragStart}
        />
      );
    case 'text':
      return (
        <Text
          key={object.id}
          x={(object as CanvasText).x}
          y={(object as CanvasText).y}
          width={(object as CanvasText).width}
          height={(object as CanvasText).height}
          text={(object as CanvasText).text}
          fontSize={(object as CanvasText).fontSize}
          fontFamily={(object as CanvasText).fontFamily}
          fontStyle={(object as CanvasText).fontStyle}
          align={(object as CanvasText).align}
          fill={(object as CanvasText).fill}
          rotation={(object as CanvasText).rotation || 0}
          draggable
          onClick={(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => onSelect(e, object.id)}
          onTap={(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => onSelect(e, object.id)}
          onDragStart={() => onDragStart(object.id)}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            const node = e.target;
            onChange(object.id, {
              x: node.x(),
              y: node.y()
            }, true);
          }}
          onTransform={(e: Konva.KonvaEventObject<Event>) => {
            const node = e.target;
            onChange(object.id, {
              x: node.x(),
              y: node.y(),
              width: node.width() * node.scaleX(),
              height: node.height() * node.scaleY(),
              rotation: node.rotation()
            }, false);
          }}
          onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
            const node = e.target;
            node.scaleX(1);
            node.scaleY(1);
            onChange(object.id, {
              x: node.x(),
              y: node.y(),
              width: node.width() * node.scaleX(),
              height: node.height() * node.scaleY(),
              rotation: node.rotation()
            }, true);
          }}
        />
      );
    case 'rectangle':
      return (
        <Rect
          key={object.id}
          x={(object as CanvasRectangle).x}
          y={(object as CanvasRectangle).y}
          width={(object as CanvasRectangle).width}
          height={(object as CanvasRectangle).height}
          fill={(object as CanvasRectangle).fill}
          stroke={(object as CanvasRectangle).stroke}
          strokeWidth={(object as CanvasRectangle).strokeWidth}
          cornerRadius={(object as CanvasRectangle).cornerRadius}
          rotation={(object as CanvasRectangle).rotation || 0}
          draggable
          onClick={(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => onSelect(e, object.id)}
          onTap={(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => onSelect(e, object.id)}
          onDragStart={() => onDragStart(object.id)}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            const node = e.target;
            onChange(object.id, {
              x: node.x(),
              y: node.y()
            }, true);
          }}
          onTransform={(e: Konva.KonvaEventObject<Event>) => {
            const node = e.target;
            onChange(object.id, {
              x: node.x(),
              y: node.y(),
              width: node.width() * node.scaleX(),
              height: node.height() * node.scaleY(),
              rotation: node.rotation()
            }, false);
          }}
          onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
            const node = e.target;
            node.scaleX(1);
            node.scaleY(1);
            onChange(object.id, {
              x: node.x(),
              y: node.y(),
              width: node.width() * node.scaleX(),
              height: node.height() * node.scaleY(),
              rotation: node.rotation()
            }, true);
          }}
        />
      );
    case 'circle':
      return (
        <Circle
          key={object.id}
          x={(object as CanvasCircle).x + (object as CanvasCircle).width / 2}
          y={(object as CanvasCircle).y + (object as CanvasCircle).height / 2}
          radius={Math.min((object as CanvasCircle).width, (object as CanvasCircle).height) / 2}
          fill={(object as CanvasCircle).fill}
          stroke={(object as CanvasCircle).stroke}
          strokeWidth={(object as CanvasCircle).strokeWidth}
          rotation={(object as CanvasCircle).rotation || 0}
          draggable
          onClick={(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => onSelect(e, object.id)}
          onTap={(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => onSelect(e, object.id)}
          onDragStart={() => onDragStart(object.id)}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            const node = e.target as Konva.Circle; // Cast to Konva.Circle
            const radius = node.radius();
            onChange(object.id, {
              x: node.x() - radius,
              y: node.y() - radius
            }, true);
          }}
          onTransform={(e: Konva.KonvaEventObject<Event>) => {
            const node = e.target as Konva.Circle; // Cast to Konva.Circle
            const radius = node.radius() * Math.max(node.scaleX(), node.scaleY());
            onChange(object.id, {
              x: node.x() - radius,
              y: node.y() - radius,
              width: radius * 2,
              height: radius * 2,
              rotation: node.rotation()
            }, false);
          }}
          onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
            const node = e.target as Konva.Circle; // Cast to Konva.Circle
            const radius = node.radius() * Math.max(node.scaleX(), node.scaleY());
            node.scaleX(1);
            node.scaleY(1);
            onChange(object.id, {
              x: node.x() - radius,
              y: node.y() - radius,
              width: radius * 2,
              height: radius * 2,
              rotation: node.rotation()
            }, true);
          }}
        />
      );
    default:
      return null;
  }
});
CanvasObjectRenderer.displayName = 'CanvasObjectRenderer';

// Define the props for the InfiniteCanvas component
export interface InfiniteCanvasProps {
  canvasObjects: AnyCanvasObject[];
  setCanvasObjects: React.Dispatch<React.SetStateAction<AnyCanvasObject[]>>;
  onAddImage?: (image: CanvasImage) => void;
};

// Constants
const ZOOM_SPEED = 0.05;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const GRID_SIZE = 50;
const GRID_COLOR = "#f0f0f0";
const BACKGROUND_COLOR = "#ffffff";
const SNAP_THRESHOLD = 10; // Grid snapping threshold in pixels
const CULLING_BUFFER = 200; // Buffer size for viewport culling

// Constants for image layout when adding multiple images
const IMAGE_LAYOUT_GAP_X = 40;
const IMAGE_LAYOUT_GAP_Y = 40;
const IMAGES_PER_ROW_LAYOUT = 5;
const DEFAULT_LAYOUT_IMAGE_WIDTH = 150;
const DEFAULT_LAYOUT_IMAGE_HEIGHT = 150;

// Keyboard shortcuts mapping
const KEYBOARD_SHORTCUTS = {
  DELETE: ['Delete', 'Backspace'],
  COPY: ['c'],
  PASTE: ['v'],
  CUT: ['x'],
  UNDO: ['z'],
  REDO: ['y', 'Z'], // Z with shift
  SELECT_ALL: ['a'],
  DESELECT: ['Escape'],
  MOVE_UP: ['ArrowUp'],
  MOVE_DOWN: ['ArrowDown'],
  MOVE_LEFT: ['ArrowLeft'],
  MOVE_RIGHT: ['ArrowRight'],
  LAYER_FORWARD: [']'],
  LAYER_BACKWARD: ['['],
  LAYER_FRONT: ['}'],
  LAYER_BACK: ['{'],
  ZOOM_IN: ['+', '='],
  ZOOM_OUT: ['-', '_'],
  ZOOM_RESET: ['0'],
  TOGGLE_GRID: ['g'],
  SNAP_TOGGLE: ['s']
};

// Custom Image component with transformation support
interface URLImageProps {
  image: CanvasImage;
  isSelected: boolean;
  snapToGrid: (point: { x: number; y: number; }) => { x: number; y: number; }; 
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, objectId: string) => void; // Used Konva.KonvaEventObject
  onChange?: (id: string, props: Partial<Konva.NodeConfig>, saveHistory?: boolean) => void; // Used Konva.NodeConfig
  onDragStart?: (id: string) => void;
}

const URLImage: React.FC<URLImageProps> = ({ image, isSelected, snapToGrid, onSelect, onChange, onDragStart }) => {
  const imageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const [img, status] = useImage(image.url, "anonymous");
  const [isDragging, setIsDragging] = useState(false);

  // Handle snap to grid logic internally for URLImage, using the passed snapToGrid prop
  const doSnap = useCallback((pos: {x: number, y: number}) => { 
    if (!snapToGrid) return pos; // snapToGrid here is the prop passed to URLImage
    
    // Snap to nearest grid point
    return {
      x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE
    };
  }, [snapToGrid]);

  // Sync transformer with image when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && imageRef.current) {
      // Attach transformer to the image
      transformerRef.current.nodes([imageRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    onDragStart?.(image.id);
  }, [onDragStart, image.id]);

  // Handle drag end with snap to grid
  const handleDragEnd = useCallback((e: any) => {
    setIsDragging(false);
    
    // Get current position
    const pos = {
      x: e.target.x(),
      y: e.target.y(),
    };
    
    // Apply snap if enabled
    const snappedPos = doSnap(pos);
    
    // Update position in state
    onChange?.(image.id, {
      x: snappedPos.x,
      y: snappedPos.y,
    }, true); // true to save this action in history
  }, [imageRef, doSnap, onChange, image.id]);

  // Handle transform end
  const handleTransformEnd = useCallback(() => {
    const node = imageRef.current;
    if (!node) return;

    const pos = { x: node.x(), y: node.y() };
    const snappedPos = doSnap(pos); // Use renamed doSnap
    
    // Update position in state
    onChange?.(image.id, {
      x: snappedPos.x,
      y: snappedPos.y,
    }, true); // true to save this action in history

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    // Calculate new dimensions and position
    const newAttrs: Partial<Konva.NodeConfig> = { // Used Konva.NodeConfig
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX), // prevent zero or negative width/height
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    };

    // Apply snap to x, y
    const snappedPos2 = doSnap({ x: newAttrs.x!, y: newAttrs.y! }); // Use renamed doSnap
    newAttrs.x = snappedPos2.x;
    newAttrs.y = snappedPos2.y;

    // Apply snap to width, height if necessary (e.g., maintain aspect ratio or snap dimensions)
    // For simplicity, we are not snapping width/height here but could be added.
    
    // Update state
    onChange?.(image.id, newAttrs, true); // true to save action in history
    
    // Reset scale to avoid accumulation
    node.scaleX(1);
    node.scaleY(1);
  }, [onChange, doSnap, image.id]);

  // Calculate pointer events based on loading status
  const pointerEvents = status === "loaded" ? "auto" : "none";
  
  return (
    <>
      <KonvaImage
        ref={imageRef}
        image={img}
        x={image.x}
        y={image.y}
        width={image.width}
        height={image.height}
        rotation={image.rotation || 0}
        draggable
        onClick={(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => onSelect(e, image.id)}
        onTap={(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => onSelect(e, image.id)}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTransformStart={handleDragStart}
        onTransformEnd={handleTransformEnd}
        opacity={isDragging ? 0.7 : 1} // Visual feedback for dragging
        shadowColor="rgba(0,0,0,0.3)"
        shadowBlur={isSelected ? 6 : 0}
        shadowOffsetX={isSelected ? 3 : 0}
        shadowOffsetY={isSelected ? 3 : 0}
        strokeWidth={isSelected ? 2 : 0} // Outline
        stroke="#0096FF" // Selection color
        perfectDrawEnabled={true}
        listening={pointerEvents === "auto"}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          enabledAnchors={[
            "top-left",
            "top-center",
            "top-right",
            "middle-left",
            "middle-right",
            "bottom-left",
            "bottom-center",
            "bottom-right",
          ]}
          borderStroke="#0096FF"
          borderStrokeWidth={2}
          anchorStroke="#0096FF"
          anchorFill="#FFFFFF"
          anchorSize={8}
          rotateAnchorOffset={30}
          boundBoxFunc={(oldBox: any, newBox: any) => {
            // Limit minimum size
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

// Main Infinite Canvas component
const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({ canvasObjects, setCanvasObjects, onAddImage }) => {
  // Canvas state
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [clipboard, setClipboard] = useState<AnyCanvasObject[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [history, setHistory] = useState<ActionType[]>([]); 
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartScale, setTouchStartScale] = useState<number | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null);
  const [isTouching, setIsTouching] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [selectionStart, setSelectionStart] = useState<{x: number, y: number} | null>(null);
  const [visibleBounds, setVisibleBounds] = useState<{minX: number, minY: number, maxX: number, maxY: number}>({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  
  // Refs
  const stageRef = useRef<any>(null);
  const isDrawing = useRef(false);
  const lastPointerPosition = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const isShiftPressed = useRef(false);
  const isCtrlPressed = useRef(false);
  const isTransforming = useRef(false);
  const layerRef = useRef<any>(null);
  const requestAnimationFrameId = useRef<number | null>(null);
  const imageRefs = useRef<Map<string, any>>(new Map());
  
  // Derived state - get selected objects
  const selectedObjects = useMemo(() => {
    return canvasObjects.filter(obj => selectedIds.includes(obj.id));
  }, [canvasObjects, selectedIds]);
  
  // Add an action to history and execute it
  const executeAction = useCallback((action: ActionType) => {
    // Truncate future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(action);
    
    // Execute the action
    switch (action.type) {
      case 'add':
        setCanvasObjects(prev => [...prev, action.object]);
        break;
      case 'remove':
        setCanvasObjects(prev => prev.filter(obj => obj.id !== action.objectId));
        setSelectedIds(prev => prev.filter(id => id !== action.objectId));
        break;
      case 'update':
        setCanvasObjects(prev => prev.map(obj => 
          obj.id === action.objectId ? safeUpdateObject(obj, action.newProps) : obj
        ));
        break;
      case 'reorder':
        setCanvasObjects(prev => {
          // Create a map of id => index
          const orderMap = new Map(action.objectIds.map((id, index) => [id, index]));
          
          // Sort objects based on new order
          return [...prev].sort((a, b) => {
            const aOrder = orderMap.get(a.id) ?? Infinity;
            const bOrder = orderMap.get(b.id) ?? Infinity;
            return aOrder - bOrder;
          });
        });
        break;
      case 'add_batch':
        setCanvasObjects(prev => [...prev, ...action.objects]);
        break;
    }
    
    // Update history state
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, setCanvasObjects]);
  
  // Undo function
  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      const actionToUndo = history[historyIndex];
      
      // Reverse the action
      switch (actionToUndo.type) {
        case 'add':
          setCanvasObjects(prev => prev.filter(obj => obj.id !== actionToUndo.object.id));
          setSelectedIds(prev => prev.filter(id => id !== actionToUndo.object.id));
          break;
        case 'remove':
          // Reconstruct the object from history
          let objectToRestoreFromHistory: AnyCanvasObject | undefined = undefined;
          // Consider actions up to the point *before* the current undo operation effectively reverts the 'remove'
          // So, we look at history up to the 'remove' action itself (historyIndex points to the action being undone)
          const historyForRestoration = history.slice(0, historyIndex + 1); 

          const addActionInstance = historyForRestoration.find(
            (act): act is Extract<ActionType, { type: 'add' }> => 
              act.type === 'add' && act.object.id === actionToUndo.objectId
          );

          if (addActionInstance) {
            const initialObject = addActionInstance.object;

            if (initialObject) { // Ensure initialObject exists before reducing
              // Apply subsequent updates to reconstruct the object to its state before removal
              const relevantUpdateActions = history
                .slice(0, historyIndex) // Actions before the current 'remove' action's original position
                .filter(a => 
                  a.type === 'update' && 
                  a.objectId === actionToUndo.objectId && 
                  history.findIndex(hAct => hAct === a) > historyForRestoration.indexOf(addActionInstance) // Only updates after the add
                ) as Extract<ActionType, {type: 'update'}>[];

              const reconstructedObject = relevantUpdateActions.reduce(
                // acc type is inferred from initialObject (e.g., CanvasImage)
                // safeUpdateObject returns the same specific type T
                (acc, historicalUpdateAction) => {
                  return safeUpdateObject(acc, historicalUpdateAction.newProps);
                },
                initialObject // initial value is specifically typed (e.g. CanvasImage)
              );
              setCanvasObjects(prev => [...prev, reconstructedObject]);
            }
          } else {
            // This case should ideally not be reached if history is consistent
          }
        case 'update':
          // Explicitly cast actionToUndo to ensure prevProps is accessible
          const updateActionToUndo = actionToUndo as Extract<ActionType, { type: 'update' }>;
          setCanvasObjects(prev => prev.map(obj => 
            obj.id === updateActionToUndo.objectId ? safeUpdateObject(obj, updateActionToUndo.prevProps) : obj
          ));
          break;
        case 'reorder':
          // For reorder, we'd need to have the previous order saved
          // This would require more complex history tracking
          break;
        case 'add_batch':
          setCanvasObjects(prev => prev.filter(obj => 
            !(actionToUndo as Extract<ActionType, { type: 'add_batch' }>).objects.find(addedObj => addedObj.id === obj.id)
          ));
          // Deselect objects that were part of the batch if they were selected
          setSelectedIds(prevSelected => prevSelected.filter(id => 
            !(actionToUndo as Extract<ActionType, { type: 'add_batch' }>).objects.find(addedObj => addedObj.id === id)
          ));
          break;
      }
      
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, canvasObjects, setCanvasObjects]);
  
  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextAction = history[historyIndex + 1];
      
      // Re-execute the action
      switch (nextAction.type) {
        case 'add':
          setCanvasObjects(prev => [...prev, nextAction.object]);
          break;
        case 'remove':
          setCanvasObjects(prev => prev.filter(obj => obj.id !== nextAction.objectId));
          setSelectedIds(prev => prev.filter(id => id !== nextAction.objectId));
          break;
        case 'update':
          setCanvasObjects(prev => prev.map(obj => 
            obj.id === nextAction.objectId ? safeUpdateObject(obj, nextAction.newProps) : obj
          ));
          break;
        case 'reorder':
          setCanvasObjects(prev => {
            // Create a map of id => index
            const orderMap = new Map(nextAction.objectIds.map((id, index) => [id, index]));
            
            // Sort objects based on new order
            return [...prev].sort((a, b) => {
              const aOrder = orderMap.get(a.id) ?? Infinity;
              const bOrder = orderMap.get(b.id) ?? Infinity;
              return aOrder - bOrder;
            });
          });
          break;
        case 'add_batch':
          setCanvasObjects(prev => [...prev, ...(nextAction as Extract<ActionType, { type: 'add_batch' }>).objects]);
          // Optionally, select the re-added batch of objects
          // setSelectedIds((nextAction as Extract<ActionType, { type: 'add_batch' }>).objects.map(obj => obj.id));
          break;
      }
      
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, setCanvasObjects]);

  const updateMultipleObjects = useCallback(
    (updates: { id: string; attrs: UpdateObjectProps }[], save: boolean = true) => {
      setCanvasObjects(prev => {
        const newObjects = [...prev];
        // Store updates for history, ensuring each is a valid ActionType['update'] payload
        const historyActionPayloads: Extract<ActionType, {type: 'update'}>[] = [];

        updates.forEach(({ id, attrs }) => {
          const index = newObjects.findIndex(obj => obj.id === id);
          if (index >= 0) {
            const originalObject = newObjects[index];
            
            const currentPrevProps: UpdateObjectProps = {};
            const currentNewProps: UpdateObjectProps = {}; // These are the *actual* changes from attrs
            let hasChanged = false;

            // Iterate over keys in attrs (which is UpdateObjectProps)
            // to build prevProps and newProps for history, containing only what changed.
            for (const key in attrs) {
              const typedKey = key as keyof UpdateObjectProps;
              if (originalObject[typedKey] !== attrs[typedKey]) {
                (currentPrevProps as any)[typedKey] = originalObject[typedKey];
                (currentNewProps as any)[typedKey] = attrs[typedKey];
                hasChanged = true;
              }
            }

            if (hasChanged) {
              // Apply the update to the object in the current state
              newObjects[index] = safeUpdateObject(originalObject, attrs); 

              // If saving to history, and there were actual changes, prepare payload for executeAction
              if (save && (Object.keys(currentPrevProps).length > 0 || Object.keys(currentNewProps).length > 0)) {
                historyActionPayloads.push({
                  type: 'update',
                  objectId: id,
                  prevProps: currentPrevProps,
                  newProps: currentNewProps,
                });
              }
            }
          }
        });

        // Dispatch all history actions after processing all updates for this batch
        if (save && historyActionPayloads.length > 0) {
          historyActionPayloads.forEach(payload => executeAction(payload));
        }
        return newObjects;
      });
    },
    [executeAction] // executeAction encapsulates setCanvasObjects, setUndoStack, setRedoStack
  );

  const handleObjectUpdate = useCallback(
    (objectId: string, changedProps: Partial<Konva.NodeConfig>, saveHistory: boolean = true) => { // Used Konva.NodeConfig
      const safeAttrs: UpdateObjectProps = {};
      // Define keys that are part of UpdateObjectProps (i.e., common CanvasObject props except id/type)
      const commonKeys: (keyof UpdateObjectProps)[] = [
        'x', 'y', 'width', 'height', 'rotation', 
        'selected', 'zIndex', 'fill', 'stroke', 'strokeWidth'
        // Ensure this list matches properties in CanvasObject intended for generic updates
      ];

      for (const key of commonKeys) {
        if (key in changedProps && changedProps[key] !== undefined) {
          // This assignment is a simplification. For full type safety,
          // one might need to validate/transform changedProps[key] based on the specific key.
          (safeAttrs as any)[key] = changedProps[key];
        }
      }
      
      if (Object.keys(safeAttrs).length > 0) { // Only update if there are valid props to apply
          updateMultipleObjects([{ id: objectId, attrs: safeAttrs }], saveHistory);
      }
    },
    [updateMultipleObjects]
  );

  // Update object properties with history tracking
  const updateObject = useCallback((id: string, newAttrs: Partial<AnyCanvasObject>, save: boolean = false) => {
    // Find the current object properties
    const currentObject = canvasObjects.find(obj => obj.id === id);
    if (!currentObject) return;
    
    // Extract only the properties that are being changed
    const changedProps: UpdateObjectProps = {};
    const prevProps: UpdateObjectProps = {};
    
    Object.keys(newAttrs).forEach(key => {
      const typedKey = key as keyof UpdateObjectProps; // Cast to key of UpdateObjectProps
      // Check if the key exists in the current object and the value is different
      if (currentObject.hasOwnProperty(typedKey) && currentObject[typedKey] !== newAttrs[typedKey]) {
        (changedProps as any)[typedKey] = newAttrs[typedKey];
        (prevProps as any)[typedKey] = currentObject[typedKey];
      }
    });
    
    // Only proceed if there are actual changes
    if (Object.keys(changedProps).length === 0) return;
    
    // Apply the update
    setCanvasObjects(prev => 
      prev.map(obj => (obj.id === id ? safeUpdateObject(obj, changedProps) : obj))
    );
    
    // Save to history if requested
    if (save) {
      executeAction({
        type: 'update',
        objectId: id,
        prevProps,
        newProps: changedProps
      });
    }
  }, [canvasObjects, setCanvasObjects, executeAction]);
  
  // Calculate grid lines based on current position and scale
  const getGridLines = useCallback(() => {
    if (!showGrid) return { horizontal: [], vertical: [] };
    
    const stageWidth = window.innerWidth;
    const stageHeight = window.innerHeight;
    
    const gridSpacing = GRID_SIZE * scale;
    
    // Calculate visible grid area
    const startX = Math.floor(-stagePos.x / gridSpacing) * gridSpacing;
    const endX = stageWidth - stagePos.x + gridSpacing;
    const startY = Math.floor(-stagePos.y / gridSpacing) * gridSpacing;
    const endY = stageHeight - stagePos.y + gridSpacing;
    
    const horizontal: { key: string; points: number[] }[] = [];
    const vertical: { key: string; points: number[] }[] = [];
    
    // Generate horizontal grid lines
    for (let y = startY; y < endY; y += gridSpacing) {
      horizontal.push({
        key: `h-${y}`,
        points: [0, y + stagePos.y, stageWidth, y + stagePos.y],
      });
    }
    
    // Generate vertical grid lines
    for (let x = startX; x < endX; x += gridSpacing) {
      vertical.push({
        key: `v-${x}`,
        points: [x + stagePos.x, 0, x + stagePos.x, stageHeight],
      });
    }
    
    return { horizontal, vertical };
  }, [stagePos, scale, showGrid]);
  
  // Calculate visible viewport for culling
  const updateVisibleBounds = useCallback(() => {
    if (!stageRef.current) return;
    
    const stage = stageRef.current;
    const viewportWidth = stage.width();
    const viewportHeight = stage.height();
    
    // Calculate the visible area in canvas coordinates (with buffer for smoother experience)
    visibleBounds.minX = -stagePos.x / scale - CULLING_BUFFER;
    visibleBounds.minY = -stagePos.y / scale - CULLING_BUFFER;
    visibleBounds.maxX = (viewportWidth - stagePos.x) / scale + CULLING_BUFFER;
    visibleBounds.maxY = (viewportHeight - stagePos.y) / scale + CULLING_BUFFER;
  }, [stagePos, scale, visibleBounds]);
  
  // Check if an object is visible in the current viewport
  const isObjectVisible = useCallback((obj: CanvasObject) => {
    // Check if object bounds overlap with visible viewport
    const objRight = obj.x + obj.width;
    const objBottom = obj.y + obj.height;
    
    return (
      objRight >= visibleBounds.minX &&
      obj.x <= visibleBounds.maxX &&
      objBottom >= visibleBounds.minY &&
      obj.y <= visibleBounds.maxY
    );
  }, [visibleBounds]);
  
  // Handle wheel events for zooming
  const handleWheel = useCallback((e: any) => {
    // In Konva, the native event is in e.evt
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / scale,
      y: (pointer.y - stagePos.y) / scale,
    };
    
    // Calculate new scale
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, scale * (1 + direction * ZOOM_SPEED))
    );
    
    // Calculate new position to zoom toward mouse pointer
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    
    setScale(newScale);
    setStagePos(newPos);
    
    // Update visible bounds after zoom
    updateVisibleBounds();
  }, [scale, stagePos, updateVisibleBounds]);
  
  // Handle object selection
  const handleSelect = useCallback((e: any, imageId: string) => {
    // Get key states from the event
    const isShift = e.evt.shiftKey || isShiftPressed.current;
    const isCtrl = e.evt.ctrlKey || e.evt.metaKey || isCtrlPressed.current;
    
    if (isShift) {
      // Add or remove from multi-selection
      setSelectedIds(prev => 
        prev.includes(imageId)
          ? prev.filter(id => id !== imageId) // Remove if already selected
          : [...prev, imageId] // Add to selection
      );
    } else if (isCtrl) {
      // Toggle selection state of clicked item
      setSelectedIds(prev => 
        prev.includes(imageId)
          ? prev.filter(id => id !== imageId)
          : [...prev, imageId]
      );
    } else {
      // Normal click - select only this item
      setSelectedIds([imageId]);
    }
  }, []);
  
  // Handle object drag start
  const handleObjectDragStart = useCallback(() => {
    isTransforming.current = true;
  }, []);
  
  // Handle stage drag for panning
  const handleStageDragStart = useCallback((e: any) => {
    // Only pan if clicking on empty space (the stage itself)
    if (e.target === e.target.getStage()) {
      isPanning.current = true;
      lastPointerPosition.current = e.target.getPointerPosition();
      
      // If not multi-selecting, deselect all objects
      if (!isShiftPressed.current && !isCtrlPressed.current) {
        setSelectedIds([]);
      }
      
      // Start multi-selection if shift is pressed
      if (isShiftPressed.current || isCtrlPressed.current) {
        setIsMultiSelectMode(true);
        setSelectionStart({
          x: (e.evt.offsetX - stagePos.x) / scale,
          y: (e.evt.offsetY - stagePos.y) / scale
        });
        setSelectionRect({
          x: (e.evt.offsetX - stagePos.x) / scale,
          y: (e.evt.offsetY - stagePos.y) / scale,
          width: 0,
          height: 0
        });
      }
    }
  }, [scale, stagePos]);
  
  const handleStageDragMove = useCallback((e: any) => {
    if (!isPanning.current && !isMultiSelectMode) return;
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    if (isMultiSelectMode && selectionStart) {
      // Update selection rectangle
      const mousePos = {
        x: (e.evt.offsetX - stagePos.x) / scale,
        y: (e.evt.offsetY - stagePos.y) / scale
      };
      
      const newRect = {
        x: Math.min(selectionStart.x, mousePos.x),
        y: Math.min(selectionStart.y, mousePos.y),
        width: Math.abs(mousePos.x - selectionStart.x),
        height: Math.abs(mousePos.y - selectionStart.y)
      };
      
      setSelectionRect(newRect);
    } else if (isPanning.current && pointer) {
      // Pan the stage
      const dx = pointer.x - lastPointerPosition.current.x;
      const dy = pointer.y - lastPointerPosition.current.y;
      
      setStagePos(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      
      lastPointerPosition.current = pointer;
      
      // Update visible bounds after pan
      updateVisibleBounds();
    }
  }, [isMultiSelectMode, scale, selectionStart, stagePos, updateVisibleBounds]);
  
  const handleStageDragEnd = useCallback(() => {
    if (isMultiSelectMode && selectionRect) {
      // Select all objects within selection rectangle
      const newSelection = canvasObjects.filter(img => {
        const imgRight = img.x + img.width;
        const imgBottom = img.y + img.height;
        
        return (
          img.x <= selectionRect.x + selectionRect.width &&
          imgRight >= selectionRect.x &&
          img.y <= selectionRect.y + selectionRect.height &&
          imgBottom >= selectionRect.y
        );
      }).map(img => img.id);
      
      // Update selection - either add to current or replace
      if (isShiftPressed.current || isCtrlPressed.current) {
        setSelectedIds(prev => {
          const combined = [...prev];
          newSelection.forEach(id => {
            if (!combined.includes(id)) {
              combined.push(id);
            }
          });
          return combined;
        });
      } else {
        setSelectedIds(newSelection);
      }
      
      // Reset selection mode and rectangle
      setIsMultiSelectMode(false);
      setSelectionRect(null);
      setSelectionStart(null);
    }
    
    isPanning.current = false;
  }, [canvasObjects, isMultiSelectMode, selectionRect]);
  
  // Move selected objects one layer forward
  const moveSelectedObjectsForward = useCallback(() => {
    if (selectedIds.length === 0) return;
    
    // Get all object IDs in current order
    const objectIds = canvasObjects.map(obj => obj.id);
    
    // For each selected object, move it one position forward in the array
    const newOrder = [...objectIds];
    
    selectedIds.forEach(id => {
      const currentIndex = newOrder.indexOf(id);
      if (currentIndex < newOrder.length - 1) {
        // Swap with the next item
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = 
        [newOrder[currentIndex + 1], newOrder[currentIndex]];
      }
    });
    
    // Reorder based on new indices
    executeAction({
      type: 'reorder',
      objectIds: newOrder
    });
  }, [executeAction, canvasObjects, selectedIds]);
  
  // Move selected objects one layer backward
  const moveSelectedObjectsBackward = useCallback(() => {
    if (selectedIds.length === 0) return;
    
    // Get all object IDs in current order
    const objectIds = canvasObjects.map(obj => obj.id);
    
    // For each selected object, move it one position backward in the array
    const newOrder = [...objectIds];
    
    // Process in reverse order to avoid index shifting problems
    [...selectedIds].reverse().forEach(id => {
      const currentIndex = newOrder.indexOf(id);
      if (currentIndex > 0) {
        // Swap with the previous item
        [newOrder[currentIndex], newOrder[currentIndex - 1]] = 
        [newOrder[currentIndex - 1], newOrder[currentIndex]];
      }
    });
    
    // Reorder based on new indices
    executeAction({
      type: 'reorder',
      objectIds: newOrder
    });
  }, [executeAction, canvasObjects, selectedIds]);
  
  // Bring selected objects to front
  const bringSelectedObjectsToFront = useCallback(() => {
    if (selectedIds.length === 0) return;
    
    // Get all object IDs in current order
    const objectIds = canvasObjects.map(obj => obj.id);
    
    // Filter out selected IDs
    const unselectedIds = objectIds.filter(id => !selectedIds.includes(id));
    
    // Create new order with selected IDs at the end (front)
    const newOrder = [...unselectedIds, ...selectedIds];
    
    // Reorder based on new indices
    executeAction({
      type: 'reorder',
      objectIds: newOrder
    });
  }, [executeAction, canvasObjects, selectedIds]);
  
  // Send selected objects to back
  const sendSelectedObjectsToBack = useCallback(() => {
    if (selectedIds.length === 0) return;
    
    // Get all object IDs in current order
    const objectIds = canvasObjects.map(obj => obj.id);
    
    // Filter out selected IDs
    const unselectedIds = objectIds.filter(id => !selectedIds.includes(id));
    
    // Create new order with selected IDs at the beginning (back)
    const newOrder = [...selectedIds, ...unselectedIds];
    
    // Reorder based on new indices
    executeAction({
      type: 'reorder',
      objectIds: newOrder
    });
  }, [executeAction, canvasObjects, selectedIds]);
  
  // Toggle grid visibility
  const toggleGrid = useCallback(() => {
    setShowGrid(prev => !prev);
  }, []);
  
  // Keyboard event handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Track modifier keys
    if (e.key === 'Shift') isShiftPressed.current = true;
    if (e.key === 'Control' || e.key === 'Meta') isCtrlPressed.current = true;
    
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) { // Ctrl/Cmd key combinations
      if (KEYBOARD_SHORTCUTS.UNDO.includes(e.key.toLowerCase())) {
        e.preventDefault();
        undo();
      } else if (KEYBOARD_SHORTCUTS.REDO.includes(e.key)) {
        e.preventDefault();
        redo();
      } else if (KEYBOARD_SHORTCUTS.COPY.includes(e.key.toLowerCase())) {
        e.preventDefault();
        // Copy selected canvasObjects to clipboard
        const itemsToCopy = canvasObjects.filter(img => selectedIds.includes(img.id));
        setClipboard(itemsToCopy);
      } else if (KEYBOARD_SHORTCUTS.PASTE.includes(e.key.toLowerCase())) {
        e.preventDefault();
        // Paste clipboard items
        clipboard.forEach(item => {
          const newItem = {
            ...item,
            id: `${item.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            x: item.x + 20, // Offset pasted items
            y: item.y + 20,
          };
          executeAction({ type: 'add', object: newItem });
        });
      } else if (KEYBOARD_SHORTCUTS.SELECT_ALL.includes(e.key.toLowerCase())) {
        e.preventDefault();
        // Select all canvasObjects
        setSelectedIds(canvasObjects.map(obj => obj.id));
      }
    } else { // Regular key shortcuts
      if (KEYBOARD_SHORTCUTS.DELETE.includes(e.key)) {
        if (selectedIds.length > 0) {
          // Delete selected canvasObjects
          selectedIds.forEach(id => {
            executeAction({ type: 'remove', objectId: id });
          });
          setSelectedIds([]);
        }
      } else if (KEYBOARD_SHORTCUTS.DESELECT.includes(e.key)) {
        // Deselect all
        setSelectedIds([]);
      } else if (KEYBOARD_SHORTCUTS.TOGGLE_GRID.includes(e.key.toLowerCase())) {
        // Toggle grid visibility
        setShowGrid(prev => !prev);
      } else if (KEYBOARD_SHORTCUTS.SNAP_TOGGLE.includes(e.key.toLowerCase())) {
        // Toggle snap to grid
        setSnapToGrid(prev => !prev);
      }
    }
    
    // Handle arrow keys for moving selected objects
    if (selectedIds.length > 0) {
      const moveDistance = 10 / scale; // Adjust distance based on zoom level
      
      if (KEYBOARD_SHORTCUTS.MOVE_UP.includes(e.key)) {
        e.preventDefault();
        const updates = selectedIds.map(id => ({
          id,
          attrs: { y: canvasObjects.find(obj => obj.id === id)!.y - moveDistance }
        }));
        updateMultipleObjects(updates, true);
      } else if (KEYBOARD_SHORTCUTS.MOVE_DOWN.includes(e.key)) {
        e.preventDefault();
        const updates = selectedIds.map(id => ({
          id,
          attrs: { y: canvasObjects.find(obj => obj.id === id)!.y + moveDistance }
        }));
        updateMultipleObjects(updates, true);
      } else if (KEYBOARD_SHORTCUTS.MOVE_LEFT.includes(e.key)) {
        e.preventDefault();
        const updates = selectedIds.map(id => ({
          id,
          attrs: { x: canvasObjects.find(obj => obj.id === id)!.x - moveDistance }
        }));
        updateMultipleObjects(updates, true);
      } else if (KEYBOARD_SHORTCUTS.MOVE_RIGHT.includes(e.key)) {
        e.preventDefault();
        const updates = selectedIds.map(id => ({
          id,
          attrs: { x: canvasObjects.find(obj => obj.id === id)!.x + moveDistance }
        }));
        updateMultipleObjects(updates, true);
      }
      
      // Object layering shortcuts
      if (KEYBOARD_SHORTCUTS.LAYER_FORWARD.includes(e.key)) {
        // Move selected objects one layer forward
        moveSelectedObjectsForward();
      } else if (KEYBOARD_SHORTCUTS.LAYER_BACKWARD.includes(e.key)) {
        // Move selected objects one layer backward
        moveSelectedObjectsBackward();
      } else if (KEYBOARD_SHORTCUTS.LAYER_FRONT.includes(e.key)) {
        // Bring selected objects to front
        bringSelectedObjectsToFront();
      } else if (KEYBOARD_SHORTCUTS.LAYER_BACK.includes(e.key)) {
        // Send selected objects to back
        sendSelectedObjectsToBack();
      }
    }
  }, [
    clipboard, 
    executeAction, 
    canvasObjects, 
    redo, 
    scale, 
    selectedIds, 
    undo, 
    updateMultipleObjects,
    moveSelectedObjectsForward,
    moveSelectedObjectsBackward,
    bringSelectedObjectsToFront,
    sendSelectedObjectsToBack
  ]);
  
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Shift') isShiftPressed.current = false;
    if (e.key === 'Control' || e.key === 'Meta') isCtrlPressed.current = false;
  }, []);

  // Set up keyboard event listeners
  useEffect(() => {
    // Initialize visible bounds
    updateVisibleBounds();
    
    // Add keyboard event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      // Cancel any pending animation frames
      if (requestAnimationFrameId.current !== null) {
        cancelAnimationFrame(requestAnimationFrameId.current);
      }
    };
  }, [handleKeyDown, handleKeyUp, updateVisibleBounds]);
  
  // Calculate grid lines
  const { horizontal, vertical } = getGridLines();
  
  // Filter canvasObjects to only render visible ones (viewport culling)
  const visibleObjects = useMemo(() => {
    return canvasObjects.filter(isObjectVisible).sort((a, b) => a.zIndex - b.zIndex);
  }, [canvasObjects, isObjectVisible]);

  // Perform grid snap
  const performGridSnap = useCallback((point: { x: number; y: number }) => {
    if (!snapToGrid) return point;
    
    // Snap to nearest grid point
    return {
      x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(point.y / GRID_SIZE) * GRID_SIZE
    };
  }, [snapToGrid]);

  // Helper function to generate unique IDs
  const generateUniqueId = (prefix: string = 'obj'): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Function to add multiple images in a layout
  const addImagesInLayout = useCallback((imageUrls: string[], startX: number = 10, startY: number = 10) => {
    if (!imageUrls || imageUrls.length === 0) return;

    let currentX = startX;
    let currentY = startY;
    const newImageObjects: CanvasImage[] = [];
    
    // Determine the starting zIndex for new objects
    const highestZIndex = canvasObjects.length > 0 
      ? Math.max(...canvasObjects.map(obj => obj.zIndex))
      : -1;

    imageUrls.forEach((url, index) => {
      const newImage: CanvasImage = {
        id: generateUniqueId('image'),
        type: 'image',
        url,
        x: currentX,
        y: currentY,
        width: DEFAULT_LAYOUT_IMAGE_WIDTH,
        height: DEFAULT_LAYOUT_IMAGE_HEIGHT,
        rotation: 0,
        zIndex: highestZIndex + 1 + index,
        aspectRatio: DEFAULT_LAYOUT_IMAGE_WIDTH / DEFAULT_LAYOUT_IMAGE_HEIGHT,
        effects: [], // Initialize effects
        selected: false, // Ensure new items are not selected by default
      };
      newImageObjects.push(newImage);

      // Advance position for the next image
      currentX += DEFAULT_LAYOUT_IMAGE_WIDTH + IMAGE_LAYOUT_GAP_X;

      // Check if row needs to wrap
      if ((index + 1) % IMAGES_PER_ROW_LAYOUT === 0) {
        currentX = startX; // Reset X to start of the row
        currentY += DEFAULT_LAYOUT_IMAGE_HEIGHT + IMAGE_LAYOUT_GAP_Y; // Move to next row
      }
    });

    if (newImageObjects.length > 0) {
      // Use executeAction for batch add to handle history correctly
      executeAction({ type: 'add_batch', objects: newImageObjects });
      // Do NOT update history state directly here, executeAction handles it
    }
  }, [canvasObjects, executeAction]); // Depend on executeAction

  return (
    <div className="infinite-canvas-container" style={{ width: '100%', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={scale}
        scaleY={scale}
        onWheel={handleWheel}
        onMouseDown={handleStageDragStart}
        onMouseMove={handleStageDragMove}
        onMouseUp={handleStageDragEnd}
      >
        <Layer ref={layerRef}>
          {/* Background */}
          <Rect
            x={-10000}
            y={-10000}
            width={20000}
            height={20000}
            fill={BACKGROUND_COLOR}
          />
          
          {/* Grid lines */}
          {showGrid && (
            <Group>
              {horizontal.map(line => (
                <Line
                  key={line.key}
                  points={line.points}
                  stroke={GRID_COLOR}
                  strokeWidth={1 / scale} // Adjust line width based on zoom
                  listening={false}
                />
              ))}
              {vertical.map(line => (
                <Line
                  key={line.key}
                  points={line.points}
                  stroke={GRID_COLOR}
                  strokeWidth={1 / scale} // Adjust line width based on zoom
                  listening={false}
                />
              ))}
            </Group>
          )}
          
          {/* Selection rectangle for multi-select */}
          {selectionRect && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill="rgba(0, 150, 255, 0.1)"
              stroke="rgba(0, 150, 255, 0.8)"
              strokeWidth={1 / scale}
              dash={[5 / scale, 5 / scale]}
              listening={false}
            />
          )}
          
          {/* Canvas objects - only render visible ones */}
          {visibleObjects.map(obj => (
            <CanvasObjectRenderer
              key={obj.id}
              object={obj}
              isSelected={selectedIds.includes(obj.id)}
              snapToGrid={performGridSnap} // Use renamed function
              onSelect={handleSelect}
              onChange={handleObjectUpdate} // Use handleObjectUpdate for consistency
              onDragStart={handleObjectDragStart} // Centralized drag start logic
            />
          ))}
        </Layer>
      </Stage>
      
      {/* UI controls */}
      <div className="canvas-toolbar" style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        display: 'flex',
        gap: '10px',
        background: 'rgba(255, 255, 255, 0.8)',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 100
      }}>
        {/* Image upload button */}
        <label htmlFor="image-upload" style={{
          padding: '8px 12px',
          background: '#ffffff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span role="img" aria-label="Add Image" style={{ marginRight: '5px' }}>🖼️</span>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            multiple // Enable selecting multiple files
            onClick={(e) => { e.currentTarget.value = ''; }} // Clear previous selection to allow re-selecting same files
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                Array.from(files).forEach(file => {
                  const reader = new FileReader();
                  reader.onload = (evt: ProgressEvent<FileReader>) => {
                    const result = evt.target?.result;
                    if (typeof result !== 'string') return;
                    const img = new Image();
                    img.onload = () => {
                      const aspectRatio = img.width / img.height;
                      const newImage: CanvasImage = {
                        id: generateUniqueId('image'),
                        type: 'image',
                        url: result,
                        x: 0,
                        y: 0,
                        width: 200,
                        height: 200 / aspectRatio,
                        aspectRatio,
                        zIndex: canvasObjects.length + 1,
                        effects: [],
                      };
                      executeAction({ type: 'add', object: newImage });
                      if (onAddImage) onAddImage(newImage);
                    };
                    img.src = result;
                  };
                  reader.readAsDataURL(file);
                });
              }
            }}
          />
          Add Image
        </label>

        {/* Add Text button */}
        <button onClick={() => {
          const newText: CanvasText = {
            id: generateUniqueId('text'),
            type: 'text',
            text: 'New Text',
            fontSize: 24,
            fontFamily: 'Arial',
            x: 0,
            y: 0,
            width: 100,
            height: 30,
            zIndex: canvasObjects.length + 1,
            fill: '#000000',
            selected: false
          };
          executeAction({ type: 'add', object: newText });
        }} style={{
          padding: '8px 12px',
          background: '#ffffff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span role="img" aria-label="Add Text" style={{ marginRight: '5px' }}>📝</span>
          Add Text
        </button>

        {/* Add Rectangle button */}
        <button onClick={() => {
          const newRect: CanvasRectangle = {
            id: generateUniqueId('rect'),
            type: 'rectangle',
            x: 0,
            y: 0,
            width: 150,
            height: 100,
            zIndex: canvasObjects.length + 1,
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 2,
            selected: false
          };
          executeAction({ type: 'add', object: newRect });
        }} style={{
          padding: '8px 12px',
          background: '#ffffff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span role="img" aria-label="Add Rectangle" style={{ marginRight: '5px' }}>⬜</span>
          Add Rectangle
        </button>

        {/* Add Circle button */}
        <button onClick={() => {
          const newCircle: CanvasCircle = {
            id: generateUniqueId('circle'),
            type: 'circle',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            zIndex: canvasObjects.length + 1,
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 2,
            selected: false
          };
          executeAction({ type: 'add', object: newCircle });
        }} style={{
          padding: '8px 12px',
          background: '#ffffff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span role="img" aria-label="Add Circle" style={{ marginRight: '5px' }}>⭕</span>
          Add Circle
        </button>
      </div>

      {/* Canvas controls */}
      <div className="canvas-controls" style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'rgba(255, 255, 255, 0.8)',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button onClick={toggleGrid} style={{
            padding: '8px 12px',
            background: showGrid ? '#0096FF' : '#ffffff',
            color: showGrid ? '#ffffff' : '#333333',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            {showGrid ? 'Hide Grid' : 'Show Grid'}
          </button>
          <button onClick={() => setSnapToGrid(!snapToGrid)} style={{
            padding: '8px 12px',
            background: snapToGrid ? '#0096FF' : '#ffffff',
            color: snapToGrid ? '#ffffff' : '#333333',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            {snapToGrid ? 'Snap On' : 'Snap Off'}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => {
            setStagePos({ x: 0, y: 0 });
            setScale(1);
            updateVisibleBounds();
          }} style={{
            padding: '8px 12px',
            background: '#ffffff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Reset View
          </button>
          
          {selectedIds.length > 0 && (
            <button onClick={() => {
              selectedIds.forEach(id => {
                executeAction({ type: 'remove', objectId: id });
              });
              setSelectedIds([]);
            }} style={{
              padding: '8px 12px',
              background: '#ff3b30',
              color: '#ffffff',
              border: '1px solid #d42d28',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Delete Selected
            </button>
          )}
        </div>
        
        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={moveSelectedObjectsBackward} title="Move backward" style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              [
            </button>
            <button onClick={moveSelectedObjectsForward} title="Move forward" style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              ]
            </button>
            <button onClick={sendSelectedObjectsToBack} title="Send to back" style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              {"{"}
            </button>
            <button onClick={bringSelectedObjectsToFront} title="Bring to front" style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              {"}"}  
            </button>
          </div>
        )}
        
        {/* Zoom controls */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button onClick={() => {
            const newScale = Math.max(MIN_ZOOM, scale * 0.9);
            setScale(newScale);
            updateVisibleBounds();
          }} style={{ 
            padding: '6px 12px',
            background: '#ffffff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            -
          </button>
          <div style={{ 
            padding: '6px 0', 
            minWidth: '60px', 
            textAlign: 'center',
            background: '#ffffff',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}>
            {Math.round(scale * 100)}%
          </div>
          <button onClick={() => {
            const newScale = Math.min(MAX_ZOOM, scale * 1.1);
            setScale(newScale);
            updateVisibleBounds();
          }} style={{ 
            padding: '6px 12px',
            background: '#ffffff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            +
          </button>
        </div>
      </div>
    </div>
  );

};

export default InfiniteCanvas;
