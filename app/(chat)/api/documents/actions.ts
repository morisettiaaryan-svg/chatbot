"use server";

import { auth } from "@/app/(auth)/auth";
import type { ArtifactKind } from "@/components/chat/artifact";
import {
  deleteDocumentById,
  getDocumentById,
  getDocumentsByUserId,
  updateDocumentContent,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function getUserDocuments({
  limit = 20,
  startingAfter = null,
  endingBefore = null,
}: {
  limit?: number;
  startingAfter?: string | null;
  endingBefore?: string | null;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new ChatbotError("unauthorized:document", "User not authenticated");
  }

  return getDocumentsByUserId({
    userId: session.user.id,
    limit,
    startingAfter: startingAfter ?? null,
    endingBefore: endingBefore ?? null,
  });
}

export async function getDocument({
  id,
}: {
  id: string;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new ChatbotError("unauthorized:document", "User not authenticated");
  }

  const document = await getDocumentById({ id });

  if (!document) {
    throw new ChatbotError("not_found:document", "Document not found");
  }

  if (document.userId !== session.user.id) {
    throw new ChatbotError("forbidden:document", "Access denied");
  }

  return document;
}

export async function updateDocumentTitle({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new ChatbotError("unauthorized:document", "User not authenticated");
  }

  const document = await getDocumentById({ id });

  if (!document) {
    throw new ChatbotError("not_found:document", "Document not found");
  }

  if (document.userId !== session.user.id) {
    throw new ChatbotError("forbidden:document", "Access denied");
  }

  return updateDocumentContent({
    id,
    content: document.content ?? "",
  });
}

export async function removeDocument({ id }: { id: string }) {
  const session = await auth();
  if (!session?.user) {
    throw new ChatbotError("unauthorized:document", "User not authenticated");
  }

  const document = await getDocumentById({ id });

  if (!document) {
    throw new ChatbotError("not_found:document", "Document not found");
  }

  if (document.userId !== session.user.id) {
    throw new ChatbotError("forbidden:document", "Access denied");
  }

  return deleteDocumentById({ id });
}
