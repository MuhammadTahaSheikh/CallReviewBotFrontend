import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireUser } from "../../../lib/auth";
import { analyzeAndStoreCall, listCalls } from "../../../lib/services/analyze-call";

export async function GET(request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const calls = await listCalls({
      q: searchParams.get("q") || "",
      callType: searchParams.get("callType") || "all",
      risk: searchParams.get("risk") || "all",
      status: searchParams.get("status") || "all",
      source: searchParams.get("source") || "all",
      limit: searchParams.get("limit") || 100,
      ownerUserId: auth.appUser.isAdmin ? undefined : auth.appUser.id,
    });
    return NextResponse.json({ calls, viewer: auth.appUser });
  } catch (error) {
    console.error("GET /api/calls", error);
    return NextResponse.json({ error: "Failed to list calls" }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const result = await analyzeAndStoreCall(body, { ownerUserId: auth.appUser.id });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues || error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/calls", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
