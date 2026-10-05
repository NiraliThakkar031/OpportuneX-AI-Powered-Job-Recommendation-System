import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(){
  try{const session=await auth(); if(!session?.user?.id)return NextResponse.json({success:false,error:"Guest"},{status:401}); const rows=await prisma.interviewAttempt.findMany({where:{userId:session.user.id},orderBy:{takenAt:"desc"},take:12}); return NextResponse.json({success:true,history:rows.map(x=>({id:x.id,domain:x.domain,score:x.score,total:x.total,takenAt:x.takenAt.toISOString()}))});}
  catch(e){console.error("Interview history load failed",e);return NextResponse.json({success:false,error:"Unable to load interview history."},{status:500})}
}
export async function POST(req:Request){
  try{const session=await auth(); if(!session?.user?.id)return NextResponse.json({success:false,error:"Guest"},{status:401}); const body=await req.json(); const domain=String(body.domain||"General").slice(0,160); const score=Math.max(0,Math.round(Number(body.score)||0)); const total=Math.max(1,Math.round(Number(body.total)||10)); const row=await prisma.interviewAttempt.create({data:{userId:session.user.id,domain,score,total}}); return NextResponse.json({success:true,historyEntry:{id:row.id,domain:row.domain,score:row.score,total:row.total,takenAt:row.takenAt.toISOString()}});}
  catch(e){console.error("Interview history save failed",e);return NextResponse.json({success:false,error:"Unable to save interview history."},{status:500})}
}
