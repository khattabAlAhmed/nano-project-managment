"use client";

import * as React from "react";
import {
  Bot,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  BarChart3,
  Clock,
  Building2,
  CheckCircle2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProject } from "@/lib/project-context";
import { useTranslations } from "next-intl";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AiAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function AiAssistantPanel({ open, onOpenChange }: AiAssistantPanelProps) {
  const { activeProject } = useProject();
  const t = useTranslations("ai");

  // State
  const [messages, setMessages] = React.useState<ConversationMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeCategory, setActiveCategory] = React.useState<string>("all");

  // Refs
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when panel opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  // Reset conversation when project changes
  React.useEffect(() => {
    setMessages([]);
    setError(null);
    setActiveCategory("all");
  }, [activeProject?.id]);

  // Categories list
  const categories = React.useMemo(
    () => [
      { id: "all", label: t("categories.all") },
      { id: "progress", label: t("categories.progress") },
      { id: "delay", label: t("categories.delay") },
      { id: "approvals", label: t("categories.approvals") },
      { id: "centers", label: t("categories.centers") },
      { id: "timeline", label: t("categories.timeline") },
    ],
    [t]
  );

  // Dynamic Suggested prompts
  const suggestions = React.useMemo(() => {
    if (activeCategory === "all") {
      return [
        { icon: Clock, text: t("suggestion1") },
        { icon: BarChart3, text: t("suggestion2") },
        { icon: Building2, text: t("suggestion3") },
        { icon: CheckCircle2, text: t("suggestion4") },
      ];
    }

    const iconsMap: Record<string, any> = {
      progress: BarChart3,
      delay: AlertCircle,
      approvals: CheckCircle2,
      centers: Building2,
      timeline: Clock,
    };
    const icon = iconsMap[activeCategory] || Bot;

    try {
      const array = t.raw(`suggestions.${activeCategory}`) as string[];
      return array.map((text) => ({ icon, text }));
    } catch {
      return [];
    }
  }, [activeCategory, t]);

  // ─── Send Message ───────────────────────────────────────────────────────────

  const sendMessage = React.useCallback(
    async (content: string, categoryOverride?: string) => {
      if (!content.trim() || !activeProject || isLoading) return;

      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setError(null);
      setIsLoading(true);

      try {
        // Build messages array for API (all history)
        const apiMessages = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: content.trim() },
        ];

        const categoryParam = categoryOverride || (activeCategory !== "all" ? activeCategory : undefined);

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: activeProject.id,
            messages: apiMessages,
            category: categoryParam,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to get response");
        }

        const assistantMessage: ConversationMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: any) {
        setError(err.message || t("errorGeneric"));
      } finally {
        setIsLoading(false);
      }
    },
    [activeProject, isLoading, messages, activeCategory, t]
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestionClick = (text: string) => {
    sendMessage(text);
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMsg = [...messages]
        .reverse()
        .find((m) => m.role === "user");
      if (lastUserMsg) {
        setMessages((prev) => prev.filter((m) => m.id !== lastUserMsg.id));
        setError(null);
        sendMessage(lastUserMsg.content);
      }
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setError(null);
    setInput("");
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const hasMessages = messages.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-[440px] p-0 gap-0"
        showCloseButton={false}
      >
        {/* ── Header ── */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60 bg-gradient-to-b from-primary/[0.03] to-transparent shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold">
                  {t("title")}
                </SheetTitle>
                <SheetDescription className="text-[11px] text-text-muted mt-0">
                  {activeProject
                    ? `${t("subtitle")} ${activeProject.name}`
                    : t("noProject")}
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {hasMessages && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={clearConversation}
                  title={t("clearChat")}
                >
                  <RefreshCw className="size-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onOpenChange(false)}
              >
                <span className="text-xs font-bold text-text-muted">✕</span>
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* ── Category Pill Filters ── */}
        {activeProject && (
          <div className="px-4 py-2.5 bg-muted/20 border-b border-border/40 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 -my-1">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all shrink-0 border ${
                      isActive
                        ? "bg-primary border-primary text-primary-foreground shadow-sm"
                        : "bg-background border-border/60 text-text-secondary hover:bg-muted/80 hover:text-text-primary"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Messages Area ── */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div ref={scrollRef} className="px-4 py-4 space-y-4 min-h-full flex flex-col">
              {!hasMessages && !isLoading ? (
                /* ── Empty State ── */
                <div className="flex-1 flex flex-col items-center justify-center py-8 gap-5">
                  <div className="size-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 flex items-center justify-center">
                    <Bot className="size-7 text-primary/70" />
                  </div>
                  <div className="text-center space-y-1.5 max-w-[280px]">
                    <p className="text-sm font-medium text-text-primary">
                      {t("emptyTitle")}
                    </p>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      {t("emptyDesc")}
                    </p>
                  </div>

                  {/* ── Quick Action Card ── */}
                  {activeCategory !== "all" && activeProject && (
                    <div className="w-full max-w-[320px] p-3.5 rounded-xl border border-primary/15 bg-primary/[0.01] flex flex-col gap-2.5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded bg-primary/10 flex items-center justify-center">
                          <Sparkles className="size-3 text-primary animate-pulse shrink-0" />
                        </div>
                        <span className="text-[10px] font-semibold text-text-primary">
                          {t(`categories.${activeCategory}`)} Diagnostics
                        </span>
                      </div>
                      <p className="text-[10px] text-text-secondary leading-normal">
                        One-click operational diagnostics powered by focused, real-time database snapshots.
                      </p>
                      <Button
                        type="button"
                        onClick={() => sendMessage(t(`quickActions.${activeCategory}`))}
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/95 text-primary-foreground text-[10px] font-semibold py-1.5 h-8 rounded-lg transition-all"
                      >
                        {t(`quickActions.${activeCategory}`)}
                      </Button>
                    </div>
                  )}

                  {/* Suggestion chips */}
                  <div className="grid gap-2 w-full max-w-[320px]">
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion.text)}
                        disabled={!activeProject}
                        className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-border/60 bg-card hover:bg-accent hover:border-primary/20 transition-all text-start disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <suggestion.icon className="size-3.5 text-text-muted group-hover:text-primary shrink-0 transition-colors" />
                        <span className="text-[11px] text-text-secondary group-hover:text-text-primary transition-colors leading-snug">
                          {suggestion.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── Conversation Messages ── */
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="size-6 rounded-md bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="size-3 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted/60 text-text-primary border border-border/40 rounded-bl-sm"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div className="ai-response-content whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* ── Loading Indicator ── */}
                  {isLoading && (
                    <div className="flex gap-2.5 justify-start">
                      <div className="size-6 rounded-md bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="size-3 text-primary" />
                      </div>
                      <div className="bg-muted/60 border border-border/40 rounded-xl rounded-bl-sm px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-1">
                            <span className="size-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
                            <span className="size-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
                            <span className="size-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
                          </div>
                          <span className="text-[10px] text-text-muted ms-1.5">
                            {t("thinking")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Error State ── */}
                  {error && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                      <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <p className="text-[11px] text-destructive font-medium">
                          {error}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={handleRetry}
                        >
                          <RefreshCw className="size-3 me-1" />
                          {t("retry")}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ── Input Area ── */}
        <div className="shrink-0 border-t border-border/60 bg-card/50 p-3">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeProject
                    ? t("placeholder")
                    : t("noProjectPlaceholder")
                }
                disabled={!activeProject || isLoading}
                rows={1}
                className="w-full resize-none rounded-lg border border-border/60 bg-background px-3 py-2.5 text-[12.5px] text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed max-h-[120px] min-h-[40px]"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || !activeProject || isLoading}
              className="size-[40px] shrink-0 rounded-lg"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
          <p className="text-[9px] text-text-muted/50 text-center mt-1.5">
            {t("disclaimer")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
