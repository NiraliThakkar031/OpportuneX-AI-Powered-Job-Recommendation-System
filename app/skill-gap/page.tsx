"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, GraduationCap, BriefcaseBusiness } from "lucide-react";
import DashboardNav from "../components/dashboard/DashboardNav";

export default function SkillGapPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [jobId, setJobId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("jobId") || "";
    setJobId(id);
    if (!id) {
      setError("Open Skill Gap Analysis from a job listing so OpportuneX can use the job and your saved profile automatically.");
      setLoading(false);
      return;
    }

    const cacheKey = `opx:skill-gap:${id}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.data) {
          setData(parsed.data);
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore corrupt browser cache */ }

    let guestProfile: any = null;
    try { guestProfile = JSON.parse(sessionStorage.getItem("opx:guest-profile") || "null"); } catch { /* ignore */ }

    fetch("/api/skill-gap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: id, ...(guestProfile ? { profile: guestProfile } : {}) }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.success) {
          if (r.status === 429 || r.status === 503) throw new Error("The analysis service is temporarily busy. Please try again shortly.");
          throw new Error(d.error || "Analysis failed.");
        }
        setData(d.data);
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ data: d.data, savedAt: Date.now() })); } catch { /* storage may be unavailable */ }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Analysis failed."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const target = Math.max(0, Math.min(100, Number(data?.score) || 0));
    setDisplayScore(0);
    if (!target) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 850);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [data?.score]);

  return (
    <main className="dashboard-shell route-dashboard-screen copilot-page">
      <DashboardNav active="Jobs" />
      <section className="feature-shell">
        <div className="feature-header feature-header-with-back">
          <button className="route-secondary-button" onClick={() => router.back()} aria-label="Back to jobs">
            <ArrowLeft size={15} /> Back to jobs
          </button>
          <span className="route-eyebrow">AI Skill Gap Analysis</span>
          <h1>{data?.jobTitle || "Understand your fit for this job"}</h1>
          <p>OpportuneX automatically uses the job you selected and your saved profile. You do not need to enter the job description or your skills again.</p>
        </div>

        {loading && <div className="route-status-card"><strong>Analyzing this job...</strong><p>Comparing the job requirements with your saved profile.</p></div>}
        {error && <div className="route-status-card route-status-card-error"><strong>Unable to analyze this job</strong><p>{error}</p><Link href="/openings" className="route-primary-button">Back to Jobs</Link></div>}

        {data && (
          <div className="feature-results">
            <div className="skill-gap-hero">
              <div><span className="route-eyebrow">Requirement coverage</span><strong className="skill-gap-score-count">{displayScore}%</strong><p>{data.domain || "General role"} · {data.jobTitle}</p></div>
              <div className="skill-gap-meter"><span style={{ width: `${Math.max(0, Math.min(100, data.score))}%` }} /></div>
            </div>

            <div className="feature-two-col">
              <div className="panel-card">
                <div className="skill-gap-card-title"><CheckCircle2 size={18} /><div><h2>What you already have</h2><span>{data.matched?.length || 0} matched requirements</span></div></div>
                {data.matched?.length ? data.matched.map((x: any, index: number) => <div className="feature-item motion-list-item" style={{ animationDelay: `${Math.min(index, 8) * 65}ms` }} key={`${x.category}-${x.name}`}><strong>{x.name}</strong><span>{x.category} · {x.result?.evidence || "Profile evidence found"}</span></div>) : <p>No confirmed matches from the available profile evidence.</p>}
              </div>

              <div className="panel-card">
                <div className="skill-gap-card-title gap"><CircleAlert size={18} /><div><h2>What you need to work on</h2><span>{data.missing?.length || 0} gaps identified</span></div></div>
                {data.missing?.length ? data.missing.map((x: any, index: number) => <div className="feature-item feature-gap motion-list-item" style={{ animationDelay: `${Math.min(index, 8) * 65 + 80}ms` }} key={`${x.category}-${x.name}`}><strong>{x.name}</strong><span>{x.category} · {x.importance} importance</span></div>) : <p>No gaps detected from the available evidence.</p>}
              </div>
            </div>

            {data.responsibilities?.length > 0 && <div className="panel-card"><div className="skill-gap-card-title"><BriefcaseBusiness size={18} /><div><h2>Role responsibilities</h2><span>What this job actually expects</span></div></div><div className="responsibility-grid">{data.responsibilities.map((x: string, index: number) => <div className="motion-list-item" style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }} key={x}>• {x}</div>)}</div></div>}

            <div className="skill-gap-next">
              <div><GraduationCap size={20} /><div><strong>Turn these gaps into a plan</strong><p>The roadmap will use this job and these exact gaps automatically.</p></div></div>
              <Link href={`/learning-roadmap?jobId=${encodeURIComponent(jobId)}`} className="route-primary-button">Build Learning Roadmap <span aria-hidden="true">→</span></Link>
            </div>
            <p className="feature-method">{data.methodology}</p>
          </div>
        )}
      </section>
    </main>
  );
}
