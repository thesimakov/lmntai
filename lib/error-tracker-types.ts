export const ERROR_SOURCES = ["client", "server", "ai"] as const;
export type ErrorSource = (typeof ERROR_SOURCES)[number];

export const ERROR_TYPES = [
  "js_exception",
  "unhandled_rejection",
  "api_5xx",
  "form_action",
  "ai_stream",
] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];

export type ErrorReportPayload = {
  source: ErrorSource;
  errorType: ErrorType;
  module?: string;
  message: string;
  stack?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  viewport?: string;
  meta?: Record<string, unknown>;
};

// Priority-ordered: first matching prefix wins.
const MODULE_PATHS: [string, string][] = [
  ["/playground/box/editor/zero", "zero_block_editor"],
  ["/playground/build",           "build_editor"],
  ["/playground/box",             "box_editor"],
  ["/playground/cms",             "cms"],
  ["/playground/puck",            "puck"],
  ["/admin",                      "admin"],
  ["/login",                      "auth"],
  ["/forgot-password",            "auth"],
  ["/reset-password",             "auth"],
];

export function detectModule(pathname: string): string {
  const path = pathname.split("?")[0] ?? pathname;
  for (const [prefix, module] of MODULE_PATHS) {
    if (path.startsWith(prefix)) return module;
  }
  return "dashboard";
}
