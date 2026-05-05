// Supabase type definitions - extracted from Supabase dashboard
// Run `supabase gen types typescript --project-ref <project-ref>` to regenerate

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: "active" | "inactive" | "suspended";
          settings: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: "active" | "inactive" | "suspended";
          settings?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          status?: "active" | "inactive" | "suspended";
          settings?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          role: "owner" | "admin" | "member" | "guest";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          role?: "owner" | "admin" | "member" | "guest";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          role?: "owner" | "admin" | "member" | "guest";
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string;
          role: "owner" | "admin" | "member" | "guest";
          granted_by: string;
          granted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id: string;
          role: "owner" | "admin" | "member" | "guest";
          granted_by: string;
          granted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tenant_id?: string;
          role?: "owner" | "admin" | "member" | "guest";
          granted_by?: string;
          granted_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          action: "create" | "read" | "update" | "delete" | "login" | "logout" | "custom";
          resource: string;
          resource_id: string | null;
          metadata: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          action: "create" | "read" | "update" | "delete" | "login" | "logout" | "custom";
          resource: string;
          resource_id?: string | null;
          metadata?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          action?: "create" | "read" | "update" | "delete" | "login" | "logout" | "custom";
          resource?: string;
          resource_id?: string | null;
          metadata?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tenant_status: "active" | "inactive" | "suspended";
      user_role: "owner" | "admin" | "member" | "guest";
      audit_action: "create" | "read" | "update" | "delete" | "login" | "logout" | "custom";
    };
  };
}

/** Convenience type for tables */
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T];

/** Convenience type for inserts */
export type Insert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

/** Convenience type for updates */
export type Update<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
