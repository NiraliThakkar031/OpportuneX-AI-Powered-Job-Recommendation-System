"use client";

import { useEffect, useState } from "react";
import DashboardNav from "../../components/dashboard/DashboardNav";

type ProfileFormState = {
  education: string;
  experienceLevel: string;
  preferredRoles: string;
  preferredLocation: string;
  skillsText: string;
  preferredMode: string;
  jobSector: "private" | "government" | "both";
  preferredDomain: string;
  certificationsText: string;
};

type UserProfileInput = {
  education: string;
  degree: string;
  specialization: string;
  experienceYears: number;
  preferredRoles: string[];
  preferredLocations: string[];
  skills: string[];
  employmentTypes: string[];
  workplacePreference: string;
  sectors: ("private" | "government" | "both")[];
  preferredDomains: string[];
  certifications: string[];
  country: string;
};

const defaultProfile: ProfileFormState = {
  education: "",
  experienceLevel: "",
  preferredRoles: "",
  preferredLocation: "",
  skillsText: "",
  preferredMode: "",
  jobSector: "both",
  preferredDomain: "",
  certificationsText: "",
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
        : mode.includes("on-site")
          ? "on-site"
          : "open";

  const experienceYears =
    profile.experienceLevel.includes("Mid")
      ? 3
      : profile.experienceLevel.includes("Senior")
        ? 5
        : profile.experienceLevel.includes("Entry")
          ? 1
          : 0;

  return {
    education: profile.education.trim(),
    degree: profile.education.trim(),
    specialization: profile.preferredDomain.trim(),
    experienceYears,
    preferredRoles: splitList(profile.preferredRoles),
    preferredLocations: [profile.preferredLocation.trim() || "India"],
    skills: splitList(profile.skillsText),
    employmentTypes: [employmentType],
    workplacePreference,
    sectors: [profile.jobSector || "both"],
    preferredDomains: profile.preferredDomain.trim()
      ? [profile.preferredDomain.trim()]
      : [],
    certifications: splitList(profile.certificationsText),
    country: "India",
  };
}

function apiProfileToForm(saved: any): ProfileFormState {
  const experience = Number(saved.experienceYears ?? 0);

  const experienceLevel =
    experience >= 5
      ? "Senior-level"
      : experience >= 3
        ? "Mid-level"
        : experience >= 1
          ? "Entry-level"
          : "Student / Intern";

  const workplace =
    saved.workplacePreference === "remote"
      ? "Remote first"
      : saved.workplacePreference === "hybrid"
        ? "Hybrid"
        : saved.workplacePreference === "on-site"
          ? "On-site"
          : "Open to all";

  return {
    education: saved.degree || saved.education || "",
    experienceLevel,
    preferredRoles: Array.isArray(saved.preferredRoles)
      ? saved.preferredRoles.join(", ")
      : "",
    preferredLocation: Array.isArray(saved.preferredLocations)
      ? saved.preferredLocations.join(", ")
      : "",
    skillsText: Array.isArray(saved.skills)
      ? saved.skills.join(", ")
      : "",
    preferredMode: workplace,
    jobSector: Array.isArray(saved.sectors) && saved.sectors[0]
      ? saved.sectors[0]
      : "both",
    preferredDomain: Array.isArray(saved.preferredDomains)
      ? saved.preferredDomains.join(", ")
      : saved.specialization || "",
    certificationsText: Array.isArray(saved.certifications)
      ? saved.certifications.join(", ")
      : "",
  };
}

