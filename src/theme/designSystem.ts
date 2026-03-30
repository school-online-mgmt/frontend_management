// Design System & Tailwind Theme Configuration
// This file contains reusable design tokens and component patterns

export const designSystem = {
  // Color Palette
  colors: {
    primary: {
      50: "#f0fdf4",
      100: "#dcfce7",
      200: "#bbf7d0",
      300: "#86efac",
      400: "#4ade80",
      500: "#22c55e",
      600: "#16a34a",
      700: "#15803d",
      800: "#166534",
      900: "#145231",
    },
    slate: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
  },

  // Typography
  typography: {
    h1: "text-4xl md:text-5xl font-bold tracking-tight",
    h2: "text-3xl md:text-4xl font-bold tracking-tight",
    h3: "text-2xl md:text-3xl font-semibold",
    h4: "text-xl md:text-2xl font-semibold",
    h5: "text-lg font-semibold",
    h6: "text-base font-semibold",
    body: "text-base leading-relaxed",
    small: "text-sm text-slate-500",
    label: "text-sm font-medium text-slate-700",
  },

  // Spacing
  spacing: {
    xs: "0.5rem",
    sm: "1rem",
    md: "1.5rem",
    lg: "2rem",
    xl: "2.5rem",
    xxl: "3rem",
  },

  // Shadows
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },

  // Border Radius
  radius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    "2xl": "1.5rem",
    full: "9999px",
  },

  // Animations
  transitions: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    base: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
};

// Common Component Classes
export const componentClasses = {
  // Page Layout
  pageContainer: "min-h-full",
  pageContent: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",

  // Header/Title
  pageHeader: "mb-8",
  pageTitle: "text-3xl md:text-4xl font-bold text-slate-900 mb-2",
  pageSubtitle: "text-slate-600",

  // Cards
  card: "bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200",
  cardHeader: "border-b border-slate-100 px-6 py-4",
  cardTitle: "text-lg font-semibold text-slate-900",
  cardDescription: "text-sm text-slate-500 mt-1",
  cardContent: "p-6",
  cardFooter: "border-t border-slate-100 px-6 py-4 flex items-center justify-between",

  // Button
  buttonBase: "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
  buttonPrimary: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
  buttonSecondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-400",
  buttonDanger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  buttonSuccess: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
  buttonSmall: "px-3 py-1.5 text-sm",
  buttonLarge: "px-6 py-3 text-lg",

  // Input
  inputBase: "w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
  inputError: "border-red-500 focus:ring-red-500",
  inputSuccess: "border-emerald-500 focus:ring-emerald-500",

  // Form
  formGroup: "mb-6",
  formLabel: "block text-sm font-medium text-slate-700 mb-2",
  formError: "mt-2 text-sm text-red-600",
  formHelp: "mt-1 text-sm text-slate-500",

  // Table
  tableContainer: "overflow-x-auto rounded-lg border border-slate-100",
  tableHeader: "bg-slate-50 border-b border-slate-100",
  tableHeaderCell: "px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider",
  tableRow: "border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150",
  tableCell: "px-6 py-4 text-sm text-slate-900",

  // Badge
  badge: "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium",
  badgeSuccess: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  badgeWarning: "bg-amber-100 text-amber-700 border border-amber-200",
  badgeDanger: "bg-red-100 text-red-700 border border-red-200",
  badgeInfo: "bg-blue-100 text-blue-700 border border-blue-200",

  // Alert
  alert: "rounded-lg border p-4 flex items-start gap-3",
  alertSuccess: "bg-emerald-50 border-emerald-200 text-emerald-800",
  alertWarning: "bg-amber-50 border-amber-200 text-amber-800",
  alertError: "bg-red-50 border-red-200 text-red-800",
  alertInfo: "bg-blue-50 border-blue-200 text-blue-800",

  // Empty State
  emptyState: "text-center py-12 px-6",
  emptyStateIcon: "w-16 h-16 mx-auto mb-4 text-slate-300",
  emptyStateTitle: "text-lg font-semibold text-slate-900 mb-2",
  emptyStateText: "text-slate-500",

  // Loading State
  loadingSpinner: "inline-flex animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-emerald-600",

  // Divider
  divider: "border-t border-slate-200",

  // Grid
  gridTwoCol: "grid grid-cols-1 md:grid-cols-2 gap-6",
  gridThreeCol: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
  gridFourCol: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",

  // Flex Utilities
  flexBetween: "flex items-center justify-between",
  flexCenter: "flex items-center justify-center",
  flexCol: "flex flex-col",
  flexGap: "flex gap-4",

  // Text Utilities
  textTruncate: "truncate",
  textEllipsis: "line-clamp-2",
};

// Status Colors
export const statusColors = {
  success: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    icon: "text-emerald-600",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    icon: "text-amber-600",
  },
  danger: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
    icon: "text-red-600",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    icon: "text-blue-600",
  },
  neutral: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    badge: "bg-slate-100 text-slate-700",
    icon: "text-slate-600",
  },
};

