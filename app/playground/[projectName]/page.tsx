"use client"

import { useState, useEffect, useRef } from "react"
import { Heart, ChevronDown, Search, ImageIcon, ArrowUp, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import InfiniteCanvas from "@/components/infinite-canvas"

// Types for our chat messages
type MessageType = "user" | "agent" | "planning" | "research" | "creative" | "generation"

interface Message {
  id: string
  type: MessageType
  content: string
  timestamp: Date
  status?: "thinking" | "researching" | "creating" | "reviewing" | "fixing" | "completed"
  steps?: PlanningStep[]
}

interface PlanningStep {
  id: string
  title: string
  description: string
  icon: string
  status: "pending" | "active" | "completed"
}

// Canvas image type
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

export default function PlaygroundPage() {
  const params = useParams()
  const projectName = decodeURIComponent(params.projectName as string)

  // State for chat messages
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // State for canvas
  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>([])
  const [zoomLevel, setZoomLevel] = useState(25)
  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const [showZoomMenu, setShowZoomMenu] = useState(false)

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Initialize with the prompt from localStorage
  useEffect(() => {
    const savedPrompt = localStorage.getItem("loveads-prompt")
    if (savedPrompt) {
      // Add the user message
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        type: "user",
        content: savedPrompt,
        timestamp: new Date(),
      }

      setMessages([userMessage])

      // Check for uploaded images
      const savedImages = localStorage.getItem("loveads-images")
      if (savedImages) {
        try {
          const imageUrls = JSON.parse(savedImages)
          // We would process these images for the canvas here
        } catch (e) {
          console.error("Error parsing saved images:", e)
        }
      }

      // Clear localStorage
      localStorage.removeItem("loveads-prompt")
      localStorage.removeItem("loveads-images")

      // Simulate agent response after a short delay
      setTimeout(() => {
        simulateAgentResponse(savedPrompt)
      }, 1000)
    }
  }, [])

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Simulate agent response
  const simulateAgentResponse = (prompt: string) => {
    setIsLoading(true)

    // First response - agent acknowledgment
    setTimeout(() => {
      const agentMessage: Message = {
        id: `msg-${Date.now()}`,
        type: "agent",
        content: `Got it. I'll help you create eye-catching ads for The Whole Truth. Let me map out the best approach.`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, agentMessage])

      // Then show planning
      setTimeout(() => {
        const planningMessage: Message = {
          id: `msg-${Date.now()}`,
          type: "planning",
          content: `Here's a plan I've prepared to create the ad`,
          timestamp: new Date(),
          steps: [
            {
              id: "step-1",
              title: "Deep research",
              description: "Deep research about the product, brand, audience, competitors and more.",
              icon: "research",
              status: "pending",
            },
            {
              id: "step-2",
              title: "Ad concepts",
              description: "Generate ad concepts which matches the vibe of the brands aesthetics.",
              icon: "concept",
              status: "pending",
            },
            {
              id: "step-3",
              title: "Ad generation",
              description: "Generate ads for the product",
              icon: "generation",
              status: "pending",
            },
          ],
        }

        setMessages((prev) => [...prev, planningMessage])
        setIsLoading(false)

        // Start research after a delay
        setTimeout(() => {
          const researchStartMessage: Message = {
            id: `msg-${Date.now()}`,
            type: "agent",
            content: `Alright let's start executing the deep research to create your ads`,
            timestamp: new Date(),
          }

          setMessages((prev) => [...prev, researchStartMessage])

          // Update the planning message to mark research as active
          setMessages((prev) =>
            prev.map((msg) =>
              msg.type === "planning"
                ? {
                    ...msg,
                    steps: msg.steps?.map((step) => (step.id === "step-1" ? { ...step, status: "active" } : step)),
                  }
                : msg,
            ),
          )

          // Simulate generating images after some time
          setTimeout(() => {
            simulateImageGeneration()
          }, 5000)
        }, 2000)
      }, 1500)
    }, 1000)
  }

  // Simulate image generation
  const simulateImageGeneration = () => {
    // Sample image data (in a real app, this would come from an API)
    const sampleImages = [
      {
        id: `img-${Date.now()}-1`,
        url: "/placeholder-se463.png",
        width: 800,
        height: 600,
        aspectRatio: 800 / 600,
        rotation: 0,
      },
      {
        id: `img-${Date.now()}-2`,
        url: "/placeholder-b51mz.png",
        width: 600,
        height: 800,
        aspectRatio: 600 / 800,
        rotation: 0,
      },
      {
        id: `img-${Date.now()}-3`,
        url: "/placeholder-4rljk.png",
        width: 700,
        height: 700,
        aspectRatio: 1,
        rotation: 0,
      },
      {
        id: `img-${Date.now()}-4`,
        url: "/placeholder-v443x.png",
        width: 600,
        height: 900,
        aspectRatio: 600 / 900,
        rotation: 0,
      },
      {
        id: `img-${Date.now()}-5`,
        url: "/placeholder-9zsxv.png",
        width: 800,
        height: 800,
        aspectRatio: 1,
        rotation: 0,
      },
    ]

    // Position images next to each other with 40px spacing
    const positionedImages = sampleImages.map((img, index) => {
      // Calculate x position based on previous images' widths and spacing
      const previousWidth = sampleImages.slice(0, index).reduce((total, img) => total + img.width, 0)
      const spacingWidth = index * 40 // 40px spacing between images

      return {
        ...img,
        x: previousWidth + spacingWidth,
        y: 0, // All aligned at the top
      }
    })

    setCanvasImages(positionedImages)

    // Add a message about the generated images
    const generationMessage: Message = {
      id: `msg-${Date.now()}`,
      type: "agent",
      content: `I've generated some ad concepts for The Whole Truth protein powder. You can view and arrange them on the canvas.`,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, generationMessage])
  }

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInputValue("")
  }

  // Handle zoom level change
  const changeZoomLevel = (level: number) => {
    setZoomLevel(level)
    setShowZoomMenu(false)
  }

  // Render different message types
  const renderMessage = (message: Message) => {
    switch (message.type) {
      case "user":
        return (
          <div className="mb-4">
            <div className="text-gray-900 mb-1">{message.content}</div>
          </div>
        )

      case "agent":
        return (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-purple-100 p-1 rounded-full">
                <Heart className="h-4 w-4 text-purple-500" />
              </div>
              <div className="font-medium">Loveads</div>
              <div className="text-xs text-gray-500">Just now</div>
            </div>
            <div className="text-gray-900">{message.content}</div>
          </div>
        )

      case "planning":
        return (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-purple-100 p-1 rounded-full">
                <Heart className="h-4 w-4 text-purple-500" />
              </div>
              <div className="font-medium">Loveads</div>
              <div className="text-xs text-gray-500">Just now</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-pink-500">✨</div>
                  <div className="font-medium">Smart planning</div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
              <div className="text-gray-900 mb-3">{message.content}</div>

              {/* Planning steps */}
              <div className="space-y-3">
                {message.steps?.map((step) => (
                  <div key={step.id} className="bg-white rounded-md p-3">
                    <div className="flex items-start gap-2">
                      {step.icon === "research" && <div className="mt-0.5 text-gray-700">🔍</div>}
                      {step.icon === "concept" && <div className="mt-0.5 text-gray-700">✨</div>}
                      {step.icon === "generation" && <div className="mt-0.5 text-gray-700">🖼️</div>}
                      <div>
                        <div className="font-medium">{step.title}</div>
                        <div className="text-sm text-gray-600">{step.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-black" />
            <span className="font-medium">Loveads</span>
          </Link>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </div>

        <div className="relative">
          <button
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
            onClick={() => setShowProjectMenu(!showProjectMenu)}
          >
            <span>{projectName}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>

          {showProjectMenu && (
            <div className="absolute top-full mt-1 right-0 bg-white shadow-lg rounded-md py-1 w-40 z-10">
              <button className="w-full text-left px-3 py-2 hover:bg-gray-100">Rename</button>
              <button className="w-full text-left px-3 py-2 hover:bg-gray-100">Duplicate</button>
              <button className="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-500">Delete</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
              onClick={() => setShowZoomMenu(!showZoomMenu)}
            >
              <span>{zoomLevel}%</span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {showZoomMenu && (
              <div className="absolute top-full mt-1 right-0 bg-white shadow-lg rounded-md py-1 w-24 z-10">
                {[25, 50, 75, 100].map((level) => (
                  <button
                    key={level}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100"
                    onClick={() => changeZoomLevel(level)}
                  >
                    {level}%
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="p-1 rounded hover:bg-gray-100">
            <MoreHorizontal className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel - 25% width */}
        <div className="w-[372px] flex flex-col border-r">
          {/* Chat messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <div key={message.id}>{renderMessage(message)}</div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-pulse">
                  <Heart className="h-4 w-4 text-purple-500" />
                </div>
                <div>Thinking...</div>
              </div>
            )}
          </div>

          {/* Chat input */}
          <div className="p-4 border-t">
            <div className="bg-white rounded-xl border border-gray-200 p-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Drop you ideas and the product link you want to create ads for"
                className="w-full resize-none outline-none text-sm min-h-[60px] max-h-[120px]"
                rows={2}
              />

              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                  <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <Search className="h-5 w-5" />
                  </button>
                </div>

                <button
                  className={`p-2 rounded-full ${
                    inputValue.trim() ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-400"
                  }`}
                  disabled={!inputValue.trim()}
                  onClick={handleSendMessage}
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas area - 75% width */}
        <div className="flex-1 bg-white overflow-hidden">
          <InfiniteCanvas images={canvasImages} setImages={setCanvasImages} />
        </div>
      </div>
    </div>
  )
}
