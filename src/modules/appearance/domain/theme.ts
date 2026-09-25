/** Paletas da aplicação interna. Não altera a landing pública nem a conta de outro usuário. */
export const APP_THEMES = [
  { id: "blue", name: "Branco com azul", swatch: "#1d4ed8", surface: "#ffffff" },
  { id: "navy", name: "Azul-marinho com branco", swatch: "#102a56", surface: "#ffffff" },
  { id: "graphite", name: "Cinza-grafite / chumbo", swatch: "#343b46", surface: "#f3f4f6" },
  { id: "marsala", name: "Bordô / marsala", swatch: "#712e48", surface: "#fff7fa" },
  { id: "black", name: "Preto", swatch: "#151515", surface: "#ffffff" },
  { id: "champagne", name: "Dourado / champanhe", swatch: "#806019", surface: "#fffaf0" },
  { id: "olive", name: "Oliva", swatch: "#475a32", surface: "#f9fbf6" },
  { id: "nude", name: "Nude", swatch: "#805a53", surface: "#fff8f4" },
  { id: "salmon", name: "Salmão", swatch: "#da849d", surface: "#fff4f7" },
  { id: "indigo", name: "Índigo", swatch: "#3730a3", surface: "#f6f5ff" },
] as const;
export type AppTheme = (typeof APP_THEMES)[number]["id"];
export const DEFAULT_APP_THEME: AppTheme = "blue";
export const THEME_EVENT = "jurisportal:theme-changed";
export function validAppTheme(value: unknown): AppTheme {
  return APP_THEMES.find((theme) => theme.id === value)?.id ?? DEFAULT_APP_THEME;
}
export function themeStorageKey(userId: string): string { return `jp:appearance:${userId}`; }
