export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  billing: "/billing",
  notifications: "/notifications",
  notificationPreferences: "/settings/notifications",
  onboarding: "/onboarding",
  settings: "/settings",
  team: "/team",
  resources: {
    root: "/resources",
    new: "/resources/new",
    detail: (id: string) => `/resources/${id}` as const,
    edit: (id: string) => `/resources/${id}/edit` as const,
  },
} as const;
