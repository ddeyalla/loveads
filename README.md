Loveads
Loveads is a Next.js application (bootstrapped with create-next-app
github.com
) designed to help users go from product ideas to advertisement concepts. On the home page you enter a product or marketing prompt (or select a preset suggestion like “Brainstorm Ads” or “Beverages”
github.com
) and optionally upload images. When you submit, Loveads simulates an AI assistant that generates an advertising plan and example ad images. The AI “assistant” outlines a Smart Planning phase with tasks like Deep research, Ad concepts, and Ad generation
github.com
github.com
, and then provides sample ad images for you to arrange. The main audience is marketers/designers or developers exploring generative ad workflows; Loveads uses React, TypeScript, and Tailwind CSS in a modern web interface.
Features
Chat-based UI: Loveads presents a chat-like interface. You type (or paste) your product brief into a content-editable box. Suggestion “pills” (e.g. “Brainstorm Ads”, “Ad briefs”, “Bags”) let you quickly append common prompts
github.com
. As you type or drop links, Loveads detects URLs and highlights them.
Image Upload & Previews: You can drag-and-drop images onto the input area or click the Upload image button (camera icon) to select files
github.com
github.com
. Uploaded images show as preview thumbnails above the prompt box; you can remove them before sending.
AI Planning Steps: After submitting, Loveads simulates an agent that responds with a planning outline. It shows a “Smart planning” panel with steps (Deep research 🔍, Ad concepts ✨, Ad generation 🖼️)
github.com
github.com
. This mimics an AI workflow breaking down the task before generating content.
Ad Generation (Simulation): The app then “generates” sample ad images for the product. In the code this is simulated with placeholder images, but conceptually this represents integrating an image-generation API.
Interactive Canvas: Generated images appear on an Infinite Canvas. You can drag images to reposition them, resize using corner handles, or rotate them. A toggleable grid helps with alignment. You can add more images to the canvas via URL (click the Plus icon to open an “Add Image from URL” dialog
github.com
) or via file upload. Selecting an image shows corner handles for resize. The toolbar above the canvas has buttons to delete selected images, toggle grid, rotate selection, export the canvas, etc.
Exporting Ads: Click the Export Canvas (download) button to save your layout as a PNG. Under the hood, Loveads creates a HTML5 canvas, draws the images with their positions/rotations, and triggers a download
github.com
.
Suggestions & Shortcuts: Common workflows like Ctrl+Enter to send the prompt are supported
github.com
. The interface uses Tailwind CSS for styling and lucide-react for icons.
Installation
To set up Loveads locally, you need Node.js (v18+) and npm (or yarn) installed. Then:
Clone the repository and install dependencies:
git clone https://github.com/ddeyalla/loveads.git
cd loveads
npm install
Start the development server:
npm run dev
This uses Next.js’s development mode
github.com
.
Open your browser to http://localhost:3000. You should see the Loveads homepage with the prompt input.
Loveads does not require any backend keys or environment variables out of the box. The Stagewise toolbar is integrated (in development mode) for AI debugging
github.com
github.com
, but you can ignore it or disable it in production by setting NODE_ENV=production.
Usage
Home Page: On the home page, type your ad prompt (e.g. “Energy drink for athletes”). You can also drag-and-drop images or use the Upload button
github.com
github.com
. Suggestion buttons under the input allow quick prompt templates
github.com
.
Submit Prompt: Click the send (arrow up) button or press Ctrl+Enter
github.com
github.com
. Loveads saves your prompt (and any uploaded image URLs) to local storage and navigates to a dynamic route like /playground/my-product-project
github.com
.
Playground Page: The Playground page shows your chat history and an image canvas. First, your message appears, then the assistant’s reply. You’ll see messages like “Got it. I’ll help you create eye-catching ads…” followed by the Smart planning steps
github.com
. After a short delay, sample ad images are added to the canvas and the agent says “I’ve generated some ad concepts for … You can view and arrange them on the canvas.”
github.com
.
Interactive Canvas: Use your mouse (or touch) to move images around. Click an image to select it (an outline appears); drag its corners to resize it (maintaining aspect ratio); use the rotate handle or toolbar to rotate. The top bar has:
+ Add Image: Opens a modal to enter an image URL
github.com
.
Grid: Toggle a faint background grid.
Delete: Remove selected images.
Download: Export the canvas to a PNG file
github.com
.
Continuing the Chat: You can also type additional messages in the chat input at the bottom of the Playground page to simulate continued interaction (currently, this just echoes back as user messages).
In summary, Loveads lets you prototype ad layouts by simulating an AI chat workflow and then manually arranging images on a canvas.
Folder Structure
Key files and directories in this repo include:
/app: The Next.js app directory.
app/page.tsx – The Home page (prompt input and image upload UI)
github.com
github.com
.
app/playground/[projectName]/page.tsx – The Playground page for a given project. It renders the chat messages and the infinite canvas (via <InfiniteCanvas />)
github.com
github.com
.
app/layout.tsx – Root layout, includes fonts and the Stagewise dev toolbar (shown in development)
github.com
.
/components: Reusable React components.
InfiniteCanvas.tsx – The interactive image canvas component (handles dragging, resizing, rotating, grid, export)
github.com
github.com
.
ResizableImage.tsx – Renders each image on the canvas; supports drag/resize by mouse
github.com
github.com
.
LinkDetector.tsx – Highlights URLs in text (currently not actively used).
/lib: Utility functions.
utils.ts – Provides cn(...) helper to merge Tailwind class names (using clsx and tailwind-merge).
/public: Static assets (SVG icons, placeholders). For example, placeholder images (used as defaults) and icon files live here.
Configuration files:
package.json, tsconfig.json, tailwind.config.ts, etc., for dependencies and build settings. Notably, package.json specifies Next.js 15, React 19, and includes Tailwind CSS and Lucide icons
github.com
.
Contributing
Contributions are welcome! You can:
Report issues or feature requests on the GitHub Issues page.
Fork and submit pull requests for bug fixes or enhancements. The project uses TypeScript and ESLint (with Next.js config), so ensure new code passes linting (npm run lint).
Styling and code style: Tailwind CSS is used extensively; classnames can be combined with the cn(...) utility in lib/utils.ts.
Stagewise Toolbar: During development, the Stagewise toolbar (AI dev UI) is available. It can be helpful for debugging the simulated AI responses
github.com
.
Others: Add tests or examples if you see fit. Since there is no official license, ensure collaborators are aware of usage terms.
If you improve Loveads, please document any setup steps or usage changes in the README.
License
This repository does not include an explicit open-source license file. If you plan to use or distribute Loveads, you may wish to clarify licensing (for example, adding an MIT License or similar).