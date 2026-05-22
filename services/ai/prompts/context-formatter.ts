/**
 * Prompt Context Formatter Utility.
 *
 * Formats raw database strings or lists into structured, clearly bounded
 * markdown tags to help the AI accurately read and target telemetry fields.
 */

/**
 * Enclose a context segment with explicit, readable XML/Markdown boundary tags.
 */
export function formatContextBlock(title: string, content: string): string {
  if (!content || content.trim() === "") {
    return `### ${title}\nNo telemetry data available for this segment.`;
  }
  
  const upperTitle = title.replace(/\s+/g, "_").toUpperCase();
  
  return `--- BEGIN ${upperTitle} CONTEXT ---
${content.trim()}
--- END ${upperTitle} CONTEXT ---`;
}

/**
 * Format a list of items for prompt contexts.
 */
export function formatContextList(items: string[]): string {
  if (items.length === 0) return "- None";
  return items.map((item) => `- ${item}`).join("\n");
}
