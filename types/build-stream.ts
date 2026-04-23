export type StreamStep = {
  id: string;
  description: string;
  status: "running" | "completed";
};

export type StreamEvent =
  | { type: "step"; id: string; description: string; status: "running" | "completed" }
  | { type: "log"; content: string }
  | { type: "progress"; value: number }
  | { type: "tool"; name: string; status: "calling" | "called"; detail?: string }
  | { type: "preview"; previewUrl: string; sandboxId: string }
  | { type: "error"; message: string }
  | { type: "done" };
