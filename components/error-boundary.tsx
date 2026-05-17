"use client";

import React from "react";

import { buildPayload, errorTracker } from "@/lib/error-tracker";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  module?: string;
};

type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const payload = buildPayload({
      source: "client",
      errorType: "js_exception",
      message: error.message,
      stack: error.stack,
      meta: {
        component:
          this.props.module ??
          info.componentStack?.split("\n")[1]?.trim() ??
          "unknown",
      },
    });
    errorTracker.report(payload);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
