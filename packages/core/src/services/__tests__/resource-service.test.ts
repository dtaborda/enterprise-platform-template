import type { CreateResourceDto, ResourceQueryDto, UpdateResourceDto } from "@enterprise/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createResource,
  deleteResource,
  getResourceById,
  listResources,
  updateResource,
} from "../resource-service";

function makeQueryChain(result: { data: unknown; error: unknown; count?: number | null }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  };

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.neq.mockReturnValue(chain);
  chain.range.mockResolvedValue(result);
  chain.single.mockResolvedValue(result);
  chain.update.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);

  return chain;
}

function createMockClient(queryResult: { data: unknown; error: unknown; count?: number | null }) {
  const chain = makeQueryChain(queryResult);

  const client = {
    from: vi.fn(() => chain),
    __chain: chain,
  } as unknown as SupabaseClient & { __chain: ReturnType<typeof makeQueryChain> };

  return client;
}

const TENANT_ID = "tenant-uuid-1234";
const USER_ID = "user-uuid-5678";
const RESOURCE_ID = "resource-uuid-9012";

const mockResource = {
  id: RESOURCE_ID,
  tenant_id: TENANT_ID,
  title: "Corporate Handbook",
  type: "document",
  status: "active",
  description: "Company policy handbook",
  metadata: '{"department":"operations"}',
  image_urls: '["https://example.com/cover.jpg"]',
  created_by: USER_ID,
  created_at: new Date("2026-01-01"),
  updated_at: new Date("2026-01-02"),
};

describe("listResources", () => {
  it("no filters: returns items + total and excludes archived by default", async () => {
    const client = createMockClient({ data: [mockResource], error: null, count: 1 });

    const result = await listResources(client);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.total).toBe(1);
    }

    expect(client.__chain.neq).toHaveBeenCalledWith("status", "archived");
  });

  it("filters: applies eq for type and status when provided", async () => {
    const client = createMockClient({ data: [mockResource], error: null, count: 1 });
    const filters: ResourceQueryDto = {
      type: "document",
      status: "active",
      limit: 20,
      offset: 0,
    };

    await listResources(client, filters);

    expect(client.__chain.eq).toHaveBeenCalledWith("type", "document");
    expect(client.__chain.eq).toHaveBeenCalledWith("status", "active");
    expect(client.__chain.neq).not.toHaveBeenCalledWith("status", "archived");
  });

  it("pagination: calls range with correct offset + limit - 1", async () => {
    const client = createMockClient({ data: [], error: null, count: 0 });
    const filters: ResourceQueryDto = { limit: 10, offset: 20 };

    await listResources(client, filters);

    expect(client.__chain.range).toHaveBeenCalledWith(20, 29);
  });

  it("DB error: returns failure ServiceResult", async () => {
    const client = createMockClient({ data: null, error: { message: "DB error" }, count: null });

    const result = await listResources(client);

    expect(result.success).toBe(false);
  });
});

describe("getResourceById", () => {
  it("found: returns resource data", async () => {
    const client = createMockClient({ data: mockResource, error: null });

    const result = await getResourceById(client, RESOURCE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(RESOURCE_ID);
    }
    expect(client.__chain.eq).toHaveBeenCalledWith("id", RESOURCE_ID);
  });

  it("not found (null data): returns not_found error", async () => {
    const client = createMockClient({ data: null, error: null });

    const result = await getResourceById(client, RESOURCE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("not_found");
    }
  });
});

describe("createResource", () => {
  const createInput: CreateResourceDto = {
    title: "Corporate Handbook",
    type: "document",
    status: "active",
    description: "Company policy handbook",
    metadata: { department: "operations" },
    imageUrls: ["https://example.com/cover.jpg"],
  };

  it("success: inserts record and returns it", async () => {
    const client = createMockClient({ data: mockResource, error: null });

    const result = await createResource(client, TENANT_ID, USER_ID, createInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(RESOURCE_ID);
    }
    expect(client.from).toHaveBeenCalledWith("resources");
    expect(client.__chain.insert).toHaveBeenCalled();
  });
});

describe("updateResource", () => {
  const updateInput: UpdateResourceDto = {
    title: "Updated Handbook",
  };

  it("success: updates record and returns it", async () => {
    const updatedResource = { ...mockResource, title: "Updated Handbook" };
    const client = createMockClient({ data: updatedResource, error: null });

    const result = await updateResource(client, RESOURCE_ID, updateInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Updated Handbook");
    }
    expect(client.__chain.update).toHaveBeenCalled();
    expect(client.__chain.eq).toHaveBeenCalledWith("id", RESOURCE_ID);
  });
});

describe("deleteResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls .update({ status: 'archived' }) — NOT .delete()", async () => {
    const client = createMockClient({ data: { id: RESOURCE_ID }, error: null });

    const result = await deleteResource(client, RESOURCE_ID);

    expect(client.__chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "archived" }),
    );
    expect(result.success).toBe(true);
  });
});
