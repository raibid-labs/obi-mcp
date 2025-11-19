/**
 * OBI Configuration Schema
 * Shared configuration validation for OBI deployments
 */

import { z } from 'zod';

/**
 * OBI configuration schema (simplified for MVP)
 */
export const ObiConfigSchema = z.object({
  network: z
    .object({
      enable: z.boolean().default(true),
      allowed_attributes: z.array(z.string()).optional(),
      cidrs: z
        .array(
          z.object({
            cidr: z.string(),
            name: z.string(),
          })
        )
        .optional(),
    })
    .optional(),
  attributes: z
    .object({
      kubernetes: z
        .object({
          enable: z.boolean().default(false),
        })
        .optional(),
    })
    .optional(),
  export: z
    .object({
      otlp: z
        .object({
          endpoint: z.string(),
          protocol: z.enum(['grpc', 'http/protobuf']).default('grpc'),
        })
        .optional(),
    })
    .optional(),
});

export type ObiConfig = z.infer<typeof ObiConfigSchema>;
