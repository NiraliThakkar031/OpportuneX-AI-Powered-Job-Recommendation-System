"use client";
import Link from "next/link";
import { GraduationCap, MessageCircle, Route, Trophy } from "lucide-react";

const items = [
  ["Chatbot", "/assistant", MessageCircle],
  ["Learning Roadmap", "/learning-roadmap", GraduationCap],
  ["Career Roadmap", "/career-roadmap", Route],
  ["Interview Prep", "/interview-prep", Trophy],
] as const;

export default function CareerCopilotNav({ active }: { active: string }) {
  return <div className="copilot-subnav">{items.map(([label, href, Icon]) => <Link key={href} className={active === label ? "active" : ""} href={href}><Icon size={14}/>{label}</Link>)}</div>;
}
