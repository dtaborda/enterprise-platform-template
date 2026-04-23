import { z } from "zod";

export const resourceTypeSchema = z.enum(["product", "service", "asset", "document", "other"]);

export const resourceStatusSchema = z.enum(["active", "draft", "archived", "suspended"]);

export const createResourceSchema = z.object({
  title: z.string().min(1).max(500),
  type: resourceTypeSchema,
  status: resourceStatusSchema.default("active"),
  description: z.string().max(5000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  imageUrls: z.array(z.string().url()).optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

export const resourceQuerySchema = z.object({
  type: resourceTypeSchema.optional(),
  status: resourceStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});
