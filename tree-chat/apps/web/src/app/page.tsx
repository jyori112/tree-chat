"use client";

import { Thread } from "@/components/thread";
import { StreamProvider } from "@/providers/Stream";
import { ThreadProvider } from "@/providers/Thread";
import { Toaster } from "@/components/ui/sonner";
import React from "react";
import Link from "next/link";

export default function DemoPage(): React.ReactNode {
  return (
    <React.Suspense fallback={<div>Loading (layout)...</div>}>
      <Toaster />
      <div className="relative">
        <div className="absolute top-4 left-4 z-50 flex gap-4">
          <Link 
            href="/visual-brainstorm" 
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          >
            ビジュアルブレスト
          </Link>
          <Link 
            href="/brainstorm" 
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          >
            ブレインストーミング
          </Link>
          <Link 
            href="/lean-canvas" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            リーンキャンバス
          </Link>
          <Link 
            href="/data-store-test" 
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Data Store Test
          </Link>
          <Link 
            href="/sessions-test" 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Sessions Test
          </Link>
          <Link 
            href="/sessions" 
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          >
            セッション管理
          </Link>
        </div>
        <ThreadProvider>
          <StreamProvider>
            <Thread />
          </StreamProvider>
        </ThreadProvider>
      </div>
    </React.Suspense>
  );
}
