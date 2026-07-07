import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import {
  deleteSuggestion,
  getSuggestionsByDocumentId,
  updateSuggestion,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

const updateSchema = z.object({
  id: z.string().uuid(),
  isResolved: z.boolean().optional(),
  suggestedText: z.string().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return new ChatbotError(
      "bad_request:api",
      "Parameter documentId is required."
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:suggestions").toResponse();
  }

  const suggestions = await getSuggestionsByDocumentId({
    documentId,
  });

  const [suggestion] = suggestions;

  if (!suggestion) {
    return Response.json([], { status: 200 });
  }

  if (suggestion.userId !== session.user.id) {
    return new ChatbotError("forbidden:api").toResponse();
  }

  return Response.json(suggestions, { status: 200 });
}

export async function PATCH(request: Request) {
  let id: string;
  let isResolved: boolean | undefined;
  let suggestedText: string | undefined;

  try {
    const parsed = updateSchema.parse(await request.json());
    id = parsed.id;
    isResolved = parsed.isResolved;
    suggestedText = parsed.suggestedText;
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body. Required: id (uuid)"
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:suggestions").toResponse();
  }

  const suggestions = await getSuggestionsByDocumentId({
    documentId: id,
  });

  if (suggestions.length > 0 && suggestions[0].userId !== session.user.id) {
    return new ChatbotError("forbidden:api").toResponse();
  }

  try {
    const updated = await updateSuggestion({
      id,
      isResolved,
      suggestedText,
    });

    return Response.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    console.error("Failed to update suggestion:", error);
    return new ChatbotError(
      "bad_request:database",
      "Failed to update suggestion"
    ).toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError(
      "bad_request:api",
      "Parameter id is required."
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:suggestions").toResponse();
  }

  const suggestions = await getSuggestionsByDocumentId({
    documentId: id,
  });

  if (suggestions.length > 0 && suggestions[0].userId !== session.user.id) {
    return new ChatbotError("forbidden:api").toResponse();
  }

  try {
    await deleteSuggestion({ id });
    return new Response("Suggestion deleted", { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    console.error("Failed to delete suggestion:", error);
    return new ChatbotError(
      "bad_request:database",
      "Failed to delete suggestion"
    ).toResponse();
  }
}
