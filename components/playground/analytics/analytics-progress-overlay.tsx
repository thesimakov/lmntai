"use client";

import { Loader2 } from "lucide-react";

interface Props {
  progress: number;
  message: string;
}

export function AnalyticsProgressOverlay({ progress, message }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20 gap-6">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <div className="w-64 space-y-2 text-center">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
