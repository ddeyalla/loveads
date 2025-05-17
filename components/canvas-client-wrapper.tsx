"use client";

// BROWSER-ONLY WRAPPER: This component ensures Konva is ONLY loaded in browser environments
import React, { useState, useEffect } from 'react';
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
} from 'react-konva';
import useImage from 'use-image';

// delay rendering children until we're on the client
export default function CanvasClientWrapper({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) return null; // Render nothing on server or until client is mounted
  return <>{children}</>;
}

// re-export everything you want to import elsewhere
export {
  Stage,
  Layer,
  KonvaImage as Image,
  Transformer,
  Rect,
  Group,
  Line,
  Text,
  Circle,
  useImage,
};
