"use client";

import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Compass, Sparkles, Target } from "lucide-react";
import DashboardNav from "../components/dashboard/DashboardNav";
import CareerCopilotNav from "../components/dashboard/CareerCopilotNav";
import CopilotHero from "../components/dashboard/CopilotHero";

export default function CareerRoadmapPage() {
  const [role, setRole] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activePhase, setActivePhase] = useState(0);

  async function run() {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/career-roadmap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetRole: role }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.error || "Unable to build roadmap.");
      setData(d.data); setActivePhase(0);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to build roadmap."); }
    finally { setLoading(false); }
  }

  const phases = data?.phases || [];
  const active = phases[activePhase];
  const progress = phases.length ? Math.round(((activePhase + 1) / phases.length) * 100) : 0;

  return (
    <main className="dashboard-shell route-dashboard-screen roadmap-screen copilot-page">
      <DashboardNav active="Career Copilot" />
      <CareerCopilotNav active="Career Roadmap" />
      <section className="roadmap-lab-shell">
        <CopilotHero variant="career" kicker="CAREER INTELLIGENCE" title={<>See the bigger picture.<br /><span>Move with intent.</span></>} description="Your current profile becomes a strategic career path — with phases, evidence of readiness and near-term actions instead of a static checklist." />

        {!data && !loading && <div className="roadmap-manual-launch"><div><span className="roadmap-kicker">TARGET ROLE</span><h2>Choose your destination.</h2><p>Leave it blank to use the role already saved in your profile.</p></div><div className="roadmap-manual-fields"><input value={role} onChange={e => setRole(e.target.value)} placeholder="Target role (optional)" /><div /><button className="roadmap-launch-button" onClick={run}>Generate career path <ArrowUpRight size={16} /></button></div></div>}
        {loading && <div className="roadmap-loading"><div className="roadmap-loading-orb"><Sparkles size={17} /></div><div><strong>Mapping your career trajectory...</strong><span>Turning your profile into a practical, domain-neutral path.</span></div></div>}
        {error && <div className="route-status-card route-status-card-error"><strong>Roadmap unavailable</strong><p>{error}</p></div>}

        {data && <div className="roadmap-experience">
          <section className="roadmap-progress-panel"><div className="roadmap-progress-head"><div><span className="roadmap-kicker">CAREER TRAJECTORY</span><h2>{data.currentState}</h2></div><div className="roadmap-progress-number">{progress}<small>%</small></div></div><div className="roadmap-progress-track"><span style={{ width: `${progress}%` }} /></div><div className="roadmap-progress-meta"><span>Phase {activePhase + 1} of {phases.length}</span><span>Target · {data.targetRole}</span></div></section>

          {data.gaps?.length > 0 && <section className="career-gap-strip"><div><Target size={16} /><div><span>GAPS TO VALIDATE</span><strong>Before you move to the next phase</strong></div></div><div>{data.gaps.slice(0, 6).map((g: string) => <span key={g}>{g}</span>)}</div></section>}

          <section className="roadmap-journey"><div className="roadmap-rail" aria-hidden="true"><span className="roadmap-rail-fill" style={{ height: `${phases.length > 1 ? (activePhase / (phases.length - 1)) * 100 : 100}%` }} /></div><div className="roadmap-stage-stack">{phases.map((p: any, i: number) => <button type="button" key={p.phase} className={`roadmap-stage-card ${i === activePhase ? "is-active" : ""} ${i < activePhase ? "is-done" : ""}`} onClick={() => setActivePhase(i)}><div className="roadmap-stage-node"><span>{i < activePhase ? <Check size={14} /> : String(i + 1).padStart(2, "0")}</span></div><div className="roadmap-stage-copy"><div className="roadmap-stage-meta"><span>PHASE {String(i + 1).padStart(2, "0")}</span></div><h3>{p.phase}</h3><p>{p.focus}</p></div><ArrowUpRight className="roadmap-stage-arrow" size={17} /></button>)}</div></section>

          {active && <section className="roadmap-focus-card"><div className="roadmap-focus-top"><div><span className="roadmap-kicker">ACTIVE PHASE · {String(activePhase + 1).padStart(2, "0")}</span><h2>{active.phase}</h2></div><div className="roadmap-focus-badge">CAREER SIGNAL</div></div><div className="roadmap-focus-grid"><div><span>FOCUS</span><ul><li>{active.focus}</li></ul></div><div><span>ACTIONS</span><ul>{(active.actions || []).map((x: string) => <li key={x}>{x}</li>)}</ul></div><div><span>READINESS EVIDENCE</span><ul>{(active.evidenceOfReadiness || []).map((x: string) => <li key={x}>{x}</li>)}</ul></div></div><div className="roadmap-focus-footer"><span>Use the phases as a direction system, not a rigid checklist.</span>{activePhase < phases.length - 1 && <button onClick={() => setActivePhase(v => Math.min(v + 1, phases.length - 1))}>Next phase <ArrowUpRight size={15} /></button>}</div></section>}

          <div className="career-horizon-grid"><div><span>NEXT 30 DAYS</span>{(data.next30Days || []).slice(0, 4).map((x: string) => <p key={x}>→ {x}</p>)}</div><div><span>NEXT 90 DAYS</span>{(data.next90Days || []).slice(0, 4).map((x: string) => <p key={x}>→ {x}</p>)}</div></div>
        </div>}
      </section>
    </main>
  );
}
