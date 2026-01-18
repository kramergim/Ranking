/**
 * Swiss Taekwondo Design Tokens
 *
 * Design system inspired by taekwondo.ch
 * - Clean, professional Swiss sports federation feel
 * - Performance-first (system fonts, minimal animations)
 * - Mobile-first responsive design
 */

export const designTokens = {
  // Colors - Swiss Taekwondo palette
  colors: {
    // Primary - Swiss Blue
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',  // Main blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    // Neutrals
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
  },

  // Typography - System fonts for performance
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Spacing - Generous white space
  spacing: {
    section: {
      sm: '3rem',   // 48px
      md: '5rem',   // 80px
      lg: '7rem',   // 112px
    },
    container: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },

  // Shadows - Subtle depth
  shadows: {
    card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    cardHover: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Border Radius
  borderRadius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
  },

  // Transitions - Simple, performant
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Tailwind utility classes for common patterns
export const commonClasses = {
  // Containers
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  containerNarrow: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',

  // Cards
  card: 'bg-white rounded-lg shadow-sm border border-gray-100 transition-shadow duration-200',
  cardHover: 'hover:shadow-md',
  cardInteractive: 'bg-white rounded-lg shadow-sm border border-gray-100 transition-all duration-200 hover:shadow-md hover:border-gray-200',

  // Sections
  section: 'py-12 md:py-20',
  sectionTitle: 'text-3xl md:text-4xl font-bold text-gray-900 mb-4',
  sectionSubtitle: 'text-lg text-gray-600 max-w-3xl',

  // Buttons
  buttonPrimary: 'inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-sm',
  buttonSecondary: 'inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold border border-blue-200 hover:bg-blue-50 transition-colors duration-200',

  // Text
  heading1: 'text-4xl md:text-5xl font-bold text-gray-900',
  heading2: 'text-3xl md:text-4xl font-bold text-gray-900',
  heading3: 'text-2xl md:text-3xl font-bold text-gray-900',
  bodyLarge: 'text-lg text-gray-600',
  bodyBase: 'text-base text-gray-600',
};
