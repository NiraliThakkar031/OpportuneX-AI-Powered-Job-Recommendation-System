import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { getGeminiClient } from "@/lib/gemini";
import { auth } from "@/auth";

const STOP = new Set("a an and are as at be by for from in into is it of on or the this that to with you your our their they will are have has had using use used required preferred role responsibilities experience years skills ability knowledge strong good work working team teams".split(" "));
const normalize = (s:string) => s.toLowerCase().replace(/[^a-z0-9+#.&/-]+/g," ").replace(/\s+/g," ").trim();
const tokens = (s:string) => [...new Set(normalize(s).split(" ").filter(x => x.length > 2 && !STOP.has(x)))];

function extractJson(raw:string){
  const cleaned=raw.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim();
  const start=cleaned.indexOf("{"); const end=cleaned.lastIndexOf("}");
  if(start<0||end<=start) throw new Error("No JSON object returned");
  return JSON.parse(cleaned.slice(start,end+1));
}

function localOptimize(resume:string, job:string){
  const r=normalize(resume); const j=normalize(job); const jobTokens=tokens(job); const resumeTokens=new Set(tokens(resume));
  const matched=jobTokens.filter(x=>resumeTokens.has(x)).slice(0,18);
  const missing=jobTokens.filter(x=>!resumeTokens.has(x)).slice(0,18);
  const score=Math.max(0,Math.min(100,Math.round((matched.length/Math.max(1,Math.min(jobTokens.length,18)))*100)));
  const strengths = matched.length ? [`The resume explicitly contains evidence related to: ${matched.slice(0,8).join(", ")}.`] : ["The resume was readable and could be compared against the target job."];
  const risks = missing.length ? [`The resume does not visibly contain these job terms: ${missing.slice(0,8).join(", ")}. Confirm whether they are genuinely applicable before adding them.`] : [];
  const edits = [
    "Mirror the job's exact terminology only where the resume already supports the same skill or responsibility.",
    "Move the strongest role-relevant evidence toward the top of the resume.",
    "Rewrite experience/project bullets as action + task + result, using measurable outcomes when the resume contains them.",
    missing.length ? `Review these missing terms and add only the ones you can substantiate: ${missing.slice(0,8).join(", ")}.` : "Add measurable outcomes to the strongest experience or project bullets.",
    "Keep education, certifications and dates consistent and easy for an ATS to parse."
  ];
  return {score,summary:`The resume has ${matched.length} directly overlapping job terms out of the comparison set. Use the gaps as a review list, not as facts to add automatically.`,matchedKeywords:matched,missingKeywords:missing,strengths,risks,prioritizedEdits:edits,rewrittenBullets:[]};
}

function normalizeResult(data:any){
  return {score:Math.max(0,Math.min(100,Number(data.score)||0)),summary:String(data.summary||""),matchedKeywords:Array.isArray(data.matchedKeywords)?data.matchedKeywords.map(String):[],missingKeywords:Array.isArray(data.missingKeywords)?data.missingKeywords.map(String):[],strengths:Array.isArray(data.strengths)?data.strengths.map(String):[],risks:Array.isArray(data.risks)?data.risks.map(String):[],prioritizedEdits:Array.isArray(data.prioritizedEdits)?data.prioritizedEdits.map(String):[],rewrittenBullets:Array.isArray(data.rewrittenBullets)?data.rewrittenBullets.map(String):[]};
}

export async function POST(req:NextRequest){
  let parsedText=""; let jobText="";
  try{
    const session=await auth(); if(!session?.user?.id) return NextResponse.json({success:false,error:"Sign in is required."},{status:401});
    const form=await req.formData(); const file=form.get("resume"); jobText=String(form.get("jobText")||"").trim();
    if(!(file instanceof File)||file.type!=="application/pdf") return NextResponse.json({success:false,error:"Upload a PDF resume."},{status:400});
    if(file.size>5*1024*1024) return NextResponse.json({success:false,error:"Resume must be smaller than 5 MB."},{status:400});
    if(!jobText) return NextResponse.json({success:false,error:"Job description is required."},{status:400});
    const parser=new PDFParse({data:Buffer.from(await file.arrayBuffer())});
    const parsed=await parser.getText(); await parser.destroy(); parsedText=parsed.text||"";
    if(!parsedText.trim()) return NextResponse.json({success:false,error:"We couldn't extract readable text from this PDF. Please upload a text-based PDF."},{status:422});

    const prompt=`You are an ATS and career-document optimizer for ANY profession. Compare the resume with the supplied job description. Never assume software. Never invent experience, qualifications, achievements or skills. Return ONLY one valid JSON object, with no markdown and no code fences, using exactly these keys: score (number), matchedKeywords (string[]), missingKeywords (string[]), strengths (string[]), risks (string[]), summary (string), prioritizedEdits (string[]), rewrittenBullets (string[]). Each prioritized edit must be concrete and tied to evidence in the resume/job. Rewritten bullets may only improve wording of facts already present. If the job asks for something absent from the resume, put it in missingKeywords rather than inventing it.\n\nRESUME:\n${parsedText.slice(0,30000)}\n\nJOB DESCRIPTION:\n${jobText.slice(0,30000)}`;
    try{
      const response=await getGeminiClient().models.generateContent({model:"gemini-2.5-flash",contents:[{text:prompt}]});
      const data=normalizeResult(extractJson(response.text||""));
      if(!data.summary || !data.prioritizedEdits.length) throw new Error("Incomplete optimizer response");
      return NextResponse.json({success:true,data,source:"ai"});
    }catch(aiError){
      console.warn("Resume optimizer AI unavailable/incomplete; using deterministic analysis.",aiError);
      return NextResponse.json({success:true,data:localOptimize(parsedText,jobText),source:"fallback"});
    }
  }catch(e){
    console.error("Resume optimizer failed",e);
    if(parsedText && jobText) return NextResponse.json({success:true,data:localOptimize(parsedText,jobText),source:"fallback"});
    return NextResponse.json({success:false,error:"We couldn't process this resume. Please use a readable PDF and try again."},{status:500});
  }
}
