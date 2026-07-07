/**
 * grades.ts — single source of truth for grade → colour / label mapping in the
 * management portal. Mirrors the backend's Utils/grading.ts boundaries so a
 * grade shown here always matches what the API computed. Keep the boundaries in
 * sync with the backend; the palette is the portal's own badge styling.
 */

export type Grade = "A+" | "A" | "B+" | "B" | "C" | "D" | "F";

export const GRADE_ORDER: Grade[] = ["A+", "A", "B+", "B", "C", "D", "F"];

/** Percentage → letter grade. Same boundaries as backend Utils/grading.ts. */
export const gradeFromPercent = (p: number): Grade =>
    p >= 90 ? "A+" : p >= 80 ? "A" : p >= 70 ? "B+" : p >= 60 ? "B" : p >= 50 ? "C" : p >= 40 ? "D" : "F";

export const PASS_THRESHOLD = 40;
export const isPass = (p: number): boolean => p >= PASS_THRESHOLD;

export interface GradeStyle { bg: string; text: string; bar: string; border: string; ring: string; label: string }

export const GRADE_COLORS: Record<string, GradeStyle> = {
    "A+": { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", border: "border-emerald-200", ring: "ring-emerald-200", label: "Outstanding" },
    "A":  { bg: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-400", border: "border-emerald-200", ring: "ring-emerald-100", label: "Excellent" },
    "B+": { bg: "bg-blue-50",    text: "text-blue-700",    bar: "bg-blue-500",    border: "border-blue-200",    ring: "ring-blue-200",    label: "Very Good" },
    "B":  { bg: "bg-blue-50",    text: "text-blue-600",    bar: "bg-blue-400",    border: "border-blue-200",    ring: "ring-blue-100",    label: "Good" },
    "C":  { bg: "bg-amber-50",   text: "text-amber-700",   bar: "bg-amber-500",   border: "border-amber-200",   ring: "ring-amber-200",   label: "Satisfactory" },
    "D":  { bg: "bg-orange-50",  text: "text-orange-700",  bar: "bg-orange-500",  border: "border-orange-200",  ring: "ring-orange-200",  label: "Pass" },
    "F":  { bg: "bg-red-50",     text: "text-red-700",     bar: "bg-red-500",     border: "border-red-200",     ring: "ring-red-200",     label: "Needs Improvement" },
};

export const FALLBACK_GRADE: GradeStyle = {
    bg: "bg-slate-50", text: "text-slate-500", bar: "bg-slate-300", border: "border-slate-200", ring: "ring-slate-100", label: "—",
};

/** Safe lookup — returns a neutral style for null/unknown grades. */
export const gradeStyle = (g?: string | null): GradeStyle =>
    (g && GRADE_COLORS[g as Grade]) ? GRADE_COLORS[g as Grade] : FALLBACK_GRADE;
