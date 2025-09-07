import type { Viewport } from "next";
import React from "react";

// Metadata removed to eliminate header

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function InterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ 
      touchAction: 'none',
      overflow: 'hidden',
      position: 'fixed',
      width: '100vw',
      height: '100vh'
    }}>
      {children}
    </div>
  );
}