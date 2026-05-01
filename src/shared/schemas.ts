import { z } from "zod";

const urlSchema = z.string().url();

export const appSettingsSchema = z.object({
  restoreTabsOnLaunch: z.boolean(),
  validationMode: z.enum(["on-register", "manual"]),
  validationConcurrency: z.number().int().min(1).max(8),
  validationTimeoutMs: z.number().int().min(1000).max(20000),
});

export const tabStateSchema = z.object({
  openVideoIds: z.array(z.string().min(1)),
  activeVideoId: z.string().min(1).nullable(),
});

export const videoItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  sourceUrl: urlSchema,
  resumeSeconds: z.number().min(0).optional(),
  lastValidatedAt: z.string().datetime().optional(),
  addedByPluginId: z.string().min(1).optional(),
});

export const groupItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(10),
  videoIds: z.array(z.string().min(1)),
});

export const libraryStateSchema = z.object({
  videos: z.array(videoItemSchema),
  groups: z.array(groupItemSchema),
  tabs: tabStateSchema,
});

const pluginDescriptionSchema = z.object({
  summary: z.string().min(1),
  detailed: z.string().optional(),
});

const pluginManifestRawSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  apiVersion: z.literal("1.0.0"),
  entry: z.string().min(1),
  capabilities: z.array(z.union([z.literal("input-panel"), z.literal("playback")])).min(1),
  description: z.union([z.string().min(1), pluginDescriptionSchema]).optional(),
  detailedDescription: z.string().optional(),
  author: z
    .object({
      name: z.string().min(1),
      url: z.string().url().optional(),
    })
    .optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().min(1).optional(),
});

export const pluginManifestSchema = pluginManifestRawSchema.transform((value) => {
  const { detailedDescription, ...rest } = value;
  const normalizedDescription =
    typeof value.description === "string"
      ? {
          summary: value.description,
          detailed: detailedDescription,
        }
      : value.description
        ? {
            summary: value.description.summary,
            detailed: value.description.detailed ?? detailedDescription,
          }
        : detailedDescription
          ? {
              summary: detailedDescription,
              detailed: detailedDescription,
            }
          : undefined;

  return {
    ...rest,
    description: normalizedDescription,
  };
});

export const pluginPanelSpecSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  inputLabel: z.string().min(1),
  inputPlaceholder: z.string().optional(),
  submitLabel: z.string().min(1),
});

export const pluginListItemSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  sourceType: z.enum(["builtin", "zip", "folder", "git"]),
  sourceRef: z.string().optional(),
  localPath: z.string().optional(),
  lastUpdatedAt: z.string().datetime().optional(),
  manifest: pluginManifestSchema,
  panel: pluginPanelSpecSchema.optional(),
});

export const pluginStateSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(pluginListItemSchema),
});

export const registerVideoSourceSchema = z.object({
  url: z.string().url(),
  label: z.string().optional(),
  timeoutMs: z.number().int().min(1000).max(20000),
  pluginId: z.string().optional(),
});

export const validateVideoSourceSchema = z.object({
  url: z.string().url(),
  timeoutMs: z.number().int().min(1000).max(20000),
});

export const resumePayloadSchema = z.object({
  videoId: z.string().min(1),
  seconds: z.number().min(0),
});

export const gitInstallPayloadSchema = z.object({
  url: z.string().url(),
  branch: z.string().min(1).optional(),
  token: z.string().min(1).optional(),
});

export const pluginEnableSchema = z.object({
  pluginId: z.string().min(1),
  enabled: z.boolean(),
});

export const pluginRemoveSchema = z.object({
  pluginId: z.string().min(1),
});

export const pluginReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)),
});
