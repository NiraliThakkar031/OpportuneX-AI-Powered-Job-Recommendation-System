import { NextResponse } from "next/server";
import { SOURCE_REGISTRY } from "@/lib/sources/registry";
export async function GET() { return NextResponse.json({ success:true, sources:SOURCE_REGISTRY }); }
