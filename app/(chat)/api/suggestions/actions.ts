"use server";

import { auth } from "@/app/(auth)/auth";
import {
  deleteSuggestion,
  getSuggestionsByDocumentId,
  updateSuggestion,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function getDocumentSuggestions({
  documentId,
}: {
  documentId: string;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new ChatbotError(
      "unauthorized:suggestions",
      "User not authenticated"
    );
  }

  const suggestions = await getSuggestionsByDocumentId({ documentId });

  if (suggestions.length > 0 && suggestions[0].userId !== session.user.id) {
    throw new ChatbotError("forbidden:suggestions", "Access denied");
  }

  return suggestions;
}

export async function resolveSuggestion({
  id,
  accept = true,
}: {
  id: string;
  accept?: boolean;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new ChatbotError(
      "unauthorized:suggestions",
      "User not authenticated"
    );
  }

  const suggestions = await getSuggestionsByDocumentId({ documentId: id });

  if (suggestions.length > 0) {
    const suggestion = suggestions.find((s) => s.id === id);
    if (suggestion && suggestion.userId !== session.user.id) {
      throw new ChatbotError("forbidden:suggestions", "Access denied");
    }
  }

  return updateSuggestion({
    id,
    isResolved: accept,
  });
}

export async function applySuggestion({
  id,
  suggestedText,
}: {
  id: string;
  suggestedText: string;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new ChatbotError(
      "unauthorized:suggestions",
      "User not authenticated"
    );
  }

  const suggestions = await getSuggestionsByDocumentId({ documentId: id });

  if (suggestions.length > 0) {
    const suggestion = suggestions.find((s) => s.id === id);
    if (suggestion && suggestion.userId !== session.user.id) {
      throw new ChatbotError("forbidden:suggestions", "Access denied");
    }
  }

  return updateSuggestion({
    id,
    isResolved: true,
    suggestedText,
  });
}

export async function dismissSuggestion({ id }: { id: string }) {
  const session = await auth();
  if (!session?.user) {
    throw new ChatbotError(
      "unauthorized:suggestions",
      "User not authenticated"
    );
  }

  const suggestions = await getSuggestionsByDocumentId({ documentId: id });

  if (suggestions.length > 0) {
    const suggestion = suggestions.find((s) => s.id === id);
    if (suggestion && suggestion.userId !== session.user.id) {
      throw new ChatbotError("forbidden:suggestions", "Access denied");
    }
  }

  return deleteSuggestion({ id });
}
