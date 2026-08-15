// zero-glitch-theme-switcher pattern: data-theme on <html> is the single
// source of truth (set pre-paint by the inline script in app.html).
export function setTheme(theme: "light" | "dark"): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

export function getTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export function toggleTheme(): void {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}
