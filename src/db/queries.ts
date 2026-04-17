import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./index";
import { conversations, messages } from "./schema";

// ── Conversation Operations ──

export async function createConversation(userId: string, title?: string) {
  const db = getDb();

  // Set all other conversations for this user as inactive
  await db
    .update(conversations)
    .set({ isActive: false })
    .where(eq(conversations.userId, userId));

  // Create new active conversation
  const [conversation] = await db
    .insert(conversations)
    .values({
      userId,
      title: title || `Session ${new Date().toISOString().split("T")[0]}`,
      isActive: true,
    })
    .returning();

  return conversation;
}

export async function getConversation(conversationId: string, userId: string) {
  const db = getDb();

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    )
    .limit(1);

  return conversation;
}

export async function listConversations(userId: string, limit = 50) {
  const db = getDb();

  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);
}

export async function getActiveConversation(userId: string) {
  const db = getDb();

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.userId, userId), eq(conversations.isActive, true))
    )
    .limit(1);

  return conversation;
}

export async function setActiveConversation(conversationId: string, userId: string) {
  const db = getDb();

  // Verify ownership
  const conversation = await getConversation(conversationId, userId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Set all conversations inactive
  await db
    .update(conversations)
    .set({ isActive: false })
    .where(eq(conversations.userId, userId));

  // Set target as active
  await db
    .update(conversations)
    .set({ isActive: true })
    .where(eq(conversations.id, conversationId));

  return conversation;
}

export async function deleteConversation(conversationId: string, userId: string) {
  const db = getDb();

  // Verify ownership
  const conversation = await getConversation(conversationId, userId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Delete conversation (messages will cascade)
  await db
    .delete(conversations)
    .where(eq(conversations.id, conversationId));

  return { success: true };
}

export async function updateConversationTitle(
  conversationId: string,
  userId: string,
  title: string
) {
  const db = getDb();

  // Verify ownership
  const conversation = await getConversation(conversationId, userId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const [updated] = await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))
    .returning();

  return updated;
}

// ── Message Operations ──

export async function createMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string
) {
  const db = getDb();

  // Get the next order index
  const existingMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId));

  const nextIndex = existingMessages.length;

  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      role,
      content,
      orderIndex: nextIndex,
    })
    .returning();

  // Update conversation timestamp
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return message;
}

export async function getMessages(conversationId: string) {
  const db = getDb();

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.orderIndex);
}

export async function deleteAllMessages(conversationId: string) {
  const db = getDb();

  await db.delete(messages).where(eq(messages.conversationId, conversationId));

  return { success: true };
}
