"use client";

import React, { useState, useEffect } from 'react';

// This component will dynamically load Konva components only on the client side
export default function KonvaWrapper({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only render children (which use Konva) on the client side
  if (!isClient) {
    return <div>Loading canvas...</div>;
  }

  return <>{children}</>;
}
