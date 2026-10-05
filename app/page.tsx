"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronRight,
  CircleCheck,
  Code2,
  Database,
  GraduationCap,
  HeartPulse,
  Landmark,
  Scale,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import DashboardNav from "./components/dashboard/DashboardNav";

type SavedProfile = {
  education?: string;
  experience?: number;
  preferredRoles?: string[];
  preferredLocation?: string;
  skills?: string[];
  workplacePreference?: string;
};

type Sector = {
  name: string;
  icon: React.ReactNode;
  jobs: {
    title: string;
    company: string;
    location: string;
    type: string;
  }[];
  skills: [string, number][];
};

// Market/domain data only. These skills are NOT taken from the user's profile.
const sectors: Sector[] = [
  {
    name: "IT & Software",
    icon: <Code2 size={16} />,
    jobs: [
      { title: "Frontend Developer", company: "TechNova Labs", location: "Bengaluru", type: "Hybrid" },
      { title: "Data Analyst", company: "CloudAxis", location: "Hyderabad", type: "Remote" },
      { title: "Cloud Engineer", company: "Vertex Digital", location: "Pune", type: "On-site" },
    ],
    skills: [["React", 92], ["JavaScript", 88], ["TypeScript", 79], ["Python", 67], ["AWS", 52], ["Docker", 43]],
  },
  {
    name: "Commerce & Finance",
    icon: <Landmark size={16} />,
    jobs: [
      { title: "Accountant", company: "FinEdge Services", location: "Mumbai", type: "Hybrid" },
      { title: "Finance Executive", company: "Axis Business", location: "Bengaluru", type: "On-site" },
      { title: "Tax Associate", company: "Prime Ledger", location: "Delhi", type: "Hybrid" },
    ],
    skills: [["Accounting", 94], ["Excel", 91], ["Tally", 82], ["GST", 76], ["Financial Analysis", 68], ["SAP", 54]],
  },
  {
    name: "Healthcare",
    icon: <HeartPulse size={16} />,
    jobs: [
      { title: "Clinical Research Associate", company: "MediCore", location: "Hyderabad", type: "Hybrid" },
      { title: "Healthcare Data Analyst", company: "HealthAxis", location: "Bengaluru", type: "Remote" },
      { title: "Medical Coding Specialist", company: "CarePoint", location: "Chennai", type: "On-site" },
    ],
    skills: [["Clinical Research", 89], ["Medical Coding", 84], ["Healthcare Analytics", 77], ["EMR", 69], ["Data Analysis", 62], ["Documentation", 58]],
  },
  {
    name: "Legal",
    icon: <Scale size={16} />,
    jobs: [
      { title: "Legal Associate", company: "LexBridge", location: "Mumbai", type: "Hybrid" },
      { title: "Contract Analyst", company: "LegalCore", location: "Bengaluru", type: "Remote" },
      { title: "Legal Research Associate", company: "JurisPoint", location: "Delhi", type: "On-site" },
    ],
    skills: [["Legal Research", 91], ["Contract Drafting", 86], ["Legal Writing", 82], ["Compliance", 74], ["Corporate Law", 67], ["Case Analysis", 61]],
  },
  {
    name: "Engineering",
    icon: <Database size={16} />,
    jobs: [
      { title: "Mechanical Engineer", company: "BuildWorks", location: "Pune", type: "On-site" },
      { title: "Civil Engineer", company: "InfraGrid", location: "Bengaluru", type: "Hybrid" },
      { title: "Electrical Engineer", company: "PowerAxis", location: "Chennai", type: "On-site" },
    ],
    skills: [["AutoCAD", 90], ["Engineering Design", 85], ["Project Planning", 78], ["SolidWorks", 71], ["Quality Control", 63], ["Site Management", 57]],
  },
  {
    name: "Education",
    icon: <GraduationCap size={16} />,
    jobs: [
      { title: "Assistant Professor", company: "EduSphere", location: "Bengaluru", type: "On-site" },
      { title: "Academic Coordinator", company: "LearnFirst", location: "Hyderabad", type: "Hybrid" },
      { title: "Online Tutor", company: "SkillBridge", location: "Remote · India", type: "Remote" },
    ],
    skills: [["Teaching", 94], ["Curriculum Design", 87], ["Communication", 84], ["Mentoring", 79], ["Assessment", 70], ["LMS", 61]],
  },
  {
    name: "Management & Business",
    icon: <TrendingUp size={16} />,
    jobs: [
      { title: "Business Analyst", company: "GrowthWorks", location: "Mumbai", type: "Hybrid" },
      { title: "Operations Manager", company: "MarketLane", location: "Bengaluru", type: "On-site" },
      { title: "Project Coordinator", company: "ScalePoint", location: "Pune", type: "Hybrid" },
    ],
    skills: [["Business Analysis", 91], ["Project Management", 86], ["Excel", 82], ["Communication", 80], ["Operations", 73], ["Power BI", 64]],
  },
  {
    name: "Science",
    icon: <Sparkles size={16} />,
    jobs: [
      { title: "Research Assistant", company: "Nova Research", location: "Bengaluru", type: "On-site" },
      { title: "Laboratory Analyst", company: "BioQuest", location: "Hyderabad", type: "Hybrid" },
      { title: "Data Research Associate", company: "Insight Labs", location: "Pune", type: "Remote" },
    ],
    skills: [["Research", 93], ["Data Analysis", 85], ["Laboratory Methods", 78], ["Statistics", 74], ["Python", 66], ["Scientific Writing", 62]],
  },
];

