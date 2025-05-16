"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, type MouseEvent, type TouchEvent, memo } from "react"
import { Trash2, RotateCw, Download, Grid, Plus } from "lucide-react"

interface CanvasImage {
  id: string
  url: string
  x: number
  y: number
  width: number
  height: number
  aspectRatio: number
  rotation?: number
  selected?: boolean
}

interface InfiniteCanvasProps {
  images: CanvasImage[]
  setImages: React.Dispatch<React.SetStateAction<CanvasImage[]>>
}

// Memoized Image Component
const CanvasImage = memo(({ 
  image, 
  onMouseDown, 
  onResizeStart, 
  onRotateStart,
  zoom 
}: { 
  image: CanvasImage, 
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>, id: string) => void, 
  onResizeStart: (e: React.MouseEvent<HTMLDivElement>, id: string, handle: string) => void, 
  onRotateStart: (e: React.MouseEvent<HTMLDivElement>, id: string) => void,
  zoom: number
}) => {
  return (
    <div
      id={`image-${image.id}`}
      className={`absolute ${image.selected ? 'outline outline-2 outline-blue-500' : ''}`}
      style={{
        left: `${image.x}px`,
        top: `${image.y}px`,
        width: `${image.width}px`,
        height: `${image.height}px`,
        transform: image.rotation ? `rotate(${image.rotation}deg)` : undefined,
        transformOrigin: 'center center',
      }}
      onMouseDown={(e) => onMouseDown(e, image.id)}
    >
      <img
        src={image.url || '/placeholder.svg'}
        alt="Canvas item"
        className="w-full h-full object-contain cursor-move select-none"
        draggable={false}
      />

      {/* Resize handles (only show when selected) */}
      {image.selected && (
        <>
          {/* Top-left */}
          <div
            className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize resize-handle z-10"
            onMouseDown={(e) => onResizeStart(e, image.id, 'top-left')}
          />

          {/* Top-right */}
          <div
            className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize resize-handle z-10"
            onMouseDown={(e) => onResizeStart(e, image.id, 'top-right')}
          />

          {/* Bottom-left */}
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize resize-handle z-10"
            onMouseDown={(e) => onResizeStart(e, image.id, 'bottom-left')}
          />

          {/* Bottom-right */}
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize resize-handle z-10"
            onMouseDown={(e) => onResizeStart(e, image.id, 'bottom-right')}
          />

          {/* Rotation handle */}
          <div
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center cursor-pointer rotate-handle z-10"
            onMouseDown={(e) => onRotateStart(e, image.id)}
          >
            <RotateCw size={12} className="text-blue-500" />
          </div>
        </>
      )}
    </div>
  )
})

CanvasImage.displayName = 'CanvasImage'

