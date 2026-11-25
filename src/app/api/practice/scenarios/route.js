import { NextResponse } from "next/server";
import { listPracticeScenarios } from "../../../../lib/practice/session-service";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const callType = searchParams.get("callType") || "all";
    const scenarios = listPracticeScenarios({ callType });
    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error("GET /api/practice/scenarios", error);
    return NextResponse.json({ error: "Failed to load scenarios" }, { status: 500 });
  }
}
