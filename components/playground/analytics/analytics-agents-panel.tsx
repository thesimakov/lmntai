"use client";

import { useState, useCallback } from "react";
import { Bot, CheckCircle2, XCircle, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AgentResult = {
  name: string;
  ok: boolean;
  output: string;
};

type AgentInsights = {
  generatedAt: string;
  agents: AgentResult[];
};

interface AnalyticsAgentsPanelProps {
  projectId: string;
}

export function AnalyticsAgentsPanel({ projectId }: AnalyticsAgentsPanelProps) {
  const [insights, setInsights] = useState<AgentInsights | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const runAgents = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/${projectId}/agents`, { method: "POST" });
      const data = await res.json() as { data?: { insights: AgentInsights }; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Agents failed");
      } else if (data.data?.insights) {
        setInsights(data.data.insights);
        setExpandedAgent(data.data.insights.agents[0]?.name ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setRunning(false);
    }
  }, [projectId]);

  if (!insights && !running && !error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
        <div className="p-2.5 rounded-full bg-primary/10">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-medium">AI Agent Analysis</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Three specialized AI agents analyze your data in parallel: Financial Analyst, BI Insight, and Schema Mapping.
        </p>
        <Button size="sm" className="gap-1.5 mt-1" onClick={() => void runAgents()}>
          <Play className="w-3.5 h-3.5" />
          Run Agents
        </Button>
      </div>
    );
  }

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-sm font-medium">Running agents in parallel...</p>
        <p className="text-xs text-muted-foreground">
          Financial Analyst · BI Insight · Schema Mapping
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
        <XCircle className="w-6 h-6 text-red-500" />
        <p className="text-sm text-red-500">{error}</p>
        <Button size="sm" variant="outline" onClick={() => void runAgents()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Re-run bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <p className="text-xs text-muted-foreground">
          {insights
            ? new Date(insights.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : ""}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs gap-1"
          onClick={() => void runAgents()}
          disabled={running}
        >
          <Play className="w-3 h-3" />
          Re-run
        </Button>
      </div>

      {/* Agent cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {insights?.agents.map((agent) => (
          <div
            key={agent.name}
            className={cn(
              "rounded-lg border border-border bg-background/50 overflow-hidden",
              !agent.ok && "border-red-200 bg-red-50/30"
            )}
          >
            {/* Header */}
            <button
              type="button"
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/40 transition-colors"
              onClick={() =>
                setExpandedAgent(expandedAgent === agent.name ? null : agent.name)
              }
            >
              {agent.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              )}
              <span className="text-xs font-medium flex-1 truncate">{agent.name}</span>
              <span className="text-muted-foreground text-xs">
                {expandedAgent === agent.name ? "▲" : "▼"}
              </span>
            </button>

            {/* Output */}
            {expandedAgent === agent.name && (
              <div className="px-3 pb-3 text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap border-t border-border/50 pt-2">
                {agent.output}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
