export const tokens = {
  typography: {
    fontFamily: {
      primary: "'IBM Plex Serif', 'Times New Roman', serif",
      mono: "source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace"
    },
    fontSize: {
      xs: "12px",
      sm: "14px",
      base: "15px",
      md: "16px",
      lg: "18px",
      xl: "20px",
      "2xl": "24px",
      "3xl": "30px"
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    base: "16px",
    lg: "20px",
    xl: "24px",
    "2xl": "32px",
    "3xl": "48px"
  },
  borderRadius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    card: "18px",
    full: "9999px"
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    surface: "0 4px 20px -2px rgba(0, 0, 0, 0.05)"
  },
  transitions: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    normal: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "350ms cubic-bezier(0.4, 0, 0.2, 1)"
  },
  animations: {
    duration: {
      page: 0.3,
      card: 0.25,
      drawer: 0.3,
      modal: 0.3,
      sidebar: 0.25,
      theme: 0.2
    }
  }
};
