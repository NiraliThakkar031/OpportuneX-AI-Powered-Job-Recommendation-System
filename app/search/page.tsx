"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search as SearchIcon, Database } from "lucide-react";
import DashboardNav from "../components/dashboard/DashboardNav";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  description?: string;
  requiredSkills?: string[];
  domain?: string;
  active?: boolean;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadJobs(search = "") {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/jobs?q=${encodeURIComponent(search)}&limit=50`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load jobs.");
      setJobs(Array.isArray(data.results) ? data.results : []);
    } catch (e) {
      setJobs([]);
      setError(e instanceof Error ? e.message : "Unable to load jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadJobs(); }, []);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    void loadJobs(query.trim());
  }

  return (
    <main className="dashboard-shell route-dashboard-screen">
      <DashboardNav active="Search" />
      <section className="dashboard-page-header">
        <span className="dashboard-kicker"><Database size={14} /> Live job database</span>
        <h1>Search jobs</h1>
        <p>Search the same active, fresh job database used by OpportuneX instead of a fixed preview dataset.</p>
        <form className="dashboard-search search-page-box" onSubmit={submitSearch}>
          <SearchIcon size={19} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roles, skills or companies" />
          <button type="submit" className="primary-cta">Search</button>
        </form>
      </section>

      <section className="dashboard-main-grid search-results-grid">
        <div className="dashboard-column">
          <div className="section-heading"><div><span className="section-label">Database results</span><h2>{jobs.length} jobs</h2></div></div>
          {loading && <div className="panel-card"><strong>Loading jobs…</strong><p>Fetching the latest active listings from the database.</p></div>}
          {error && <div className="panel-card"><strong>Couldn&apos;t load jobs.</strong><p>{error}</p></div>}
          {!loading && !error && <div className="job-stack">
            {jobs.map((job) => {
              const tags = Array.isArray(job.requiredSkills) ? job.requiredSkills.slice(0, 5) : [];
              return <article className="job-card" key={job.id}>
                <div className="company-logo">{job.company?.[0] || "J"}</div>
                <div className="job-card-content">
                  <div className="job-title-row"><div><h3>{job.title}</h3><p>{job.company} · {job.location}</p></div></div>
                  {tags.length > 0 && <div className="tag-row">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
                  <div className="job-meta"><span>Live database</span><span>{job.domain || "General"}</span><span>Active listing</span></div>
                </div>
              </article>;
            })}
          </div>}
          {!loading && !error && jobs.length === 0 && <div className="panel-card"><strong>No active jobs match that search.</strong><p>Try another role, skill or company.</p></div>}
        </div>
        <aside className="panel-card ml-info-card"><span className="section-label">OpportuneX flow</span><h2>Use personalized matching</h2><ol><li>Complete your job profile.</li><li>Open Job Openings for profile-aware recommendations.</li><li>Select a job for skill-gap analysis and interview preparation.</li></ol><Link href="/openings" className="primary-cta">Open job matching <ArrowRight size={16} /></Link></aside>
      </section>
    </main>
  );
}
