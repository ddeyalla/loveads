# Loveads

Loveads is a Next.js application designed to help users go from product ideas to advertisement concepts through a chat-based interface and an interactive canvas. It simulates an AI assistant workflow for generating ad ideas and layouts, demonstrating a modern web interface built with React, TypeScript, and Tailwind CSS.

## Table of Contents

-   [Features](#features)
-   [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Installation](#installation)
    -   [Running the Project](#running-the-project)
-   [Usage](#usage)
    -   [Home Page](#home-page)
    -   [Playground Page](#playground-page)
    -   [Interactive Canvas](#interactive-canvas)
-   [Project Structure](#project-structure)
-   [Contributing](#contributing)
-   [License](#license)

## Features

*   **Chat-based UI:** Interact with a simulated AI assistant through a chat interface.
*   **Prompting:** Enter product briefs or marketing prompts using a content-editable input with quick suggestion "pills".
*   **Image Upload & Preview:** Drag-and-drop or upload images to include with your prompts. Preview thumbnails are shown.
*   **Simulated AI Planning:** Experience a simulated AI workflow that outlines planning steps (Deep research, Ad concepts, Ad generation).
*   **Simulated Ad Generation:** The application "generates" sample ad images (using placeholders) to represent AI-created ad concepts.
*   **Interactive Canvas:** Arrange, resize, and rotate generated images on an infinite canvas. Features include:
    *   Dragging and repositioning objects.
    *   Resizing with corner handles while maintaining aspect ratio.
    *   Rotating objects.
    *   Toggleable grid for alignment.
    *   Adding additional images via URL or file upload (supports multiple file upload, images are laid out with spacing).
    *   Keyboard shortcuts for common actions (Delete, Select All, Copy, Paste, Undo/Redo, Layering, Movement, Grid/Snap Toggle, Zoom).
*   **Export Canvas:** Export your canvas layout as a PNG image file.
*   **Responsive Design:** Built with Tailwind CSS for a modern, responsive user interface.

## Getting Started

Follow these instructions to set up and run Loveads locally.

### Prerequisites

*   Node.js (v18 or higher)
*   npm (or yarn, or pnpm)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/ddeyalla/loveads.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd loveads
    ```
3.  Install dependencies using npm (or your preferred package manager):
    ```bash
    npm install
    # or yarn install
    # or pnpm install
    ```
    Navigate into the `lovads` subdirectory for the Next.js app and install dependencies there as well:
    ```bash
    cd lovads
    npm install
    # or yarn install
    # or pnpm install
    ```

### Running the Project

Start the Next.js development server from the `lovads` directory:

```bash
cd lovads
npm run dev
# or yarn dev
# or pnpm dev
```

Open your browser and visit `http://localhost:3000`.

## Usage

### Home Page

*   Enter your ad prompt into the input box.
*   Drag and drop images, or click the camera icon to upload image files.
*   Use the suggestion pills below the input for quick prompt templates.
*   Click the send button (arrow up) or press `Ctrl + Enter` (`Cmd + Enter` on macOS) to submit your prompt.

### Playground Page

*   After submitting, you will be navigated to a dynamic route (`/playground/[projectName]`).
*   The chat history for your project will be displayed.
*   Observe the simulated AI planning steps.
*   Generated ad images will appear on the interactive canvas.

### Interactive Canvas

*   **Pan:** Click and drag on the empty canvas area.
*   **Select:** Click on an object to select it. Use `Shift` or `Ctrl` (`Cmd` on macOS) to multi-select.
*   **Move:** Drag selected objects. Use arrow keys for fine-tuned movement.
*   **Resize/Rotate:** Select an object and use the handles that appear.
*   **Add Images:** Use the "+" button to add images via URL. Use the upload button to add images from files (supports multiple files).
*   **Toggle Grid:** Click the grid icon or press `G`.
*   **Delete:** Select objects and press the `Delete` or `Backspace` key, or click the trash can icon in the toolbar.
*   **Select All:** Press `Ctrl + A` (`Cmd + A`).
*   **Copy/Paste:** Use `Ctrl + C` (`Cmd + C`) and `Ctrl + V` (`Cmd + V`).
*   **Undo/Redo:** Use `Ctrl + Z` (`Cmd + Z`) and `Ctrl + Y` (`Shift + Cmd + Z`).
*   **Layering:** Use `[` / `]` to move forward/backward one layer, and `{` / `}` to bring to front/send to back.
*   **Toggle Snap:** Press `S`.
*   **Export:** Click the download icon to save the canvas as a PNG.

## Project Structure

Key directories and files:

*   `/lovads/app`: Next.js App Router directory.
    *   `page.tsx`: Home page with prompt input.
    *   `playground/[projectName]/page.tsx`: Playground page with chat and canvas.
    *   `layout.tsx`: Root layout (includes fonts).
*   `/lovads/components`: Reusable React components.
    *   `infinite-canvas.tsx`: The main interactive canvas component.
    *   `canvas-client-wrapper.tsx`: Client wrapper for canvas components.
*   `/lovads/lib`: Utility functions.
*   `/lovads/public`: Static assets.
*   `/lovads/*.json`, `*.ts`, `*.js`: Configuration files (`package.json`, `tsconfig.json`, etc.).

## Contributing

Contributions are welcome!

*   Report issues or suggest features on GitHub Issues.
*   Fork the repository and submit pull requests.
*   Ensure your code adheres to the existing TypeScript and ESLint (with Next.js config) standards (`npm run lint`).
*   Styling is primarily done with Tailwind CSS. Use the `cn(...)` utility from `lib/utils.ts` for combining class names.

## License

This project does not currently have an explicit open-source license. Please clarify licensing terms if you intend to use or distribute it.