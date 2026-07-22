"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type JobPosting = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  source: string;
  postedDate?: string;
};

type MatchSummary = {
  title: string;
  value?: string;
};

type ScoreBreakdown = {
  education: number;
  skills: number;
  experience: number;
  preferredRoles: number;
  preferredDomain: number;
  employmentType: number;
  workplacePreference: number;
  preferredLocation: number;
  certifications: number;
  freshness: number;
  total: number;
};

type RecommendationResult = {
  job: JobPosting;
  matchPercentage: number;
  score: ScoreBreakdown;
  matchedSkillCount: number;
  totalRequiredSkills: number;
  matchSummary: MatchSummary[];
  explanation: string;
};

type ApiResponse = {
  success: boolean;
  results: RecommendationResult[];
  message?: string;
};

const PROFILE_STORAGE_KEY = "opportunex:profile";

function loadProfile() {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "");
  } catch {
    return null;
  }
}

function fitLabel(score: number) {
  if (score >= 80) return "Excellent Match";
  if (score >= 65) return "Strong Match";
  if (score >= 50) return "Good Match";
  return "Potential Match";
}

export default function ResultsPage() {
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchResults() {
      const profile = loadProfile();

      if (!profile) {
        setError("Please fill your profile first.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(profile),
        });

        const data: ApiResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch jobs.");
        }

        setResults(data.results ?? []);
      } catch (err: any) {
        setError(err.message || "Failed to load recommendations.");
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, []);

  return (
    <main className="route-screen route-screen-light">
      <section className="route-flow-shell">
        <div className="route-flow-header">
          <span className="route-eyebrow">Matched Openings</span>

          <h1>Your AI Job Recommendations</h1>

          <p>
            Ranked using education, skills, experience, role preferences,
            location and other matching factors.
          </p>
        </div>

        {loading && (
          <div className="route-status-card">
            Loading recommendations...
          </div>
        )}

        {!loading && error && (
          <div className="route-status-card route-status-card-error">
            <p>{error}</p>

            <Link href="/openings" className="route-primary-button">
              Back
            </Link>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="route-status-card">
            <h2>No matching jobs found</h2>

            <p>
              Try changing your preferred role, location or skills to broaden
              the search.
            </p>

            <Link href="/openings" className="route-primary-button">
              Edit Profile
            </Link>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="route-openings-grid">
            {results.map((item) => (
              <article
                key={`${item.job.source}-${item.job.id}`}
                className="route-opening-card"
              >
                <div className="route-opening-top">
                  <div>
                    <h2>{item.job.title}</h2>

                    <p className="route-opening-company">
                      {item.job.company} • {item.job.location}
                    </p>
                  </div>

                  <div className="route-score-pill">
                    <strong>{item.matchPercentage}%</strong>

                    <span>{fitLabel(item.matchPercentage)}</span>
                  </div>
                </div>

                {item.matchSummary.length > 0 && (
                  <div className="route-badge-row">
                    {item.matchSummary.map((summary) => (
                      <span
                        key={`${summary.title}-${summary.value ?? ""}`}
                        className="route-badge route-badge-soft"
                      >
                        {summary.title}
                        {summary.value ? `: ${summary.value}` : ""}
                      </span>
                    ))}
                  </div>
                )}

                <p>{item.explanation}</p>

                <div className="route-badge-row">
                  <span className="route-badge">
                    Skills Matched:{" "}
                    {item.totalRequiredSkills === 0
                      ? "Not specified"
                      : `${item.matchedSkillCount}/${item.totalRequiredSkills}`}
                  </span>

                  <span className="route-badge">
                    Source: {item.job.source}
                  </span>
                </div>

                <div className="route-actions">
                  <a
                    href={item.job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="route-primary-button"
                  >
                    Apply Now
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

        <section className="route-transition-card">
          <div>
            <strong>Improve Recommendations</strong>

            <p>
              Update your profile to discover even more relevant opportunities.
            </p>
          </div>

          <div className="route-actions">
            <Link href="/openings" className="route-secondary-button">
              Edit Profile
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}