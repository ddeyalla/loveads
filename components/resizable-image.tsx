"use client"

import { useState, useRef, type MouseEvent } from "react"

interface ResizableImageProps {
  id: string
  url: string
  x: number
  y: number
  width: number
  height: number
  selected: boolean
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, width: number, height: number) => void
  onSelect: (id: string) => void
}

export default function ResizableImage({
  id,
  url,
  x,
  y,
  width,
  height,
  selected,
  onMove,
  onResize,
  onSelect,
}: ResizableImageProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialSize, setInitialSize] = useState({ width, height })
  const [aspectRatio, setAspectRatio] = useState(width / height)

  const imageRef = useRef<HTMLDivElement>(null)

  // Handle mouse down on image
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    onSelect(id)

    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  // Handle resize start
  const handleResizeStart = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()

    setIsResizing(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setInitialSize({ width, height })
  }

  // Handle mouse move
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y

      onMove(id, x + dx, y + dy)
      setDragStart({ x: e.clientX, y: e.clientY })
    } else if (isResizing) {
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y

      // Maintain aspect ratio
      const newWidth = Math.max(50, initialSize.width + dx)
      const newHeight = newWidth / aspectRatio

      onResize(id, newWidth, newHeight)
    }
  }

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  return (
    <div
      ref={imageRef}
      className={`absolute ${selected ? "ring-2 ring-blue-500" : ""}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img
        src={url || "/placeholder.svg"}
        alt="Canvas item"
        className="w-full h-full object-contain cursor-move"
        draggable={false}
      />

      {selected && (
        <>
          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize"
            onMouseDown={handleResizeStart}
          />
        </>
      )}
    </div>
  )
}
