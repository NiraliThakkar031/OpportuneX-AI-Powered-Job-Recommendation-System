"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, Brain, CalendarDays, Clock3, Sparkles, Trophy, Target, MessageSquareText } from "lucide-react";
import DashboardNav from "../components/dashboard/DashboardNav";
import CareerCopilotNav from "../components/dashboard/CareerCopilotNav";
import CopilotHero from "../components/dashboard/CopilotHero";
type Q={id:string;question:string;options:string[];answer:number;explanation:string}; type Quiz={domain:string;questions:Q[]}; type History={id:string;domain:string;score:number;total:number;takenAt:string};
const HISTORY_KEY="opx:interview-history";
export default function InterviewPrepPage(){
 const [quiz,setQuiz]=useState<Quiz|null>(null); const [index,setIndex]=useState(0); const [answers,setAnswers]=useState<number[]>([]); const [done,setDone]=useState(false); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [history,setHistory]=useState<History[]>([]); const [historyLoading,setHistoryLoading]=useState(true);
 const [contextReady,setContextReady]=useState(false);
 const [contextMessage,setContextMessage]=useState("");
 useEffect(()=>{let alive=true;(async()=>{
   try{const r=await fetch("/api/interview-history",{cache:"no-store"});if(r.ok){const d=await r.json();if(alive&&d.success)setHistory(d.history||[]);else throw new Error("guest");}else throw new Error("guest");}catch{try{const raw=sessionStorage.getItem(HISTORY_KEY);const local=raw?JSON.parse(raw):[];if(alive&&Array.isArray(local))setHistory(local.slice(0,12));}catch{}}
   try{
     const sessionResponse=await fetch("/api/auth/session",{cache:"no-store"});
     const sessionData=await sessionResponse.json().catch(()=>({}));
     const loggedIn=Boolean(sessionData?.user);
     if(loggedIn){
       const profileResponse=await fetch("/api/profile",{cache:"no-store"});
       const profileData=await profileResponse.json().catch(()=>({}));
       if(profileResponse.ok && profileData?.data?.profile){
         const contextResponse=await fetch("/api/interview-context",{cache:"no-store"});
         const contextData=await contextResponse.json().catch(()=>({}));
         if(contextData?.success){setContextReady(true);setContextMessage("");}
         else setContextMessage(contextData?.error||"Search jobs first so Interview Prep can use your recent job context.");
       } else setContextMessage("Complete your job profile first.");
     } else {
       const guestProfile=JSON.parse(sessionStorage.getItem("opx:guest-profile")||"null");
       const jobContext=JSON.parse(sessionStorage.getItem("opx:guest-job-context")||"null");
       if(guestProfile && jobContext){setContextReady(true);setContextMessage("");}
       else if(!guestProfile)setContextMessage("Complete your job profile first.");
       else setContextMessage("Search jobs first so Interview Prep can use your recent job context.");
     }
   }catch{setContextMessage("Complete your job profile and search jobs first.");}
   if(alive)setHistoryLoading(false);
 })();return()=>{alive=false}},[]);
 async function start(){setLoading(true);setError("");try{
   const guestProfile=JSON.parse(sessionStorage.getItem("opx:guest-profile")||"null");
   const guestJobContext=JSON.parse(sessionStorage.getItem("opx:guest-job-context")||"null");
   const body=guestProfile ? {profile:guestProfile,jobContext:guestJobContext} : {};
   const r=await fetch("/api/interview-quiz",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw new Error(d.error||"Unable to generate interview prep.");setQuiz(d.quiz);setIndex(0);setAnswers([]);setDone(false)}catch(e){setError(e instanceof Error?e.message:"Unable to generate interview prep.")}finally{setLoading(false)}}
 async function saveResult(score:number,total:number,domain:string){const entry={id:`local-${Date.now()}`,domain,score,total,takenAt:new Date().toISOString()};try{const r=await fetch("/api/interview-history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({domain,score,total})});if(r.ok){const d=await r.json();if(d.success){setHistory(prev=>[d.historyEntry,...prev].slice(0,12));return}}}catch{} try{const raw=sessionStorage.getItem(HISTORY_KEY);const old=raw?JSON.parse(raw):[];const next=[entry,...(Array.isArray(old)?old:[])].slice(0,12);sessionStorage.setItem(HISTORY_KEY,JSON.stringify(next));setHistory(next)}catch{}}
 function answer(i:number){if(!quiz||done)return;const next=[...answers,i];setAnswers(next);if(index>=quiz.questions.length-1){setDone(true);const score=next.reduce((n,a,j)=>n+(a===quiz.questions[j]?.answer?1:0),0);void saveResult(score,quiz.questions.length,quiz.domain)}else setIndex(index+1)}
 const score=quiz?answers.reduce((n,a,i)=>n+(a===quiz.questions[i]?.answer?1:0),0):0;
 return <main className="dashboard-shell route-dashboard-screen copilot-page"><DashboardNav active="Career Copilot"/><CareerCopilotNav active="Interview Prep"/><section className="feature-shell copilot-feature-page"><CopilotHero variant="interview" kicker="INTERVIEW INTELLIGENCE" title={<>Turn preparation into<br /><span>confidence.</span></>} description="Practice questions generated around your current profile, skills and recent job context — not a generic software-only test." />
 {history.length>0&&<section className="interview-history-card"><div className="interview-history-head"><div><span className="route-eyebrow">YOUR PRACTICE HISTORY</span><h2>Previous interview sessions</h2></div><span>{history.length} saved</span></div><div className="interview-history-list">{history.slice(0,6).map(h=><div className="interview-history-row" key={h.id}><div className="history-icon"><CalendarDays size={15}/></div><div><strong>{h.domain}</strong><span><Clock3 size={12}/> {new Date(h.takenAt).toLocaleString()}</span></div><b>{h.score}/{h.total}</b></div>)}</div></section>}
 {historyLoading&&<div className="route-status-card">Loading practice history…</div>}
 {error&&<div className="route-status-card route-status-card-error">{error}</div>}{!quiz&&!loading&&<div className="panel-card interview-prep-start feature-start-card"><div className="feature-start-icon"><Brain size={20}/></div><div><span className="route-eyebrow">{contextReady?"READY WHEN YOU ARE":"SET UP YOUR CONTEXT"}</span><h2>{contextReady?"Run a focused mock interview":"Prepare your interview context first"}</h2><p>{contextReady?"Questions use your recent job context and profile so the test is specific to the kind of role you are exploring.":contextMessage}</p></div><button className="route-primary-button" disabled={!contextReady} onClick={start}><Sparkles size={15}/> {contextReady?"Start 10-question test":"Search jobs first"}</button></div>}{loading&&<div className="route-status-card ai-loading-card"><div className="ai-bot-orb">✦</div><div><strong>Career Copilot is preparing your interview</strong><span className="ai-typing-dots"><i/><i/><i/></span><p>Building questions around your profile…</p></div></div>}{quiz&&!done&&<div className="interactive-quiz-card feature-quiz-card"><div className="quiz-progress">Question {index+1} of {quiz.questions.length} · {quiz.domain}</div><div className="quiz-progress-track"><span style={{width:`${((index+1)/quiz.questions.length)*100}%`}}/></div><h3>{quiz.questions[index].question}</h3><div className="quiz-options">{quiz.questions[index].options.map((o,i)=><button key={o} onClick={()=>answer(i)}>{String.fromCharCode(65+i)} <span>{o}</span></button>)}</div></div>}{quiz&&done&&<div className="feature-results"><div className="feature-score"><Trophy size={21}/><strong>{score}/{quiz.questions.length}</strong><span>Mock interview score · {quiz.domain}</span></div><div className="panel-card"><h2>Review your performance</h2>{quiz.questions.map((q,i)=><div className="quiz-review-item" key={q.id}><strong>{i+1}. {q.question}</strong><span>Your answer: {q.options[answers[i]]||"Not answered"}</span><small>{answers[i]===q.answer?"Correct":"Correct answer: "+q.options[q.answer]+" · "+q.explanation}</small></div>)}</div><button className="route-primary-button" onClick={start}>Try another test</button></div>}</section></main>
}
