import { z } from "zod";
import { EmploymentType, UserProfile, WorkplaceType } from "@/lib/types";

const listSchema = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((value) => {
    if (!value) return [];
    const items = Array.isArray(value) ? value : value.split(/[\n,;|]/);
    return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  });

export const profilePayloadSchema = z.object({
  education: z.string().trim().min(1, "Highest education is required"),
  degree: z.string().trim().optional().default(""),
  specialization: z.string().trim().optional().default(""),
  experienceYears: z.coerce.number().min(0).max(60).default(0),
  skills: listSchema.refine((items) => items.length > 0, "At least one skill is required"),
  certifications: listSchema,
  preferredRoles: listSchema.refine((items) => items.length > 0, "At least one preferred role is required"),
  preferredDomains: listSchema,
  preferredLocations: listSchema.refine((items) => items.length > 0, "At least one preferred location is required"),
  employmentTypes: listSchema,
  workplacePreference: z.enum(["open", "remote", "hybrid", "on-site"]).default("open"),
  sectors: listSchema,
  country: z.string().trim().optional().default("India"),
  willingToRelocate: z.coerce.boolean().optional().default(false),
  resumeText: z.string().optional().nullable(),
});

export type ProfilePayload = z.infer<typeof profilePayloadSchema>;

function firstOrDefault(values: string[] | undefined, fallback: string): string {
  return values?.find(Boolean) ?? fallback;
}

export function profilePayloadToRecommendationInput(profile: ProfilePayload): UserProfile {
  const employmentType = firstOrDefault(profile.employmentTypes, "full-time") as EmploymentType;
  const workplacePreference = profile.workplacePreference as WorkplaceType;
  const sector = firstOrDefault(profile.sectors, "both").toLowerCase();

  return {
    education: profile.degree || profile.education,
    experience: profile.experienceYears,
    preferredRoles: profile.preferredRoles,
    preferredDomain: firstOrDefault(profile.preferredDomains, profile.specialization),
    preferredLocation: firstOrDefault(profile.preferredLocations, "India"),
    skills: profile.skills,
    certifications: profile.certifications,
    employmentType,
    workplacePreference,
    jobSector: sector === "private" || sector === "government" ? sector : "both",
  };
}

export function prismaProfileToRecommendationInput(profile: {
  education: string | null;
  degree: string | null;
  specialization: string | null;
  experienceYears: number;
  skills: unknown;
  certifications: unknown;
  preferredRoles: unknown;
  preferredDomains: unknown;
  preferredLocations: unknown;
  employmentTypes: unknown;
  workplacePreference: string | null;
  sectors: unknown;
}): UserProfile {
  const payload: ProfilePayload = {
    education: profile.education ?? "",
    degree: profile.degree ?? "",
    specialization: profile.specialization ?? "",
    experienceYears: profile.experienceYears,
    skills: Array.isArray(profile.skills) ? profile.skills.filter((item): item is string => typeof item === "string") : [],
    certifications: Array.isArray(profile.certifications) ? profile.certifications.filter((item): item is string => typeof item === "string") : [],
    preferredRoles: Array.isArray(profile.preferredRoles) ? profile.preferredRoles.filter((item): item is string => typeof item === "string") : [],
    preferredDomains: Array.isArray(profile.preferredDomains) ? profile.preferredDomains.filter((item): item is string => typeof item === "string") : [],
    preferredLocations: Array.isArray(profile.preferredLocations) ? profile.preferredLocations.filter((item): item is string => typeof item === "string") : [],
    employmentTypes: Array.isArray(profile.employmentTypes) ? profile.employmentTypes.filter((item): item is string => typeof item === "string") : [],
    workplacePreference: profile.workplacePreference === "remote" || profile.workplacePreference === "hybrid" || profile.workplacePreference === "on-site" ? profile.workplacePreference : "open",
    sectors: Array.isArray(profile.sectors) ? profile.sectors.filter((item): item is string => typeof item === "string") : [],
    country: "India",
    willingToRelocate: false,
    resumeText: null,
  };

  return profilePayloadToRecommendationInput(payload);
}
