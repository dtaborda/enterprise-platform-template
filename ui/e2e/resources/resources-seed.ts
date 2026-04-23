import { deleteRows, seedRows, supabaseRequest } from "../helpers/supabase-rest";

const SEED_PREFIX = "e2e-resource";

interface AdminProfileSeedContext {
  id: string;
  tenantId: string;
}

export interface SeededResource {
  id: string;
  title: string;
  type: string;
  status: string;
}

export async function getAdminTenantId(): Promise<string> {
  const profiles = await supabaseRequest<Array<{ tenant_id: string }>>("profiles", {
    params: { email: "eq.admin@enterprise.dev", select: "tenant_id" },
  });

  const [adminProfile] = profiles;

  if (!adminProfile?.tenant_id) {
    throw new Error("Unable to resolve tenant_id for admin@enterprise.dev from profiles table");
  }

  return adminProfile.tenant_id;
}

async function getAdminProfileContext(): Promise<AdminProfileSeedContext> {
  const profiles = await supabaseRequest<Array<{ id: string; tenant_id: string }>>("profiles", {
    params: {
      email: "eq.admin@enterprise.dev",
      select: "id,tenant_id",
      limit: "1",
    },
  });

  const [adminProfile] = profiles;

  if (!adminProfile?.id || !adminProfile?.tenant_id) {
    throw new Error("Unable to resolve admin profile context from profiles table");
  }

  return {
    id: adminProfile.id,
    tenantId: adminProfile.tenant_id,
  };
}

/**
 * Seeds test resources into the database.
 * Call in beforeAll() hook.
 * Returns the created records for use in test assertions.
 */
export async function seedResources(tenantId: string): Promise<SeededResource[]> {
  const adminProfile = await getAdminProfileContext();
  const safeTenantId = tenantId || adminProfile.tenantId;
  const suffix = Date.now();

  const seededRows = await seedRows("resources", [
    {
      tenant_id: safeTenantId,
      created_by: adminProfile.id,
      title: `${SEED_PREFIX}-${suffix}-document-active`,
      type: "document",
      status: "active",
      description: "E2E seeded resource for filter and detail tests",
    },
    {
      tenant_id: safeTenantId,
      created_by: adminProfile.id,
      title: `${SEED_PREFIX}-${suffix}-asset-draft`,
      type: "asset",
      status: "draft",
      description: "E2E seeded resource draft entry",
    },
    {
      tenant_id: safeTenantId,
      created_by: adminProfile.id,
      title: `${SEED_PREFIX}-${suffix}-service-suspended`,
      type: "service",
      status: "suspended",
      description: "E2E seeded resource suspended entry",
    },
    {
      tenant_id: safeTenantId,
      created_by: adminProfile.id,
      title: `${SEED_PREFIX}-${suffix}-other-archived`,
      type: "other",
      status: "archived",
      description: "E2E seeded resource archived entry",
    },
  ]);

  return seededRows.map((row) => {
    const id = row["id"];
    const title = row["title"];
    const type = row["type"];
    const status = row["status"];

    if (
      typeof id !== "string" ||
      typeof title !== "string" ||
      typeof type !== "string" ||
      typeof status !== "string"
    ) {
      throw new Error("Supabase REST seedResources returned an unexpected row shape");
    }

    return {
      id,
      title,
      type,
      status,
    };
  });
}

/**
 * Cleans up seeded resources.
 * Call in afterAll() hook.
 */
export async function teardownResources(): Promise<void> {
  await deleteRows("resources", { title: `like.${SEED_PREFIX}-%` });
}
