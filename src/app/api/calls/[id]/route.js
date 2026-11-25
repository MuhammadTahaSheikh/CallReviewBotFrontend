import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { getCallById } from "../../../../lib/services/analyze-call";

export async function GET(_request, { params }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const call = await getCallById(id, { appUser: auth.appUser });
    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const payload = {
      ...call,
      analysis: call.analysis
        ? {
            ...call.analysis,
            strengths: JSON.parse(call.analysis.strengths || "[]"),
            weaknesses: JSON.parse(call.analysis.weaknesses || "[]"),
            recommendations: JSON.parse(call.analysis.recommendations || "[]"),
            followUpOpportunities: JSON.parse(call.analysis.followUpOpportunities || "[]"),
            risks: JSON.parse(call.analysis.risks || "[]"),
            missingInformation: JSON.parse(call.analysis.missingInformation || "[]"),
            proposedActions: JSON.parse(call.analysis.proposedActions || "[]"),
          }
        : null,
      scoringProfile: call.scoringProfile
        ? {
            ...call.scoringProfile,
            categories: JSON.parse(call.scoringProfile.categories || "[]"),
          }
        : null,
    };

    return NextResponse.json({ call: payload });
  } catch (error) {
    console.error("GET /api/calls/[id]", error);
    return NextResponse.json({ error: "Failed to load call" }, { status: 500 });
  }
}