export default function Home() {
  const [profile, setProfile] = useState<SavedProfile | null>(null);
  const [userName, setUserName] = useState("Google User");
  const [sectorIndex, setSectorIndex] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboardContext() {
      try {
        const [sessionResponse, profileResponse] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
        ]);

        if (!active) return;

        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          const name = session?.user?.name || session?.user?.email?.split("@")[0];
          if (name) setUserName(name);
        }

        if (profileResponse.ok) {
          const data = await profileResponse.json();
          const savedProfile = data?.data?.profile;
          if (savedProfile) {
            setProfile({
              education: savedProfile.education ?? savedProfile.degree ?? "",
              experience: Number(savedProfile.experienceYears ?? 0),
              preferredRoles: Array.isArray(savedProfile.preferredRoles) ? savedProfile.preferredRoles : [],
              preferredLocation: Array.isArray(savedProfile.preferredLocations) ? savedProfile.preferredLocations.join(", ") : "",
              skills: Array.isArray(savedProfile.skills) ? savedProfile.skills : [],
              workplacePreference: savedProfile.workplacePreference ?? "",
            });
          }
        }
      } catch {
        // Keep safe dashboard defaults when the session/profile endpoints are unavailable.
      }
    }

    loadDashboardContext();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSectorIndex((index) => (index + 1) % sectors.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const sector = sectors[sectorIndex];

  return (
    <main className="dashboard-shell">
      <DashboardNav active="Dashboard" />

      <section className="dashboard-hero dashboard-hero-simple">
        <div>
          <span className="dashboard-kicker">
            <Sparkles size={14} /> AI career dashboard
          </span>
          <h1>Good morning, {userName} <span>👋</span></h1>
          <p>Discover opportunities, skills and career trends across every sector with OpportuneX.</p>
          {profile?.preferredRoles?.length ? (
            <span className="profile-context">
              Your saved preferences are available for personalized recommendations.
            </span>
          ) : null}
        </div>
      </section>

      <section className="dashboard-bottom-grid dashboard-market-layout">
        <div className="panel-card trending-market-card">
          <div className="section-heading compact">
            <div>
              <span className="section-label">Live rotation · changes every 5 seconds</span>
              <h2>Trending jobs today</h2>
            </div>
            <div className="sector-badge">{sector.icon}{sector.name}</div>
          </div>

          <div className="trending-job-grid trending-job-grid-vertical" key={`jobs-${sector.name}`}>
            {sector.jobs.map((job) => (
              <article className="trending-job-card" key={job.title}>
                <div className="trending-logo">{job.company.slice(0, 1)}</div>
                <div>
                  <h3>{job.title}</h3>
                  <p>{job.company}</p>
                  <span>{job.location} · {job.type}</span>
                </div>
                <ChevronRight size={16} />
              </article>
            ))}
          </div>

          <div className="sector-dots">
            {sectors.map((item, index) => (
              <i key={item.name} className={index === sectorIndex ? "active" : ""} />
            ))}
          </div>
        </div>

        <div className="panel-card skill-profile-card">
          <div className="section-heading compact">
            <div>
              <span className="section-label">Market demand · changes every 5 seconds</span>
              <h2>Skills in Demand</h2>
            </div>
          </div>

          <div className="skill-sector-title">{sector.icon}{sector.name}</div>
          <p className="skill-market-description">
            Generic skills that are important for opportunities in this sector and current market needs.
          </p>

          <div className="skill-list skill-animated" key={`skills-${sector.name}`}>
            {sector.skills.map(([skill, importance]) => (
              <div className="skill-row" key={skill}>
                <div className="skill-name">
                  <span>{skill}</span>
                  <b>{importance}% importance</b>
                </div>
                <div className="skill-track">
                  <i style={{ width: `${importance}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="skill-market-footer">Market demand · Updated automatically</div>
        </div>

        <div className="panel-card market-card">
          <div className="section-heading compact">
            <div>
              <span className="section-label">Market snapshot</span>
              <h2>Job market at a glance</h2>
            </div>
          </div>

          <div className="market-stat-grid">
            <div className="market-stat"><strong>8</strong><span>sectors covered</span></div>
            <div className="market-stat"><strong>24/7</strong><span>opportunity discovery</span></div>
            <div className="market-stat"><strong>+18%</strong><span>fresh listings trend</span></div>
            <div className="market-stat"><strong>Multi-source</strong><span>job coverage</span></div>
          </div>

          <div className="trend-note">
            <CircleCheck size={16} /> Opportunities are refreshed across sectors and locations.
          </div>
        </div>

        <div className="panel-card opportunity-coverage-card">
          <div className="section-heading compact opportunity-coverage-heading">
            <div>
              <span className="section-label">Opportunity coverage</span>
              <h2>Explore opportunities across sectors</h2>
            </div>
            <span className="analytics-period">Multi-sector discovery</span>
          </div>

          <div className="opportunity-coverage-visual" aria-label="Career sectors available on OpportuneX">
            <div className="coverage-visual-top">
              <div>
                <span>CAREER LANDSCAPE</span>
                <strong>One platform. Many directions.</strong>
              </div>
              <div className="coverage-count"><b>{sectors.length}</b><span>sectors</span></div>
            </div>
            <div className="coverage-spectrum" aria-hidden="true">
              <i /><i /><i /><i /><i /><i /><i /><i />
            </div>
            <div className="coverage-sector-grid">
              {sectors.map((item, index) => (
                <div className="coverage-sector" key={item.name}>
                  <span className={`coverage-sector-icon coverage-sector-tone-${index % 4}`}>{item.icon}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>Explore opportunities</small>
                  </div>
                  <ArrowRight size={13} />
                </div>
              ))}
            </div>
          </div>

          <div className="coverage-footer">
            <span>Across sectors, qualifications and career paths.</span>
            <Link href="/openings">Explore opportunities <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>

      <section className="dashboard-search-cta">
        <div>
          <BriefcaseBusiness size={19} />
          <div>
            <span className="section-label">Personalized job discovery</span>
            <h2>Look for your personalized job</h2>
            <p>Use your profile and preferences to find opportunities tailored to you.</p>
          </div>
        </div>
        <Link href="/openings" className="primary-cta">
          Personalized Search <ArrowRight size={17} />
        </Link>
      </section>

      <footer className="dashboard-footer dashboard-about">
        <div>
          <strong>About OpportuneX</strong>
          <p>OpportuneX is an AI-powered career discovery platform built to connect people with relevant job opportunities.</p>
          <p>It brings together job data, career information and intelligent matching to make job discovery simpler and more transparent.</p>
        </div>
        <span>Database-powered job discovery · Reliable matching · Career intelligence</span>
      </footer>
    </main>
  );
}
