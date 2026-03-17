"use client";

import { WifiOff } from "lucide-react";

interface WebSocketBannerProps {
  isConnected: boolean;
}

export function WebSocketBanner({ isConnected }: WebSocketBannerProps) {
  if (isConnected) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
      <WifiOff className="h-4 w-4" />
      <span>Live updates paused. Refreshing every 15 seconds.</span>
    </div>
  );
}
