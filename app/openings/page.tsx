"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import DashboardNav from "../components/dashboard/DashboardNav";

type JobPosting = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  source: string;
  postedDate?: string;
  lastCheckedAt?: string;
  active?: boolean;
  employmentType?: string;
  workplaceType?: string;
  domain?: string;
};

type MatchSummary = { title: string; value?: string };
type ScoreBreakdown = { semanticSimilarity: number; rerankRelevance: number; eligibility: number };
type RecommendationResult = {
  job: JobPosting;
  matchPercentage: number;
  confidence: "high" | "medium" | "low";
  score: ScoreBreakdown;
  matchedSkillCount: number;
  totalRequiredSkills: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasonCodes: string[];
  dataCompleteness: number;
  matchSummary: MatchSummary[];
  explanation: string;
};

type ApiResponse = { success: boolean; results: RecommendationResult[]; message?: string };

function fitLabel(score: number) {
  if (score >= 85) return "Excellent Match";
  if (score >= 75) return "Strong Match";
  if (score >= 60) return "Good Match";
  return "Potential Match";
}

function saveGuestJobContext(results: RecommendationResult[], query = "") {
  try {
    if (!results.length) { try { sessionStorage.removeItem("opx:guest-job-context"); } catch {} return; }
    const top = results[0];
    sessionStorage.setItem("opx:guest-job-context", JSON.stringify({
      query: query.trim(),
      searchedAt: Date.now(),
      job: {
        id: top.job.id, title: top.job.title, company: top.job.company, location: top.job.location,
        description: top.job.description, domain: top.job.domain, requiredSkills: (top.job as any).requiredSkills || top.matchedSkills || [],
        preferredSkills: (top.job as any).preferredSkills || [], minimumExperience: (top.job as any).minimumExperience,
      },
    }));
  } catch { /* temporary guest storage may be unavailable */ }
}

