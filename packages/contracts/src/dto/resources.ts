import type { z } from "zod";
import type {
  createResourceSchema,
  resourceQuerySchema,
  updateResourceSchema,
} from "../schemas/resources";

export type CreateResourceDto = z.infer<typeof createResourceSchema>;
export type UpdateResourceDto = z.infer<typeof updateResourceSchema>;
export type ResourceQueryDto = z.infer<typeof resourceQuerySchema>;
