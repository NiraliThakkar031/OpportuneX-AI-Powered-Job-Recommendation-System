"use client";
import Link from "next/link";
import { BriefcaseBusiness, Bot, LayoutDashboard } from "lucide-react";
import UserMenu from "./UserMenu";

export default function DashboardNav({ active = "Dashboard" }: { active?: string }) {
  const links = [
    ["Dashboard", "/", LayoutDashboard],
    ["Jobs", "/openings/setup", BriefcaseBusiness],
    ["Career Copilot", "/assistant", Bot],
  ] as const;
  return <nav className="dashboard-nav">
    <Link href="/" className="dashboard-brand"><span className="brand-orb">O</span><span>Opportune<span>X</span></span></Link>
    <div className="dashboard-nav-links">{links.map(([label, href, Icon]) => <Link key={label} className={active === label ? "active" : ""} href={href}><Icon size={15}/>{label}</Link>)}</div>
    <div className="dashboard-nav-actions"><UserMenu /></div>
  </nav>;
}
