import { Heart } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="flex flex-col items-center">
        <div className="animate-pulse mb-4">
          <Heart className="h-12 w-12 text-purple-500 fill-purple-500" />
        </div>
        <div className="text-xl font-medium">Loading your project...</div>
      </div>
    </div>
  )
}