export default function InfiniteCanvas({ images, setImages }: InfiniteCanvasProps) {
  // Canvas state
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [draggedImage, setDraggedImage] = useState<string | null>(null)
  const [dragImageOffset, setDragImageOffset] = useState({ x: 0, y: 0 })
  const [resizingImage, setResizingImage] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [rotatingImage, setRotatingImage] = useState<string | null>(null)
  const [rotateStart, setRotateStart] = useState(0)
  const [showGrid, setShowGrid] = useState(false)
  const [showAddImageModal, setShowAddImageModal] = useState(false)
  const [imageUrl, setImageUrl] = useState("")

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasContentRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle wheel events for zooming
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()

    // Determine zoom direction and amount
    const delta = e.deltaY > 0 ? -0.02 : 0.02
    const newZoom = Math.max(0.1, Math.min(5, zoom + delta))

    // Get mouse position relative to canvas
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate new position to zoom toward mouse cursor
    const newX = position.x - (mouseX / zoom) * delta
    const newY = position.y - (mouseY / zoom) * delta

    setZoom(newZoom)
    setPosition({ x: newX, y: newY })
  }

  // Add wheel event listener
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener("wheel", handleWheel, { passive: false })
    return () => {
      canvas.removeEventListener("wheel", handleWheel)
    }
  }, [zoom, position])

  // Handle mouse down on canvas
  const handleCanvasMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // Only start dragging the canvas if not clicking on an image
    if (
      (e.target as HTMLElement).tagName !== "IMG" &&
      !(e.target as HTMLElement).classList.contains("resize-handle") &&
      !(e.target as HTMLElement).classList.contains("rotate-handle")
    ) {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })

      // Deselect all images when clicking on canvas
      setImages((prev) => prev.map((img) => ({ ...img, selected: false })))
    }
  }

  // Memoized event handlers
  const handleImageMouseDown = useCallback((e: MouseEvent<HTMLDivElement>, imageId: string) => {
    e.stopPropagation()

    // Select the image and deselect others
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        selected: img.id === imageId,
      })),
    )

    // Start dragging the image
    setDraggedImage(imageId)

    const image = images.find((img) => img.id === imageId)
    if (!image) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    // Calculate the offset from the image's top-left corner
    const offsetX = (e.clientX - rect.left) / zoom - image.x
    const offsetY = (e.clientY - rect.top) / zoom - image.y

    setDragImageOffset({ x: offsetX, y: offsetY })
  }, [images, zoom])

  const handleResizeStart = useCallback((e: MouseEvent<HTMLDivElement>, imageId: string, handle: string) => {
    e.stopPropagation()

    const image = images.find((img) => img.id === imageId)
    if (!image) return

    setResizingImage(imageId)
    setResizeHandle(handle)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: image.width,
      height: image.height,
    })
  }, [images])

  const handleRotateStart = useCallback((e: MouseEvent<HTMLDivElement>, imageId: string) => {
    e.stopPropagation()

    const image = images.find((img) => img.id === imageId)
    if (!image) return

    const imageElement = document.getElementById(`image-${imageId}`)
    if (!imageElement) return

    const rect = imageElement.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // Calculate initial angle
    const initialAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX)

    setRotatingImage(imageId)
    setRotateStart(initialAngle)
  }, [images])

  // Handle mouse move
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      // Dragging the canvas
      const dx = (e.clientX - dragStart.x) / zoom
      const dy = (e.clientY - dragStart.y) / zoom

      setPosition({
        x: position.x - dx,
        y: position.y - dy,
      })

      setDragStart({ x: e.clientX, y: e.clientY })
    } else if (draggedImage) {
      // Dragging an image
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      // Calculate new position based on mouse position and offset
      const newX = (e.clientX - rect.left) / zoom - dragImageOffset.x
      const newY = (e.clientY - rect.top) / zoom - dragImageOffset.y

      setImages(prev => 
        prev.map(img => 
          img.id === draggedImage ? { ...img, x: newX, y: newY } : img
        )
      )
    } else if (resizingImage && resizeHandle) {
      // Resizing an image
      const image = images.find(img => img.id === resizingImage)
      if (!image) return

      const dx = (e.clientX - resizeStart.x) / zoom
      const dy = (e.clientY - resizeStart.y) / zoom

      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      let newX = image.x
      let newY = image.y

      // Calculate scale factor based on handle
      let scaleX = 1
      let scaleY = 1

      switch (resizeHandle) {
        case 'top-left':
          scaleX = 1 - dx / resizeStart.width
          scaleY = 1 - dy / resizeStart.height
          break
        case 'top-right':
          scaleX = 1 + dx / resizeStart.width
          scaleY = 1 - dy / resizeStart.height
          break
        case 'bottom-left':
          scaleX = 1 - dx / resizeStart.width
          scaleY = 1 + dy / resizeStart.height
          break
        case 'bottom-right':
          scaleX = 1 + dx / resizeStart.width
          scaleY = 1 + dy / resizeStart.height
          break
      }

      // Maintain aspect ratio if shift key is pressed
      if (e.shiftKey) {
        const scale = Math.abs(scaleX) > Math.abs(scaleY) ? scaleX : scaleY
        scaleX = scale
        scaleY = scale
      }

      // Apply scaling
      newWidth = Math.max(20, resizeStart.width * scaleX)
      newHeight = Math.max(20, resizeStart.height * scaleY)

      // Adjust position for top and left handles
      if (resizeHandle.includes('left')) {
        newX = image.x + (resizeStart.width - newWidth)
      }
      if (resizeHandle.includes('top')) {
        newY = image.y + (resizeStart.height - newHeight)
      }

      setImages(prev =>
        prev.map(img =>
          img.id === resizingImage
            ? {
                ...img,
                width: newWidth,
                height: newHeight,
                x: newX,
                y: newY
              }
            : img
        )
      )
    } else if (rotatingImage) {
      // Rotating an image
      const image = images.find(img => img.id === rotatingImage)
      if (!image) return

      const imageElement = document.getElementById(`image-${rotatingImage}`)
      if (!imageElement) return

      const rect = imageElement.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      // Calculate angle between center and mouse position
      const angle = Math.atan2(
        e.clientY - centerY,
        e.clientX - centerX
      )

      // Calculate rotation in degrees (add 270 to make 0° point up)
      const rotation = ((angle * 180) / Math.PI + 270) % 360

      setImages(prev => 
        prev.map(img => 
          img.id === rotatingImage ? { ...img, rotation } : img
        )
      )
    }
  }

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggedImage(null)
    setResizingImage(null)
    setResizeHandle(null)
    setRotatingImage(null)
  }

  // Handle touch events for mobile
  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    // Prevent default to avoid scrolling and other touch behaviors
    e.preventDefault()
    
    if (e.touches.length === 2) {
      // Two finger touch - for pinch zoom
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)

      // Store initial distance for pinch calculation
      canvasRef.current?.setAttribute("data-initial-pinch-distance", distance.toString())
      
      // Store initial zoom level
      canvasRef.current?.setAttribute("data-initial-zoom", zoom.toString())
    } else if (e.touches.length === 1) {
      // Single finger touch - for dragging
      const touch = e.touches[0]
      const target = document.elementFromPoint(touch.clientX, touch.clientY)
      
      // Check if we're touching an image or a handle
      if (target?.closest('.resize-handle, .rotate-handle')) {
        // Let the mouse event handlers deal with resizing/rotating
        return
      }
      
      // Otherwise, start canvas dragging
      setIsDragging(true)
      setDragStart({
        x: touch.clientX,
        y: touch.clientY,
      })
    }
  }, [zoom])

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault()

    if (e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)

      const initialDistance = Number.parseFloat(canvasRef.current?.getAttribute("data-initial-pinch-distance") || "0")

      if (initialDistance > 0) {
        // Calculate zoom change
        const delta = (distance - initialDistance) / 200
        const newZoom = Math.max(0.1, Math.min(5, zoom + delta))

        // Get center of pinch
        const centerX = (touch1.clientX + touch2.clientX) / 2
        const centerY = (touch1.clientY + touch2.clientY) / 2

        // Get position relative to canvas
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return

        const relativeX = centerX - rect.left
        const relativeY = centerY - rect.top

        // Calculate new position to zoom toward pinch center
        const zoomDelta = newZoom - zoom
        const newX = position.x - (relativeX / zoom) * zoomDelta
        const newY = position.y - (relativeY / zoom) * zoomDelta

        setZoom(newZoom)
        setPosition({ x: newX, y: newY })

        // Update initial distance for next calculation
        canvasRef.current?.setAttribute("data-initial-pinch-distance", distance.toString())
      }
    } else if (e.touches.length === 1 && isDragging) {
      // Single finger drag
      const dx = (e.touches[0].clientX - dragStart.x) / zoom
      const dy = (e.touches[0].clientY - dragStart.y) / zoom

      setPosition({
        x: position.x - dx,
        y: position.y - dy,
      })

      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      })
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    canvasRef.current?.removeAttribute("data-initial-pinch-distance")
  }

  // Delete selected image
  const deleteSelectedImage = () => {
    const selectedImage = images.find((img) => img.selected)
    if (selectedImage) {
      setImages((prev) => prev.filter((img) => img.id !== selectedImage.id))
    }
  }

  // Toggle grid
  const toggleGrid = () => {
    setShowGrid(!showGrid)
  }

  // Export canvas as image
  const exportCanvas = () => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx || !canvasContentRef.current) return

    const canvasContent = canvasContentRef.current
    const rect = canvasContent.getBoundingClientRect()

    canvas.width = 1131
    canvas.height = 800

    // Fill with white background
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw each image
    images.forEach(async (image) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = image.url

      await new Promise((resolve) => {
        img.onload = () => {
          ctx.save()

          // Position and rotate
          ctx.translate(image.x, image.y)
          if (image.rotation) {
            ctx.translate(image.width / 2, image.height / 2)
            ctx.rotate((image.rotation * Math.PI) / 180)
            ctx.translate(-image.width / 2, -image.height / 2)
          }

          // Draw the image
          ctx.drawImage(img, 0, 0, image.width, image.height)

          ctx.restore()
          resolve(null)
        }
      })
    })

    // Download the image
    const link = document.createElement("a")
    link.download = "canvas-export.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const newImage: CanvasImage = {
          id: `img-${Date.now()}`,
          url: event.target?.result as string,
          x: 100,
          y: 100,
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          rotation: 0,
          selected: true,
        }

        // Deselect all other images and add the new one
        setImages((prev) => [...prev.map((img) => ({ ...img, selected: false })), newImage])
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Add image from URL
  const addImageFromUrl = () => {
    if (!imageUrl) return

    const img = new Image()
    img.onload = () => {
      const newImage: CanvasImage = {
        id: `img-${Date.now()}`,
        url: imageUrl,
        x: 100,
        y: 100,
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        rotation: 0,
        selected: true,
      }

      // Deselect all other images and add the new one
      setImages((prev) => [...prev.map((img) => ({ ...img, selected: false })), newImage])

      // Close modal and reset URL
      setShowAddImageModal(false)
      setImageUrl("")
    }

    img.onerror = () => {
      alert("Failed to load image. Please check the URL and try again.")
    }

    img.src = imageUrl
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-white relative">
      {/* Canvas toolbar */}
      <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-md p-2 flex gap-2">
        <button
          className="p-2 hover:bg-gray-100 rounded-md"
          onClick={() => fileInputRef.current?.click()}
          title="Add Image"
        >
          <Plus size={18} />
        </button>
        <button
          className={`p-2 hover:bg-gray-100 rounded-md ${showGrid ? "bg-blue-100" : ""}`}
          onClick={toggleGrid}
          title="Toggle Grid"
        >
          <Grid size={18} />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-md" onClick={deleteSelectedImage} title="Delete Selected">
          <Trash2 size={18} />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-md" onClick={exportCanvas} title="Export Canvas">
          <Download size={18} />
        </button>
      </div>

      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
        style={{ touchAction: 'none' }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative"
          style={{
            transform: `scale(${zoom}) translate(${-position.x}px, ${-position.y}px)`,
            transformOrigin: "0 0",
            width: "100000px", // Very large size for "infinite" canvas
            height: "100000px",
          }}
        >
          {/* Canvas content */}
          <div
            ref={canvasContentRef}
            id="canvas-content"
            className="absolute bg-white rounded-[10px] border border-black border-opacity-5"
            style={{
              left: "1000px", // Centered in our "infinite" space
              top: "1000px",
              width: "1131px",
              height: "800px",
            }}
          >
            {/* Grid (optional) */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
              </div>
            )}

            {/* Images */}
            {images.map((image) => (
              <CanvasImage
                key={image.id}
                image={image}
                onMouseDown={handleImageMouseDown}
                onResizeStart={handleResizeStart}
                onRotateStart={handleRotateStart}
                zoom={zoom}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Add Image Modal */}
      {showAddImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Add Image from URL</h3>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Enter image URL"
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowAddImageModal(false)}>
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={addImageFromUrl}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
