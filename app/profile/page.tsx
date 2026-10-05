"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardNav from "../components/dashboard/DashboardNav";

type Profile = {
  education?: string | null;
  degree?: string | null;
  experienceYears?: number | null;
  skills?: unknown;
  preferredRoles?: unknown;
  preferredLocations?: unknown;
  workplacePreference?: string | null;
  preferredDomains?: unknown;
};

type SavedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  applyUrl: string;
  source: string;
};

type Activity = {
  id: string;
  type: string;
  createdAt: string;
  job: SavedJob;
};

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<Activity[]>([]);
  const [name, setName] = useState("Google User");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingApplied, setMarkingApplied] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [sessionResponse, profileResponse, savedResponse, activityResponse] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/saved-jobs", { cache: "no-store" }),
          fetch("/api/activity", { cache: "no-store" }),
        ]);
        if (!active) return;
        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          setName(session?.user?.name || session?.user?.email?.split("@")[0] || "Google User");
          setEmail(session?.user?.email || "");
        }
        if (profileResponse.ok) {
          const data = await profileResponse.json();
          setProfile(data?.data?.profile ?? null);
        }
        if (savedResponse.ok) {
          const data = await savedResponse.json();
          setSavedJobs(Array.isArray(data?.jobs) ? data.jobs.map((item: any) => item.job).filter(Boolean) : []);
        }
        if (activityResponse.ok) {
          const data = await activityResponse.json();
          setAppliedJobs(Array.isArray(data?.applications) ? data.applications : (Array.isArray(data?.activities) ? data.activities.filter((item: Activity) => item.type === "applied") : []));
        }
      } catch {
        if (active) setError("Unable to load your profile right now.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  async function markApplied(job: SavedJob) {
    if (appliedJobs.some((activity) => activity.job?.id === job.id) || markingApplied === job.id) return;
    setMarkingApplied(job.id);
    try {
      const response = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, type: "applied" }),
      });
      const data = await response.json();
      if (!response.ok || !data?.activity) throw new Error(data?.message || "Unable to mark job as applied.");
      setAppliedJobs((current) => [data.activity, ...current.filter((activity) => activity.job?.id !== job.id)]);
      setNotice(`✓ ${job.title} marked as applied`);
      window.setTimeout(() => setNotice(""), 2600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to mark job as applied.");
    } finally {
      setMarkingApplied(null);
    }
  }



  return (
    <main className="dashboard-shell route-dashboard-screen">
      <DashboardNav active="Dashboard" />
      <section className="profile-page-shell">
        {notice && <div className="opx-toast" role="status">{notice}</div>}
        <div className="profile-page-header">
          <div className="profile-page-avatar">{name.slice(0, 1).toUpperCase()}</div>
          <div>
            <span className="route-eyebrow">Your profile</span>
            <h1>{name}</h1>
            <p>{email || "Your Google account"}</p>
          </div>
          <Link href="/openings/setup" className="route-primary-button">Edit job preferences</Link>
        </div>

        {error && <div className="route-status-card route-status-card-error"><p>{error}</p></div>}
        {loading && <div className="route-status-card"><p>Loading your profile and activity...</p></div>}

        {!loading && !error && (
          <>
            <section className="profile-summary-grid">
              <div className="panel-card">
                <span className="section-label">Profile details</span>
                <h2>Job preferences</h2>
                <div className="profile-detail-list">
                  <div><strong>Education</strong><span>{profile?.degree || profile?.education || "Not set"}</span></div>
                  <div><strong>Experience</strong><span>{profile?.experienceYears ?? 0} years</span></div>
                  <div><strong>Preferred roles</strong><span>{list(profile?.preferredRoles).join(", ") || "Not set"}</span></div>
                  <div><strong>Locations</strong><span>{list(profile?.preferredLocations).join(", ") || "Not set"}</span></div>
                  <div><strong>Skills</strong><span>{list(profile?.skills).join(", ") || "Not set"}</span></div>
                  <div><strong>Work preference</strong><span>{profile?.workplacePreference || "Open to all"}</span></div>
                </div>
              </div>

              <div className="panel-card">
                <span className="section-label">Activity</span>
                <h2>Your jobs</h2>
                <div className="profile-stat-pair">
                  <div><strong>{savedJobs.length}</strong><span>Saved jobs</span></div>
                  <div><strong>{appliedJobs.length}</strong><span>Applied jobs</span></div>
                </div>
                <p className="profile-helper">Your applied jobs stay here after you mark a saved job as applied.</p>
              </div>
            </section>

            <section className="profile-jobs-grid">
              <div className="panel-card">
                <div className="section-heading compact"><div><span className="section-label">Saved</span><h2>Saved jobs</h2></div></div>
                {savedJobs.length === 0 ? <p className="profile-empty">No saved jobs yet. <Link href="/openings">Browse recommendations</Link>.</p> : (
                  <div className="profile-job-list">
                    {savedJobs.map((job) => (
                      <article key={job.id} className="profile-job-row">
                        <div><strong>{job.title}</strong><span>{job.company} · {job.location}</span></div>
                        <div className="profile-job-actions">
                          <button
                            type="button"
                            className="route-secondary-button"
                            onClick={() => markApplied(job)}
                            disabled={appliedJobs.some((activity) => activity.job?.id === job.id) || markingApplied === job.id}
                          >
                            {appliedJobs.some((activity) => activity.job?.id === job.id)
                              ? "Applied"
                              : markingApplied === job.id
                                ? "Saving..."
                                : "Mark Applied"}
                          </button>
                          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="route-secondary-button">View</a>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel-card">
                <div className="section-heading compact"><div><span className="section-label">Applied</span><h2>Applied jobs</h2></div></div>
                {appliedJobs.length === 0 ? <p className="profile-empty">No applied jobs recorded yet. Mark a saved job as applied when you submit an application.</p> : (
                  <div className="profile-job-list">
                    {appliedJobs.filter((activity) => Boolean(activity?.job)).map((activity) => (
                      <article key={activity.id || activity.job.id} className="profile-job-row">
                        <div><strong>{activity.job.title}</strong><span>{activity.job.company} · {activity.job.location}</span><small>Status: Applied · Marked {new Date(activity.createdAt).toLocaleDateString()}</small></div>
                        <div className="profile-job-actions">
                          <span className="route-badge route-badge-soft">✓ Applied</span>
                          <a href={activity.job.applyUrl} target="_blank" rel="noopener noreferrer" className="route-secondary-button">View</a>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
