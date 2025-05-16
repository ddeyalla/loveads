"use client"

interface LinkDetectorProps {
  text: string
}

export function LinkDetector({ text }: LinkDetectorProps) {
  // URL regex pattern
  const urlRegex = /(https?:\/\/[^\s]+)/g

  // If no URLs, return the text as is
  if (!text.match(urlRegex)) {
    return <>{text}</>
  }

  // Split the text by URLs
  const parts = text.split(urlRegex)

  // Find all URLs in the text
  const urls = text.match(urlRegex) || []

  // Combine parts and URLs with appropriate styling
  const result = []
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      result.push(<span key={`part-${i}`}>{parts[i]}</span>)
    }
    if (i < urls.length) {
      result.push(
        <span key={`url-${i}`} className="text-[#0281F2]">
          {urls[i]}
        </span>,
      )
    }
  }

  return <>{result}</>
}