export default function OpeningsPage() {
  const [form, setForm] = useState<ProfileFormState>(defaultProfile);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const data = await response.json();
        if (!active) return;
        if (response.status === 401) {
          try {
            const guest = sessionStorage.getItem("opx:guest-profile");
            if (guest) {
              const parsed = JSON.parse(guest);
              if (parsed) {
                setForm(apiProfileToForm(parsed));
                setHasSavedProfile(true);
                return;
              }
            }
          } catch { /* ignore invalid guest profile */ }
          return;
        }
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load your profile.");
        }
        if (data.data?.profile) {
          setForm(apiProfileToForm(data.data.profile));
          setHasSavedProfile(true);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load your profile.");
      } finally {
        if (active) setLoadingProfile(false);
      }
    }
    loadProfile();
    return () => { active = false; };
  }, []);

  function clearProfile() {
    setForm(defaultProfile);
    setError("");
    setSuccess("");
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();

    const payload = buildProfile(form);
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        sessionStorage.setItem("opx:guest-profile", JSON.stringify(payload));
        setHasSavedProfile(true);
        setSuccess("Profile saved on this device. Loading your matches...");
        window.location.href = "/openings";
        return;
      }
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Profile could not be saved.");
      }
      sessionStorage.removeItem("opx:guest-profile");
      setHasSavedProfile(true);
      setSuccess("Profile saved. Loading your personalized openings...");
      window.location.href = "/openings";
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="dashboard-shell route-dashboard-screen">
      <DashboardNav active="Jobs" />

      <section className="route-flow-shell dashboard-route-card">
        <div className="route-flow-header">
          <span className="route-eyebrow">Openings setup</span>

          <h1>Set your job preferences</h1>

          <p>
            OpportuneX uses this to rank jobs using skills, roles, education,
            and experience.
          </p>
          {loadingProfile && <p className="route-helper-text">Loading your saved profile...</p>}
          {error && <p className="route-error-text">{error}</p>}
          {success && <p className="route-helper-text">{success}</p>}
        </div>

        <form
          className="route-form-card route-section-gap"
          onSubmit={submit}
        >
          <div className="route-field-grid">
            <label className="route-field">
              <span>Education</span>

              <input
                value={form.education}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    education: e.target.value,
                  }))
                }
              />
            </label>

            <label className="route-field">
              <span>Experience</span>

              <select
                value={form.experienceLevel}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    experienceLevel: e.target.value,
                  }))
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
              <span>Preferred Domain (optional)</span>

              <input
                value={form.preferredDomain}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    preferredDomain: e.target.value,
                  }))
                }
                placeholder="e.g. IT, Finance, Healthcare"
              />
            </label>

            <label className="route-field">
              <span>Certifications (optional)</span>

              <input
                value={form.certificationsText}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    certificationsText: e.target.value,
                  }))
                }
                placeholder="e.g. AWS, CCNA, Tally"
              />
            </label>

            <label className="route-field">
              <span>Preferred Roles</span>

              <input
                value={form.preferredRoles}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    preferredRoles: e.target.value,
                  }))
                }
                placeholder="e.g. Software Developer, Data Analyst"
              />
            </label>

            <label className="route-field">
              <span>Preferred Location</span>

              <input
                value={form.preferredLocation}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    preferredLocation: e.target.value,
                  }))
                }
                placeholder="e.g. Bengaluru, Karnataka"
              />
            </label>

            <label className="route-field">
              <span>Skills</span>

              <textarea
                value={form.skillsText}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    skillsText: e.target.value,
                  }))
                }
                placeholder="e.g. Java, Python, SQL, React"
              />
            </label>

            <label className="route-field">
              <span>Work Preference</span>

              <select
                value={form.preferredMode}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    preferredMode: e.target.value,
                  }))
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
                  setForm((p) => ({
                    ...p,
                    jobSector: e.target.value as
                      | "private"
                      | "government"
                      | "both",
                  }))
                }
              >
                <option value="both">
                  Both (Private & Government)
                </option>

                <option value="government">
                  Government Sector Only
                </option>

                <option value="private">
                  Private Sector Only
                </option>
              </select>
            </label>
          </div>

          <div className="route-actions">
            <button
              className="route-primary-button"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : hasSavedProfile
                ? "Update Recommendations"
                : "See matches"}
            </button>

            {hasSavedProfile && (
              <button
                className="route-secondary-button"
                type="button"
                onClick={clearProfile}
              >
                Reset Form
              </button>
            )}
          </div>

          {hasSavedProfile && (
            <p
              className="route-helper-text"
              style={{ marginTop: 12 }}
            >
              
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
