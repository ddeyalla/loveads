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

// More permissive URL regex that handles complex URLs with various special characters
const URL_REGEX = /(https?:\/\/|www\.|ftp:\/\/)[^\s\n\r\)\]\}"']+[^\s\n\r\)\]\}"'\.](?=[\s\n\r\)\]\}"']|$)/gim;

// List of common TLDs to help avoid matching trailing punctuation
const COMMON_TLDS = ['com', 'org', 'net', 'io', 'co', 'in', 'ai', 'dev', 'me', 'app'];

const highlightUrls = (text: string): string => {
  if (!text) return "";
  
  // First, escape all HTML special characters
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };
  
  // Split the text into parts, some of which are URLs and some aren't
  const parts: { text: string; isUrl: boolean }[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push({
        text: escapeHtml(text.substring(lastIndex, match.index)),
        isUrl: false
      });
    }
    
    // Process the URL
    let url = match[0];
    let cleanUrl = url;
    
    // Remove common trailing punctuation that might not be part of the URL
    const trailingPunctuation = ['.', ',', '!', '?', ';', ':', ')', ']', '}'];
    while (cleanUrl.length > 0 && trailingPunctuation.includes(cleanUrl[cleanUrl.length - 1])) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    
    // Ensure the URL has a protocol
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    // Add the URL part
    parts.push({
      text: `<span style="color: #0281F2;">${escapeHtml(url)}</span>`,
      isUrl: true
    });
    
    lastIndex = match.index + url.length;
  }
  
  // Add any remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push({
      text: escapeHtml(text.substring(lastIndex)),
      isUrl: false
    });
  }
  
  // Combine all parts
  return parts.map(part => part.text).join('');
};

