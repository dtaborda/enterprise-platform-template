export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  billing: "/billing",
  settings: "/settings",
  team: "/team",
  resources: {
    root: "/resources",
    new: "/resources/new",
    detail: (id: string) => `/resources/${id}` as const,
    edit: (id: string) => `/resources/${id}/edit` as const,
  },
} as const;
