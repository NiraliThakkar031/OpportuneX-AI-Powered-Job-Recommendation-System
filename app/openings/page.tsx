"use client";

import Link from "next/link";
import { useState } from "react";

type ProfileFormState = {
  education: string;
  experienceLevel: string;
  preferredRoles: string;
  preferredLocation: string;
  skillsText: string;
  preferredMode: string;
  jobSector: "private" | "government" | "both";
};

type UserProfileInput = {
  education: string;
  experience: number;
  preferredRoles: string[];
  preferredLocation: string;
  skills: string[];
  employmentType: string;
  workplacePreference: string;
  jobSector: "private" | "government" | "both";
};

const PROFILE_STORAGE_KEY = "opportunex:profile";
const RESULTS_STORAGE_KEY = "opportunex:results";

const defaultProfile: ProfileFormState = {
  education: "",
  experienceLevel: "",
  preferredRoles: "",
  preferredLocation: "",
  skillsText: "",
  preferredMode: "",
  jobSector: "both",
};

function splitList(input: string): string[] {
  return input
    .split(/[\n,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildProfile(profile: ProfileFormState): UserProfileInput {
  const mode = profile.preferredMode.toLowerCase();

  const employmentType =
    mode.includes("intern") || mode.includes("student")
      ? "internship"
      : "full-time";

  const workplacePreference =
    mode.includes("remote")
      ? "remote"
      : mode.includes("hybrid")
      ? "hybrid"
      : "on-site";

  const experience =
    profile.experienceLevel.includes("Mid")
      ? 3
      : profile.experienceLevel.includes("Senior")
      ? 5
      : profile.experienceLevel.includes("Entry")
      ? 1
      : 0;

  return {
    education: profile.education.trim(),
    experience,
    preferredRoles: splitList(profile.preferredRoles),
    preferredLocation: profile.preferredLocation.trim() || "India",
    skills: splitList(profile.skillsText),
    employmentType,
    workplacePreference,
    jobSector: profile.jobSector || "both",
  };
}

function save(profile: UserProfileInput) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export default function OpeningsPage() {
  const [form, setForm] = useState<ProfileFormState>(defaultProfile);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();

    const payload = buildProfile(form);

    save(payload);
    localStorage.removeItem(RESULTS_STORAGE_KEY);

    window.location.href = "/openings/results";
  }

  return (
    <main className="route-screen route-screen-light">
      <section className="route-flow-shell">
        <div className="route-flow-header">
          <span className="route-eyebrow">Openings setup</span>
          <h1>Set your job preferences</h1>
          <p>
            OpportuneX uses this to rank jobs using skills, roles, education, and experience.
          </p>
        </div>

        <form className="route-form-card route-section-gap" onSubmit={submit}>
          <div className="route-field-grid">

            <label className="route-field">
              <span>Education</span>
              <input
                value={form.education}
                onChange={(e) =>
                  setForm((p) => ({ ...p, education: e.target.value }))
                }
              />
            </label>

            <label className="route-field">
              <span>Experience</span>
              <select
                value={form.experienceLevel}
                onChange={(e) =>
                  setForm((p) => ({ ...p, experienceLevel: e.target.value }))
                }
              >
                <option value="">Select</option>
                <option>Student / Intern</option>
                <option>Entry-level</option>
                <option>Mid-level</option>
                <option>Senior-level</option>
              </select>
            </label>

            <label className="route-field">
              <span>Preferred Roles</span>
              <input
                value={form.preferredRoles}
                onChange={(e) =>
                  setForm((p) => ({ ...p, preferredRoles: e.target.value }))
                }
              />
            </label>

            <label className="route-field">
              <span>Preferred Location</span>
              <input
                value={form.preferredLocation}
                onChange={(e) =>
                  setForm((p) => ({ ...p, preferredLocation: e.target.value }))
                }
              />
            </label>

            <label className="route-field">
              <span>Skills</span>
              <textarea
                value={form.skillsText}
                onChange={(e) =>
                  setForm((p) => ({ ...p, skillsText: e.target.value }))
                }
              />
            </label>

            <label className="route-field">
              <span>Work Preference</span>
              <select
                value={form.preferredMode}
                onChange={(e) =>
                  setForm((p) => ({ ...p, preferredMode: e.target.value }))
                }
              >
                <option value="">Select</option>
                <option>Open to all</option>
                <option>Remote first</option>
                <option>Hybrid</option>
                <option>On-site</option>
              </select>
            </label>

            <label className="route-field">
              <span>Job Sector</span>
              <select
                value={form.jobSector}
                onChange={(e) =>
                  setForm((p) => ({ ...p, jobSector: e.target.value as any }))
                }
              >
                <option value="both">Both (Private & Government)</option>
                <option value="government">Government Sector Only</option>
                <option value="private">Private Sector Only</option>
              </select>
            </label>

          </div>

          <div className="route-actions">
            <button className="route-primary-button" type="submit">
              See matches
            </button>
            <Link className="route-secondary-button" href="/assistant">
              AI Assistant
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}