export default function Home() {
  const router = useRouter()
  const [inputValue, setInputValue] = useState("")
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentEditableRef = useRef<HTMLDivElement>(null) // Changed from textareaRef
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const [currentSelection, setCurrentSelection] = useState<{start: number, end: number} | null>(null);

  // Auto-resize contentEditable div and its container as content grows
  useEffect(() => {
    const editableDiv = contentEditableRef.current;
    const container = scrollableContainerRef.current;
    if (!editableDiv || !container) return;

    const MIN_HEIGHT_PX = 60;
    const MAX_HEIGHT_PX = 312;

    if (inputValue === "") {
      container.style.height = `${MIN_HEIGHT_PX}px`;
      editableDiv.style.height = `${MIN_HEIGHT_PX}px`; // Ensure div also respects min height
    } else {
      editableDiv.style.height = 'auto'; // Reset div height to measure its scrollHeight for content
      const contentScrollHeight = editableDiv.scrollHeight;

      const newContainerHeight = Math.max(MIN_HEIGHT_PX, Math.min(contentScrollHeight, MAX_HEIGHT_PX));
      container.style.height = `${newContainerHeight}px`;
      editableDiv.style.height = `${contentScrollHeight}px`;
    }
  }, [inputValue]);

  // Effect to update contentEditable's innerHTML when inputValue changes & restore selection
  useEffect(() => {
    if (contentEditableRef.current) {
      const selection = window.getSelection();
      const currentTextInDiv = contentEditableRef.current.textContent || "";
      const expectedHTML = highlightUrls(inputValue);

      // Only update innerHTML if it's actually different or if plain text differs
      // This helps prevent unnecessary updates if formatting is already correct.
      if (currentTextInDiv !== inputValue || contentEditableRef.current.innerHTML !== expectedHTML) {
        contentEditableRef.current.innerHTML = expectedHTML;

        // Restore selection if the div is focused and a selection was previously saved
        if (currentSelection && selection && document.activeElement === contentEditableRef.current) {
          try {
            const newRange = document.createRange();
            let charCount = 0;
            let startNode: Node | null = null;
            let startIdxInNode = 0;
            let endNode: Node | null = null;
            let endIdxInNode = 0;

            const treeWalker = document.createTreeWalker(contentEditableRef.current, NodeFilter.SHOW_TEXT, null);
            let node;
            while ((node = treeWalker.nextNode())) {
              const nodeText = node.textContent || "";
              const nodeTextLength = nodeText.length;

              if (startNode === null && charCount + nodeTextLength >= currentSelection.start) {
                startNode = node;
                startIdxInNode = currentSelection.start - charCount;
              }
              if (endNode === null && charCount + nodeTextLength >= currentSelection.end) {
                endNode = node;
                endIdxInNode = currentSelection.end - charCount;
                break; 
              }
              charCount += nodeTextLength;
            }

            if (startNode && endNode) {
              startIdxInNode = Math.min(startIdxInNode, startNode.textContent?.length || 0);
              endIdxInNode = Math.min(endIdxInNode, endNode.textContent?.length || 0);
              if (startIdxInNode < 0) startIdxInNode = 0;
              if (endIdxInNode < 0) endIdxInNode = 0;

              newRange.setStart(startNode, startIdxInNode);
              newRange.setEnd(endNode, endIdxInNode);
              
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else if (contentEditableRef.current.childNodes.length > 0) {
              newRange.selectNodeContents(contentEditableRef.current);
              newRange.collapse(false); // To the end
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          } catch (error) {
            console.error("Failed to restore selection:", error);
            if (selection && contentEditableRef.current.childNodes.length > 0) {
              const range = document.createRange();
              range.selectNodeContents(contentEditableRef.current);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      }
    }
  }, [inputValue]); // currentSelection is not a direct dependency to avoid loops

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
    const newText = inputValue ? `${inputValue} ${suggestion}` : suggestion;
    setInputValue(newText)
    setSelectedSuggestion(suggestion)
    // Focus the input area after suggestion click
    contentEditableRef.current?.focus();
    // Set selection to the end of the input
    if (contentEditableRef.current) {
        const textLength = newText.length;
        setCurrentSelection({ start: textLength, end: textLength });
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => { // Changed from HTMLTextAreaElement
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault(); // Prevent newline in contentEditable
      handleSendMessage()
    }
    // Allow default for Enter if not Ctrl/Cmd for potential multi-line input in future
    // For now, single line behavior on Enter is default unless modified.
  }

  const handleContentEditableInput = (e: React.FormEvent<HTMLDivElement>) => {
    const currentElement = e.currentTarget;
    const newText = currentElement.textContent || "";

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && currentElement.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      
      let selectionStart = 0;
      let selectionEnd = 0;

      // Calculate selectionStart
      const preSelectionRangeStart = document.createRange();
      preSelectionRangeStart.selectNodeContents(currentElement);
      if(currentElement.contains(range.startContainer)){
          preSelectionRangeStart.setEnd(range.startContainer, range.startOffset);
          selectionStart = preSelectionRangeStart.toString().length;    
      } else { // Fallback if range.startContainer is not a child of currentElement
          selectionStart = newText.length;
      }

      // Calculate selectionEnd
      const preSelectionRangeEnd = document.createRange();
      preSelectionRangeEnd.selectNodeContents(currentElement);
      if(currentElement.contains(range.endContainer)){
          preSelectionRangeEnd.setEnd(range.endContainer, range.endOffset);
          selectionEnd = preSelectionRangeEnd.toString().length;
      } else { // Fallback if range.endContainer is not a child of currentElement
          selectionEnd = newText.length;
      }

      setCurrentSelection({ start: selectionStart, end: selectionEnd });
    } else {
      const len = newText.length;
      setCurrentSelection({ start: len, end: len });
    }
    setInputValue(newText);
  };

  const handleContentEditablePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    if (!pastedText) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    const textNode = document.createTextNode(pastedText);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);

    const currentElement = e.currentTarget;
    const newFullText = currentElement.textContent || "";
    
    // Calculate new selection based on pasted text length
    const prePasteRange = document.createRange();
    prePasteRange.selectNodeContents(currentElement);
    // The range's startContainer is where textNode was inserted, but its offset refers to *within* that node.
    // So, we need to find the global offset up to where the paste happened.
    // A simpler way: current selection is already at the end of pasted text. Recalculate its char offset.
    let newCursorPos = 0;
    const tempRangeForCursor = document.createRange();
    tempRangeForCursor.selectNodeContents(currentElement);
    if (currentElement.contains(range.endContainer)) {
        tempRangeForCursor.setEnd(range.endContainer, range.endOffset);
        newCursorPos = tempRangeForCursor.toString().length;
    } else {
        newCursorPos = newFullText.length;
    }

    setCurrentSelection({ start: newCursorPos, end: newCursorPos });
    setInputValue(newFullText);
  };

  console.log('[Component Render] inputValue:', inputValue); // DIAGNOSTIC
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-tr from-sky-300 via-purple-200 via-70% to-yellow-100 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute w-96 h-96 bg-green-100 opacity-50 rounded-full blur-3xl left-10 top-24"></div>
      <div className="absolute w-72 h-72 bg-pink-100 opacity-40 rounded-full blur-2xl right-24 top-10"></div>
      <div className="absolute w-96 h-96 bg-yellow-100 opacity-40 rounded-full blur-2xl right-0 bottom-0"></div>
      <div className="absolute w-80 h-80 bg-purple-200 opacity-30 rounded-full blur-2xl left-0 bottom-12"></div>
      {/* Noise texture overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[url('https://www.transparenttextures.com/patterns/3px-tile.png')] opacity-100 mix-blend-overlay"></div>
      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col min-h-[calc(100vh-80px)]">
        {/* Header - Sticky */}
        <header className="flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 fill-black" />
            <span className="text-xl font-medium">Loveads</span>
          </div>
          <button className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-medium">Tutorial</button>
        </header>

        {/* Main Content */}
        <main className="flex flex-col items-center justify-center flex-1 w-full max-w-3xl mx-auto">
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
                  {/* Actual contentEditable div for user input */}
                  <div
                    ref={contentEditableRef}
                    onInput={handleContentEditableInput}
                    onKeyDown={handleKeyDown}
                    onPaste={handleContentEditablePaste}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    className={`w-full resize-none text-base font-normal leading-normal bg-transparent outline-none p-3 absolute inset-0 text-gray-900`}
                    style={{
                      whiteSpace: 'pre-wrap', 
                      overflowWrap: 'break-word',
                      lineHeight: '1.5',
                      overflowY: 'hidden', // Important for scrollHeight calculation of parent
                      font: 'inherit',
                      caretColor: 'black',
                      minHeight: '24px', // Ensures div has some height even if empty for placeholder
                    }}
                    data-placeholder="Drop your ideas and the product link you want to create ads for"
                    aria-label="Message input"
                    role="textbox"
                    aria-multiline="true"
                    spellCheck={true}
                    autoCorrect="on"
                    autoCapitalize="sentences"
                  />
                  {inputValue === "" && (
                    <div 
                      className="absolute inset-0 p-3 text-gray-500 pointer-events-none select-none"
                      style={{ lineHeight: '1.5' }} // Match div's line height
                      aria-hidden="true"
                    >
                      Drop your ideas and the product link you want to create ads for
                    </div>
                  )}
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
