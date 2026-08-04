/**
 * The canonical grade list an Indian school picks its classes from.
 *
 * ONE definition, shared by the onboarding wizard (step 3) and Academic
 * Structure → Quick Setup. Both build the same thing — a year's classes and
 * their sections — and two copies of this list would drift the moment somebody
 * added a grade to one of them.
 *
 * Note the three pre-primary grades. A plain numeric range ("classes 1 to 12")
 * cannot express Nursery / LKG / UKG, which is exactly why the picker is a
 * catalogue rather than a from/to pair.
 *
 * The backend has a richer version of this in `config/schoolClassDefaults.ts`
 * — same grade order, plus the default subjects and course streams per grade.
 * That one drives the wizard's subject seeding; this one is only about the
 * class list itself, which is why it stays a small standalone file rather than
 * being fetched.
 */

export interface CatalogueGrade {
    /** Display name, and the class name that gets created. */
    grade: string;
    /** Short code used to build section names: "1A", "Nursery-A". */
    code: string;
}

export const CLASS_CATALOGUE: CatalogueGrade[] = [
    { grade: "Nursery", code: "Nursery" },
    { grade: "LKG", code: "LKG" },
    { grade: "UKG", code: "UKG" },
    ...Array.from({ length: 12 }, (_, i) => ({ grade: `Class ${i + 1}`, code: String(i + 1) })),
];

/** Section labels, in the order they are handed out. */
export const SECTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;
export const MAX_SECTIONS = 10;

export const codeForGrade = (grade: string): string =>
    CLASS_CATALOGUE.find((c) => c.grade === grade)?.code
    ?? grade.replace(/^class\s*/i, "").trim()
    ?? grade;

/**
 * Section display name for a grade + letter.
 *
 * Numbered grades read "1A"; named grades need the hyphen to stay legible
 * ("NurseryA" is not a section name anybody would write down).
 */
export const sectionNameFor = (grade: string, letter: string): string => {
    const code = codeForGrade(grade);
    return /^\d+$/.test(code) ? `${code}${letter}` : `${code}-${letter}`;
};

/** URL-safe, and stable for a given grade + letter. */
export const slugify = (s: string): string =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Class slugs must be at least 4 characters (the backend's `classValidator`),
 * which "class-1" clears but a bare "1" would not — so the slug is built from
 * the full grade name, not the code.
 */
export const classSlugFor = (grade: string): string => slugify(grade);