export default function OpeningsPage() {
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisLoadingId, setAnalysisLoadingId] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [minMatch, setMinMatch] = useState(0);
  const [sectorFilter, setSectorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchLoading, setSearchLoading] = useState(false);
  const [guestProfile, setGuestProfile] = useState<any | null>(null);
  const [notice, setNotice] = useState("");
  const searchTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let profileUpdatedAt = "";
    let activeProfilePayload: any | null = null;
    const cacheKey = "opx:jobs:recommendations:semantic-v2";
    async function ensureProfile() {
      const response = await fetch("/api/profile", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) {
        try {
          const raw = sessionStorage.getItem("opx:guest-profile");
          if (raw) {
            const guest = JSON.parse(raw);
            activeProfilePayload = guest;
            setGuestProfile(guest);
            profileUpdatedAt = "guest:" + JSON.stringify(guest);
            return;
          }
        } catch { /* ignore malformed guest profile */ }
        throw new Error("Complete your job profile first so OpportuneX can personalize the openings.");
      }
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load your profile.");
      if (!data.data?.profile) throw new Error("Complete your job profile first so OpportuneX can personalize the openings.");
      profileUpdatedAt = String(data.data.profile.updatedAt || "");
    }


    async function loadSavedJobs() {
      const response = await fetch("/api/saved-jobs", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (!data.success || !Array.isArray(data.jobs)) return;
      setSaved(new Set(data.jobs.map((item: { jobId: string }) => item.jobId)));
    }

    async function loadRecommendations() {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.profileUpdatedAt && parsed.profileUpdatedAt === profileUpdatedAt && Array.isArray(parsed.results) && Date.now() - Number(parsed.savedAt) < 5 * 60 * 1000) {
            setResults(parsed.results);
            if (activeProfilePayload) saveGuestJobContext(parsed.results, "");
            setLoading(false);
            return;
          }
        }
      } catch { /* ignore corrupt browser cache */ }

      try {
        const response = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activeProfilePayload ? { profile: activeProfilePayload } : {}),
        });
        const data: ApiResponse = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Unable to load openings.");
        if (cancelled) return;
        const sorted = [...(data.results || [])].sort((a, b) => b.matchPercentage - a.matchPercentage);
        setResults(sorted);
        if (activeProfilePayload) saveGuestJobContext(sorted, "");
        setLoading(false);
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ results: sorted, savedAt: Date.now(), profileUpdatedAt })); } catch { /* storage may be unavailable */ }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Unable to load openings.");
        setLoading(false);
      }
    }

    ensureProfile()
      .then(() => Promise.all([loadSavedJobs()]))
      .then(() => loadRecommendations())
      .catch((profileError) => {
        if (cancelled) return;
        setError(profileError instanceof Error ? profileError.message : "Unable to load openings.");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(async () => {
      const query = value.trim();
      if (query.length === 1) return;
      setSearchLoading(true);
      try {
        const response = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, ...(guestProfile ? { profile: guestProfile } : {}) }),
        });
        const data: ApiResponse = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Unable to search jobs.");
        const sorted = [...(data.results || [])].sort((a, b) => b.matchPercentage - a.matchPercentage);
        setResults(sorted);
        if (guestProfile) saveGuestJobContext(sorted, query);
        try {
          sessionStorage.setItem(`opx:jobs:recommendations:${query.toLowerCase()}`, JSON.stringify({ results: sorted, savedAt: Date.now() }));
        } catch { /* storage may be unavailable */ }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to search jobs.");
      } finally {
        setSearchLoading(false);
      }
    }, 420);
  }

  async function toggleSaved(item: RecommendationResult) {
    const key = `${item.job.source}:${item.job.id}`;
    const isSaved = saved.has(key);
    setSaved((current) => {
      const next = new Set(current);
      isSaved ? next.delete(key) : next.add(key);
      return next;
    });
    try {
      const response = await fetch("/api/saved-jobs", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: key }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to update saved jobs.");
      setNotice(isSaved ? `Removed ${item.job.title} from saved jobs` : `✓ ${item.job.title} saved`);
      window.setTimeout(() => setNotice(""), 2600);
    } catch (saveError) {
      setSaved((current) => {
        const next = new Set(current);
        isSaved ? next.add(key) : next.delete(key);
        return next;
      });
      setError(saveError instanceof Error ? saveError.message : "Unable to update saved jobs.");
    }
  }


  function buildDynamicMatchAnalysis(item: RecommendationResult) {
    const strong = item.matchedSkills.slice(0, 5);
    const gaps = item.missingSkills.slice(0, 5);
    const semantic = item.score?.semanticSimilarity ?? 0;
    const rerank = item.score?.rerankRelevance ?? item.matchPercentage;
    const fitParts = [
      semantic >= 70 ? "the semantic relationship between your profile and this role" : "the broader profile context",
      rerank >= 70 ? "the role and domain requirements" : "the available job evidence",
    ];
    return {
      headline: `${item.matchPercentage}% fit for ${item.job.title}`,
      explanation: strong.length
        ? `This ${item.job.title} opening at ${item.job.company} aligns with ${fitParts.join(", ")}. The strongest direct evidence is ${strong.join(", ")}.`
        : `This ${item.job.title} opening at ${item.job.company} is surfaced through semantic retrieval and final relevance reranking across your profile and the job posting.`,
      next: gaps.length
        ? `Before applying, review ${gaps.join(", ")}.`
        : "No major skill gap was identified from the structured requirements available for this posting.",
    };
  }

  function toggleAiAnalysis(item: RecommendationResult) {
    const id = item.job.id;
    if (analysisId === id) {
      setAnalysisId(null);
      setAnalysisLoadingId(null);
      return;
    }
    setAnalysisLoadingId(id);
    setAnalysisId(null);
    window.setTimeout(() => {
      setAnalysisId(id);
      setAnalysisLoadingId((current) => current === id ? null : current);
    }, 900);
  }


  const visibleResults = results.filter((item) => {
    const haystack = `${item.job.title} ${item.job.company} ${item.job.description} ${item.job.domain || ""}`.toLowerCase();
    const location = (item.job.location || "").toLowerCase();
    const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
    const matchesLocation = !locationFilter.trim() || location.includes(locationFilter.trim().toLowerCase());
    const matchesScore = item.matchPercentage >= minMatch;
    const matchesSector = sectorFilter === "all" || (sectorFilter === "government" ? Boolean((item.job as any).officialSource || (item.job as any).sourceType === "government" || item.job.source === "gov_india") : !((item.job as any).officialSource || (item.job as any).sourceType === "government" || item.job.source === "gov_india"));
    const matchesType = typeFilter === "all" || (item.job.workplaceType || "").toLowerCase() === typeFilter;
    return matchesSearch && matchesLocation && matchesScore && matchesSector && matchesType;
  }).sort((a, b) => b.matchPercentage - a.matchPercentage);

  return (
    <main className="dashboard-shell route-dashboard-screen">
      <DashboardNav active="Jobs" />
      <section className="route-flow-shell dashboard-route-card">
        {notice && <div className="opx-toast" role="status">{notice}</div>}
        <div className="route-flow-header">
          <span className="route-eyebrow">Live & matched openings</span>
          <h1>Jobs recommended for you</h1>
          <p>OpportuneX ranks available opportunities using your profile, eligibility, skills, preferences and semantic relevance.</p>
          <div className="route-actions">
            <Link href="/openings/setup" className="route-secondary-button">✎ Edit job profile</Link>
          </div>
        </div>

        {loading && <div className="route-status-card"><strong>Loading your matches...</strong><p>Reading active jobs from the database and ranking them against your profile.</p></div>}
        {!loading && !error && <div className="route-status-card"><strong>Matches loaded.</strong><p>Results are ranked by match percentage and cached for quick navigation.</p></div>}
        {!loading && error && <div className="route-status-card route-status-card-error"><p>{error}</p><Link href="/openings/setup" className="route-primary-button">Complete Profile</Link></div>}

        {!loading && !error && (
          <>
            <div className="job-filter-bar">
              <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search jobs, domains, companies or skills" />
              <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Location" />
              <select value={minMatch} onChange={(e) => setMinMatch(Number(e.target.value))}><option value={0}>Any match</option><option value={80}>80%+ match</option><option value={70}>70%+ match</option><option value={60}>60%+ match</option></select>
              <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)}><option value="all">All sectors</option><option value="private">Private</option><option value="government">Government / PSU</option></select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">All workplace types</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on-site">On-site</option></select>
            </div>
            <p className="results-sort-note">{searchLoading ? "Searching the live job database…" : `Showing ${visibleResults.length} of ${results.length} matches · sorted by highest match percentage`}</p>
            <div className="route-openings-grid">
            {visibleResults.map((item) => {
              const key = `${item.job.source}:${item.job.id}`;
              const expanded = analysisId === item.job.id;
              return (
                <article key={key} className="route-opening-card">
                  <div className="route-opening-top">
                    <div><h2>{item.job.title}</h2><p className="route-opening-company">{item.job.company} • {item.job.location}</p></div>
                    <div className="route-score-pill"><strong>{item.matchPercentage}%</strong><span>{fitLabel(item.matchPercentage)}</span></div>
                  </div>
                  <p>{item.job.description?.slice(0, 240) || item.explanation}{item.job.description?.length > 240 ? "…" : ""}</p>
                  <div className="job-freshness-row"><span>Last verified: {item.job.lastCheckedAt ? new Date(item.job.lastCheckedAt).toLocaleString() : "recently"}</span><span className="fresh-dot">● Active</span></div>

                  {item.missingSkills.length > 0 && <div className="skill-gap-inline"><strong>Skill gap:</strong> {item.missingSkills.slice(0, 6).join(", ")}</div>}
                  <div className="route-badge-row">
                    {item.matchSummary.slice(0, 4).map((summary) => <span key={`${summary.title}-${summary.value ?? ""}`} className="route-badge route-badge-soft">{summary.title}{summary.value ? `: ${summary.value}` : ""}</span>)}
                  </div>

                  {analysisLoadingId === item.job.id && <div className="route-ai-analysis-card route-ai-analysis-loading" aria-live="polite">
                    <div className="ai-bot-orb" aria-hidden="true">✦</div>
                    <div><strong>Career Copilot is analyzing</strong><span className="ai-typing-dots"><i></i><i></i><i></i></span><p>Comparing your profile evidence with this role...</p></div>
                  </div>}

                  {expanded && (() => { const analysis = buildDynamicMatchAnalysis(item); return <div className="route-ai-analysis-card route-ai-analysis-reveal">
                    <div className="ai-analysis-layout">
                      <div className="ai-analysis-title-col"><div className="ai-bot-orb" aria-hidden="true">✦</div><div><strong>Career Copilot</strong><h3>Match Analysis</h3><span>{Math.round(item.matchPercentage)}% fit · {analysis.headline}</span></div></div>
                      <div className="ai-analysis-main">
                        <p>{analysis.explanation}</p>
                        {item.matchedSkills.length > 0 && <div className="ai-analysis-detail"><strong>Matched evidence</strong><span>{item.matchedSkills.slice(0, 8).join(", ")}</span></div>}
                        {item.missingSkills.length > 0 && <div className="ai-analysis-detail"><strong>Review next</strong><span>{item.missingSkills.slice(0, 8).join(", ")}</span></div>}
                        <div className="ai-analysis-detail"><strong>Next move</strong><span>{analysis.next}</span></div>
                      </div>
                      <div className="ai-analysis-confidence"><span>SEMANTIC RELEVANCE</span><strong>{Math.round(item.score?.semanticSimilarity ?? item.matchPercentage)}%</strong><p>The final relevance uses semantic retrieval plus a dedicated reranking pass over eligible jobs.</p></div>
                    </div>
                  </div>; })()}

                  <div className="route-actions">
                    <button className="route-secondary-button" type="button" onClick={() => toggleAiAnalysis(item)}>🤖 {analysisLoadingId === item.job.id ? "Analyzing…" : expanded ? "Hide AI Analysis" : "AI Match Analysis"}</button>
                    <label className="save-checkbox-control">
                      <input
                        type="checkbox"
                        checked={saved.has(key)}
                        onChange={() => toggleSaved(item)}
                        aria-label={`Save ${item.job.title}`}
                      />
                      <span>Save</span>
                    </label>
                    <Link className="route-secondary-button" href={`/skill-gap?jobId=${encodeURIComponent(key)}`}>Skill Gap Analysis</Link>
                    <a className="route-primary-button" href={item.job.applyUrl} target="_blank" rel="noopener noreferrer">View Job →</a>
                  </div>
                </article>
              );
            })}
          </div>
            {results.length === 0 && (
              <div className="route-status-card">
                <h2>No strong matches found</h2>
                <p>Use the search box above to explore active openings, or add more skills, roles or locations to improve recommendations.</p>
                <Link href="/openings/setup" className="route-primary-button">Improve Profile</Link>
              </div>
            )}
            {results.length > 0 && visibleResults.length === 0 && (
              <div className="route-status-card"><h2>No jobs match these filters</h2><p>Try clearing a filter or searching for another role, company or location.</p></div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
