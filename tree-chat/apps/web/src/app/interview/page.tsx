"use client";

import React, { useEffect } from "react";
import { InterviewTree } from "@/components/interview/InterviewTree";

export default function InterviewPage(): React.ReactNode {
  // Prevent default browser zoom behaviors
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    
    // Prevent browser zoom shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0')) {
        e.stopPropagation();
      }
    };
    
    // Prevent touch zoom gestures on Safari
    document.addEventListener('gesturestart', preventDefault, { passive: false });
    document.addEventListener('gesturechange', preventDefault, { passive: false });
    document.addEventListener('gestureend', preventDefault, { passive: false });
    
    // Don't interfere with our custom keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('gesturestart', preventDefault);
      document.removeEventListener('gesturechange', preventDefault);
      document.removeEventListener('gestureend', preventDefault);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  return (
    <div 
      className="h-screen w-screen overflow-hidden bg-background"
      style={{ touchAction: 'none' }}
    >
      <InterviewTree />
    </div>
  );
}