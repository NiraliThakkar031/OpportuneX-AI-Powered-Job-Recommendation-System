"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Compass, Sparkles, Target, Zap } from "lucide-react";
import DashboardNav from "../components/dashboard/DashboardNav";
import CareerCopilotNav from "../components/dashboard/CareerCopilotNav";
import CopilotHero from "../components/dashboard/CopilotHero";

export default function LearningRoadmapPage() {
  const [jobId, setJobId] = useState("");
  const [role, setRole] = useState("");
  const [skills, setSkills] = useState("");
  const [gapData, setGapData] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [error, setError] = useState("");
  const [activeStage, setActiveStage] = useState(0);
  const [source, setSource] = useState<"ai" | "fallback" | "">("");

  async function buildRoadmap(targetRole: string, missingSkills: string[]) {
    if (!targetRole) {
      setError("The selected job does not have a usable role title.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/learning-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole, missingSkills }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.error || "Unable to build roadmap.");
      setData(d.data);
      setSource(d.source === "fallback" ? "fallback" : "ai");
      setActiveStage(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to build roadmap.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("jobId") || "";
    setJobId(id);
    if (!id) return;

    let cancelled = false;
    async function loadContextAndBuild() {
      setLoadingContext(true);
      setError("");
      const cacheKey = `opx:skill-gap:${id}`;
      let cachedData: any = null;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) cachedData = JSON.parse(cached)?.data || null;
      } catch { /* ignore corrupt browser cache */ }

      try {
        let gap = cachedData;
        if (!gap) {
          let guestProfile: any = null;
          try { guestProfile = JSON.parse(sessionStorage.getItem("opx:guest-profile") || "null"); } catch { /* ignore */ }
          const r = await fetch("/api/skill-gap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: id, ...(guestProfile ? { profile: guestProfile } : {}) }) });
          const d = await r.json().catch(() => ({}));
          if (!r.ok || !d.success) throw new Error(d.error || "Unable to read the selected job.");
          gap = d.data;
          try { sessionStorage.setItem(cacheKey, JSON.stringify({ data: gap, savedAt: Date.now() })); } catch { /* ignore */ }
        }
        if (cancelled) return;
        setGapData(gap);
        const targetRole = gap.jobTitle || "";
        const missingSkills = (gap.missing || []).map((x: any) => x.name).filter(Boolean);
        setRole(targetRole);
        setSkills(missingSkills.join(", "));
        await buildRoadmap(targetRole, missingSkills);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load the selected job.");
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    }
    loadContextAndBuild();
    return () => { cancelled = true; };
  }, []);

  const manualBuild = () => buildRoadmap(role.trim(), skills.split(",").map((x) => x.trim()).filter(Boolean));
  const stages = data?.weeks || [];
  const active = stages[activeStage] || stages[0];
  const completion = stages.length ? Math.round(((activeStage + 1) / stages.length) * 100) : 0;
  const gapCount = gapData?.missing?.length || skills.split(",").filter(Boolean).length;
  const stageDots = useMemo(() => stages.slice(0, 7), [stages]);

  return (
    <main className="dashboard-shell route-dashboard-screen roadmap-screen copilot-page">
      <DashboardNav active="Career Copilot" />
      <CareerCopilotNav active="Learning Roadmap" />

      <section className="roadmap-lab-shell">
        <CopilotHero variant="learning" kicker="LEARNING INTELLIGENCE" title={<>Build the path.<br /><span>Own the destination.</span></>} description={gapData?.jobTitle ? `A dynamic learning journey engineered around ${gapData.jobTitle} and the exact requirements you still need to close.` : "A dynamic learning journey built around your target role, current evidence and the gaps that matter most."} />

        {!jobId && !data && !loading && (
          <div className="roadmap-manual-launch copilot-panel">
            <div><span className="roadmap-kicker">CUSTOM PATH</span><h2>Where are you heading?</h2><p>Set a target and the AI will shape the journey around your actual gaps.</p></div>
            <div className="roadmap-manual-fields"><input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Target role" /><input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Missing requirements" /><button className="roadmap-launch-button" onClick={manualBuild} disabled={!role.trim() || !skills.trim()}>Generate path <ArrowUpRight size={16} /></button></div>
          </div>
        )}

        {loadingContext && <div className="roadmap-loading"><div className="roadmap-loading-orb"><Zap size={17} /></div><div><strong>Mapping your opportunity...</strong><span>Reading the selected job and your Skill Gap Analysis.</span></div></div>}
        {loading && !loadingContext && <div className="roadmap-loading"><div className="roadmap-loading-orb"><Sparkles size={17} /></div><div><strong>Designing your path...</strong><span>Turning the identified requirements into a practical sequence.</span></div></div>}
        {error && <div className="route-status-card route-status-card-error"><strong>Roadmap unavailable</strong><p>{error}</p></div>}

        {data && (
          <div className="roadmap-experience">
            <section className="roadmap-progress-panel">
              {source === "fallback" && <div className="roadmap-fallback-note"><Zap size={14} /><span>AI service is temporarily busy. This roadmap was built directly from the selected job requirements, so you can keep moving.</span></div>}
              <div className="roadmap-progress-head"><div><span className="roadmap-kicker">YOUR JOURNEY</span><h2>{data.goal}</h2></div><div className="roadmap-progress-number">{completion}<small>%</small></div></div>
              <div className="roadmap-progress-track"><span style={{ width: `${completion}%` }} /></div>
              <div className="roadmap-progress-meta"><span>Stage {activeStage + 1} of {stages.length}</span><span>{data.durationWeeks || stages.length} week plan · {gapCount} gaps</span></div>
            </section>

            <section className="roadmap-journey">
              <div className="roadmap-rail" aria-hidden="true"><span className="roadmap-rail-fill" style={{ height: `${stages.length > 1 ? (activeStage / (stages.length - 1)) * 100 : 100}%` }} /></div>
              <div className="roadmap-stage-stack">
                {stages.map((w: any, index: number) => {
                  const selected = index === activeStage;
                  const done = index < activeStage;
                  return (
                    <button type="button" className={`roadmap-stage-card ${selected ? "is-active" : ""} ${done ? "is-done" : ""}`} key={w.week} onClick={() => setActiveStage(index)}>
                      <div className="roadmap-stage-node"><span>{done ? <Check size={14} /> : String(index + 1).padStart(2, "0")}</span></div>
                      <div className="roadmap-stage-copy"><div className="roadmap-stage-meta"><span>PHASE {String(index + 1).padStart(2, "0")}</span><small>WEEK {w.week}</small></div><h3>{w.title}</h3><p>{(w.objectives || [])[0] || "Build capability through focused practice."}</p></div>
                      <ArrowUpRight className="roadmap-stage-arrow" size={17} />
                    </button>
                  );
                })}
              </div>
            </section>

            {active && (
              <section className="roadmap-focus-card">
                <div className="roadmap-focus-top"><div><span className="roadmap-kicker">ACTIVE PHASE · {String(activeStage + 1).padStart(2, "0")}</span><h2>{active.title}</h2></div><div className="roadmap-focus-badge">{activeStage < stages.length - 1 ? "IN PROGRESS" : "FINAL PHASE"}</div></div>
                <div className="roadmap-focus-grid">
                  <div><span>OBJECTIVES</span><ul>{(active.objectives || []).map((x: string) => <li key={x}>{x}</li>)}</ul></div>
                  <div><span>PRACTICE</span><ul>{(active.practice || []).map((x: string) => <li key={x}>{x}</li>)}</ul></div>
                  <div><span>PROOF OF PROGRESS</span><ul>{(active.evidence || []).map((x: string) => <li key={x}>{x}</li>)}</ul></div><div><span>RESOURCES & DELIVERABLE</span><ul>{(active.resources || []).map((x: string) => <li key={x}>{x}</li>)}</ul>{active.deliverable && <p className="roadmap-deliverable"><strong>Deliverable:</strong> {active.deliverable}</p>}{active.checkpoint && <p className="roadmap-checkpoint"><strong>Checkpoint:</strong> {active.checkpoint}</p>}</div>
                </div>
                <div className="roadmap-focus-footer"><span>{source === "fallback" ? "Built from the selected job requirements without relying on a generative AI response." : "One focused phase at a time. Your roadmap adapts to the requirements of the target role."}</span>{activeStage < stages.length - 1 && <button onClick={() => setActiveStage((s) => Math.min(s + 1, stages.length - 1))}>Next phase <ArrowUpRight size={15} /></button>}</div>
              </section>
            )}

            {stageDots.length > 0 && <div className="roadmap-mini-map"><span>PATH SIGNAL</span><div>{stageDots.map((_: any, i: number) => <button key={i} className={i <= activeStage ? "active" : ""} onClick={() => setActiveStage(i)} aria-label={`Go to phase ${i + 1}`} />)}</div><small>{activeStage + 1}/{stages.length}</small></div>}
          </div>
        )}
      </section>
    </main>
  );
}
