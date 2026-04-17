import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDatabaseConfigured } from "@/db";
import {
  listConversations,
  createConversation,
} from "@/db/queries";

// GET /api/conversations - List all conversations for the authenticated user
export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured. Authentication disabled." },
        { status: 503 }
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await listConversations(session.user.id);

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured. Authentication disabled." },
        { status: 503 }
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await request.json();

    const conversation = await createConversation(session.user.id, title);

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
