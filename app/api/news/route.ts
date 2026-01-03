import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/news
 * Retrieve world news entries
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "News endpoint - GET",
    status: "stub",
    data: [],
  });
}
