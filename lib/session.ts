// Lightweight in-memory session storage for IDs across screens
// Uses globalThis to survive Fast Refresh during development

declare global {
  // eslint-disable-next-line no-var
  var __ADMIN_ID__: string | null | undefined;
}

export function setAdminId(id: string | null | undefined) {
  globalThis.__ADMIN_ID__ = id ?? null;
}

export function getAdminId(): string | null {
  return (globalThis.__ADMIN_ID__ ?? null) as string | null;
}
