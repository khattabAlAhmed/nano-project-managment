/**
 * Standard User Prompt Templates for Quick Insight Actions.
 *
 * Provides a central registry of structured, professional operational questions
 * mapped to each category. Used by quick-action triggers.
 */

export const CATEGORY_USER_PROMPTS: Record<string, { en: string; ar: string }> = {
  progress: {
    en: "Analyze the current overall progress of the project, including completion rate, core vs volunteer achievements, execution pace, and remaining workload.",
    ar: "قم بتحليل التقدم العام الحالي للمشروع، بما في ذلك معدل الإكمال، والإنجازات الأساسية مقابل التطوعية، ووتيرة التنفيذ، وعبء العمل المتبقي.",
  },
  delay: {
    en: "Identify overdue sessions, delayed centers, and bottleneck activities, and recommend operational adjustments to get back on track.",
    ar: "حدد الجلسات المتأخرة، والمراكز المتأخرة، والأنشطة التي تشكل عقبة، واقترح تعديلات تشغيلية للعودة إلى المسار الصحيح.",
  },
  approvals: {
    en: "Provide a comprehensive audit of the pending approvals queue, analyze rejection/revision feedback trends, and evaluate turnaround performance.",
    ar: "قدم تدقيقاً شاملاً لطابور الموافقات المعلقة، وحلل اتجاهات ملاحظات الرفض والتعديل، وقيم أداء سرعة المراجعة.",
  },
  centers: {
    en: "Evaluate the performance of participating center branches, highlighting top performers, underperforming centers, and volunteer engagement.",
    ar: "قيم أداء فروع المراكز المشاركة، مع تسليط الضوء على الفروع الأعلى أداءً، والمراكز المتعثرة، ومشاركة المتطوعين.",
  },
  timeline: {
    en: "Assess the timeline health, scheduling density concentrations, future peak workload risks, and physical execution load imbalances.",
    ar: "قم بتقييم سلامة الجدول الزمني، وتراكمات كثافة الجدولة، ومخاطر عبء العمل الأقصى المستقبلي، وعدم توازن تحميل التنفيذ الفعلي.",
  },
};

/**
 * Get the standardized prompt for a specific category and locale.
 */
export function getCategoryUserPrompt(category: string, locale: "en" | "ar" = "en"): string {
  const templates = CATEGORY_USER_PROMPTS[category] || CATEGORY_USER_PROMPTS.progress;
  return locale === "ar" ? templates.ar : templates.en;
}
