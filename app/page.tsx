"use client"

import type React from "react"

import { Heart, ImageIcon, X, ArrowUp } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

interface UploadedImage {
  id: string
  file: File
  previewUrl: string
}

export default function Home() {
  const router = useRouter()
  const [inputValue, setInputValue] = useState("")
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea and its container as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    const container = scrollableContainerRef.current;
    if (!textarea || !container) return;

    const MIN_HEIGHT_PX = 60;
    const MAX_HEIGHT_PX = 312; // Reflecting user's last manual change

    if (inputValue === "") {
      container.style.height = `${MIN_HEIGHT_PX}px`;
      textarea.style.height = `${MIN_HEIGHT_PX}px`;
      textarea.value = ""; // Explicitly clear textarea value if inputValue is empty
    } else {
      // Reset textarea height to accurately measure its scrollHeight for content
      textarea.style.height = 'auto';
      const contentScrollHeight = textarea.scrollHeight;

      // Determine new height for the container, capped at MAX_HEIGHT_PX and not less than MIN_HEIGHT_PX
      const newContainerHeight = Math.max(MIN_HEIGHT_PX, Math.min(contentScrollHeight, MAX_HEIGHT_PX));
      container.style.height = `${newContainerHeight}px`;

      // Textarea should effectively fill the container or its own content height if it's pushing the limits
      // To ensure correct scroll experience within the container, textarea's height should match its full content extent.
      textarea.style.height = `${contentScrollHeight}px`; 
    }
  }, [inputValue]);
  
  // Handle cursor position when selecting suggestions
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || document.activeElement !== textarea) return;
    
    // Maintain cursor position when input changes
    const position = textarea.selectionStart;
    const newPosition = Math.min(position, inputValue.length);
    
    // Use requestAnimationFrame to ensure the DOM has updated
    const rafId = requestAnimationFrame(() => {
      // Check if the textarea is still mounted and focused
      if (document.activeElement === textarea && textareaRef.current) {
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    });

    // Cleanup function to cancel the animation frame if component unmounts
    return () => cancelAnimationFrame(rafId);
  }, [inputValue]);

  // Standardized URL regex pattern with improved matching
  const URL_REGEX = /(https?:\/\/[^\s<>")]+|www\.[^\s<>"]+\.[^\s<>"]+[^\s<>\",.!?])(?=\s|$)/gi;
  
  // Function to detect if text contains a URL
  const containsUrl = (text: string): boolean => {
    return URL_REGEX.test(text);
  }

  // Function to extract URLs from text
  const extractUrls = (text: string): string[] => {
    // Reset regex state before using it
    URL_REGEX.lastIndex = 0;
    return text.match(URL_REGEX) || [];
  }

  const handleImageUpload = () => {
    fileInputRef.current?.click()
  }

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newImages: UploadedImage[] = []

    Array.from(files).forEach((file) => {
      // Only process image files
      if (!file.type.startsWith("image/")) return

      const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const previewUrl = URL.createObjectURL(file)

      newImages.push({
        id,
        file,
        previewUrl,
      })
    })

    setUploadedImages((prev) => [...prev, ...newImages])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files)

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    processFiles(e.dataTransfer.files)
  }

  const removeImage = (id: string) => {
    setUploadedImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id)

      // Revoke the object URL to avoid memory leaks
      const imageToRemove = prev.find((img) => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl)
      }

      return filtered
    })
  }

  const handleSendMessage = () => {
    if (!inputValue.trim() && uploadedImages.length === 0) return

    // Generate a project name from the input
    const projectName = generateProjectName(inputValue)

    // Store the message and images in localStorage to retrieve in the playground
    localStorage.setItem("loveads-prompt", inputValue)

    // Store uploaded images if any
    if (uploadedImages.length > 0) {
      const imageUrls = uploadedImages.map((img) => img.previewUrl)
      localStorage.setItem("loveads-images", JSON.stringify(imageUrls))
    }

    // Redirect to the playground page with the project name
    router.push(`/playground/${encodeURIComponent(projectName)}`)
  }

  const generateProjectName = (input: string): string => {
    // Extract first few words and create a slug
    const words = input
      .split(" ")
      .filter((word) => word.length > 2)
      .slice(0, 4)

    let slug = words
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "") // Remove special characters
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen

    // If slug is empty or too short, use a default with timestamp
    if (!slug || slug.length < 3) {
      const productType = selectedSuggestion ? selectedSuggestion.toLowerCase().replace(/\s+/g, "-") : "new"
      slug = `${productType}-project-${Date.now().toString().slice(-6)}`
    }

    return slug
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSelectedSuggestion(suggestion);
    setInputValue(prev => prev + (prev ? ' ' : '') + suggestion);

    // Focus the textarea after selecting a suggestion
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        const position = textarea.value.length;
        textarea.setSelectionRange(position, position);
      }
    }, 0);
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSendMessage()
    }
  }

  // Handle text input changes and auto-insert space after URLs
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    // Reset regex state before using it
    URL_REGEX.lastIndex = 0;
    
    // Check if we're at the end of a URL
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const textAfterCursor = newValue.substring(cursorPosition);
    
    // Find URLs in the text before cursor
    let lastUrlEnd = -1;
    let match;
    
    // Check for URLs before cursor
    while ((match = URL_REGEX.exec(textBeforeCursor)) !== null) {
      lastUrlEnd = match.index + match[0].length;
    }
    
    // If cursor is right after a URL and there's no space/punctuation after
    if (lastUrlEnd === cursorPosition && 
        (textAfterCursor.length === 0 || !/^[\s,.:;!?]/.test(textAfterCursor))) {
      const modifiedValue = textBeforeCursor + ' ' + textAfterCursor;
      setInputValue(modifiedValue);
      
      // Update cursor position after state update
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const newCursorPos = cursorPosition + 1;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
      return;
    }
    
    // Default behavior if no URL was just completed
    setInputValue(newValue);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    const selectionStart = e.currentTarget.selectionStart || 0;
    const selectionEnd = e.currentTarget.selectionEnd || 0;
    
    // Calculate where the pasted text will end *before* any URL processing adds spaces
    const endOfPastedTextPos = selectionStart + pastedText.length;

    // Insert the pasted text
    let newValue = inputValue.substring(0, selectionStart) + 
                 pastedText + 
                 inputValue.substring(selectionEnd);
    
    // Process URLs in the pasted text
    URL_REGEX.lastIndex = 0;
    let match;
    const urls: Array<{start: number, end: number}> = [];
    
    // First, find all URLs in the new value
    while ((match = URL_REGEX.exec(newValue)) !== null) {
      urls.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // Store original cursor position before URL processing
    const originalCursorPos = selectionStart + pastedText.length;
    
    // Process URLs from right to left to avoid offset issues
    let offset = 0;
    for (let i = urls.length - 1; i >= 0; i--) {
      const url = urls[i];
      const urlEnd = url.end + offset;
      
      // Check if we need to add a space after this URL
      if (urlEnd >= newValue.length || !/^[\s,.:;!?]/.test(newValue[urlEnd])) {
        newValue = newValue.substring(0, urlEnd) + ' ' + newValue.substring(urlEnd);
        offset++;
      }
    }
    
    // Update the value
    setInputValue(newValue);
    
    // Use multiple frames to ensure cursor position is set correctly
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(endOfPastedTextPos, endOfPastedTextPos);
        }
      });
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-300 via-teal-200 to-purple-300 flex flex-col">
      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col">
        {/* Header - Sticky */}
        <header className="flex justify-between items-center p-[10px_20px] sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 fill-black" />
            <span className="text-xl font-medium">Loveads</span>
          </div>
          <button className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-medium">Tutorial</button>
        </header>

        {/* Main Content */}
        <main className="flex flex-col items-center justify-center flex-1 max-w-3xl mx-auto w-full">
          <h1 className="text-4xl md:text-5xl font-bold text-center">What are we designing today?</h1>
          <p className="mt-4 text-center text-base">Concept to ads, with your personal marketing team</p>

          {/* Input Box - Interactive version with image preview and drag-drop */}
          <div
            className="mt-10 w-full flex justify-center"
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div
              className={`w-[512px] px-3 py-2.5 bg-white rounded-2xl outline outline-1 outline-offset-[-1px] 
              ${isDragging ? "outline-blue-400 bg-blue-50" : "outline-gray-200"} 
              inline-flex flex-col justify-end items-end gap-4 overflow-hidden transition-colors`}
            >
              {/* Image Previews - Above text input */}
              {uploadedImages.length > 0 && (
                <div className="self-stretch flex flex-wrap gap-2 mb-2">
                  {uploadedImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <div className="w-16 h-16 rounded-md overflow-hidden border border-gray-200">
                        <img
                          src={img.previewUrl || "/placeholder.svg"}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Text input area - Simplified implementation */}
              <div className="relative w-full">
                {/* Main content display layer */}
                <div 
                  ref={scrollableContainerRef} 
                  className="relative"
                  style={{ minHeight: '60px', overflowY: 'auto' }} 
                >
                  {/* Formatted text overlay - only shown when input has value */}
                  {inputValue && (
                    <div 
                      className="absolute inset-0 p-3 whitespace-pre-wrap break-words pointer-events-none"
                      aria-hidden="true"
                    >
                      {inputValue.trim() !== "" ? (() => { // Ensure it doesn't render for whitespace-only inputValue either
                        // Split text by URLs and non-URLs for proper rendering
                        const parts: {text: string, isUrl: boolean}[] = [];
                        let lastIndex = 0;
                        let match;
                        
                        // Reset regex state
                        URL_REGEX.lastIndex = 0;
                        
                        // Find all URLs and the text between them
                        while ((match = URL_REGEX.exec(inputValue)) !== null) {
                          // Add text before the URL
                          if (match.index > lastIndex) {
                            parts.push({
                              text: inputValue.substring(lastIndex, match.index),
                              isUrl: false
                            });
                          }
                          
                          // Add the URL
                          parts.push({
                            text: match[0],
                            isUrl: true
                          });
                          
                          lastIndex = match.index + match[0].length;
                        }
                        
                        // Add remaining text after last URL
                        if (lastIndex < inputValue.length) {
                          parts.push({
                            text: inputValue.substring(lastIndex),
                            isUrl: false
                          });
                        }
                        
                        // Render all parts
                        return parts.map((part, i) => (
                          <span 
                            key={i} 
                            className={part.isUrl 
                              ? "text-[#0281F2] bg-blue-50 px-1 rounded hover:bg-blue-100 transition-colors" 
                              : "text-gray-900"}
                          >
                            {part.text}
                          </span>
                        ));
                      })() : null} 
                    </div>
                  )}
                  
                  {/* Actual textarea for user input */}
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      // Allow default behavior for all keys except Enter when not combined with Ctrl/Cmd
                      if (e.key === 'Enter' && !(e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                      }
                      handleKeyDown(e);
                    }}
                    onPaste={handlePaste}
                    placeholder="Drop your ideas and the product link you want to create ads for"
                    className={`w-full resize-none text-base font-normal leading-normal bg-transparent outline-none p-3 absolute inset-0 ${inputValue ? 'text-transparent' : 'text-gray-900'}`}
                    rows={1}
                    style={{ 
                      whiteSpace: 'pre-wrap', 
                      overflowWrap: 'break-word',
                      lineHeight: '1.5',
                      overflowY: 'hidden',
                      font: 'inherit',
                      caretColor: 'black' // Ensure caret is visible
                    }}
                    aria-label="Message input"
                    role="textbox"
                    aria-multiline="true"
                    spellCheck={true}
                    autoCorrect="on"
                    autoCapitalize="sentences"
                  />
                </div>
              </div>

              {/* Drag overlay message */}
              {isDragging && (
                <div className="absolute inset-0 bg-blue-50 bg-opacity-70 flex items-center justify-center rounded-2xl z-10">
                  <div className="text-blue-500 font-medium flex flex-col items-center">
                    <ImageIcon className="w-10 h-10 mb-2" />
                    <span>Drop images here</span>
                  </div>
                </div>
              )}

              {/* Buttons row */}
              <div className="self-stretch inline-flex justify-between items-center">
                <div className="flex justify-start items-center gap-2">
                  {/* Image upload button with proper icon */}
                  <button
                    onClick={handleImageUpload}
                    className="p-3 bg-white rounded-[100px] outline outline-1 outline-offset-[-1px] outline-gray-200 flex justify-center items-center hover:bg-gray-50"
                    aria-label="Upload image"
                  >
                    <ImageIcon className="w-4 h-4 text-gray-700" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                  />
                </div>

                {/* Send button */}
                <button
                  onClick={handleSendMessage}
                  className={`self-stretch min-w-10 p-2 rounded-[100px] flex justify-center items-center gap-1 overflow-hidden transition-colors ${
                    inputValue.trim() || uploadedImages.length > 0
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!inputValue.trim() && uploadedImages.length === 0}
                  aria-label="Send message"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Suggestion Pills */}
          <div className="flex flex-wrap gap-3 mt-8 justify-center">
            {["Brainstorm Ads", "Ad briefs", "Beverages", "Bags"].map((tag) => (
              <button
                key={tag}
                className={`px-5 py-2 rounded-full text-sm transition-colors ${
                  selectedSuggestion === tag ? "bg-blue-100 text-blue-700" : "bg-white hover:bg-gray-50"
                }`}
                onClick={() => handleSuggestionClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
