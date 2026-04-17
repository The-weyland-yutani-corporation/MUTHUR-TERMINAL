import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDatabaseConfigured } from "@/db";
import {
  getConversation,
  deleteConversation,
  updateConversationTitle,
  setActiveConversation,
  getMessages,
} from "@/db/queries";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id] - Get a specific conversation with messages
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id } = await context.params;
    const conversation = await getConversation(id, session.user.id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const messages = await getMessages(id);

    return NextResponse.json({ conversation, messages });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[id] - Update conversation (title or set active)
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id } = await context.params;
    const body = await request.json();

    if (body.title !== undefined) {
      const conversation = await updateConversationTitle(
        id,
        session.user.id,
        body.title
      );
      return NextResponse.json({ conversation });
    }

    if (body.setActive === true) {
      const conversation = await setActiveConversation(id, session.user.id);
      return NextResponse.json({ conversation });
    }

    return NextResponse.json({ error: "Invalid update request" }, { status: 400 });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete a conversation
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id } = await context.params;
    await deleteConversation(id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
