import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { getDocumentsByUserId } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const parsed = querySchema.safeParse({
    limit: searchParams.get("limit"),
    starting_after: searchParams.get("starting_after"),
    ending_before: searchParams.get("ending_before"),
  });

  if (!parsed.success) {
    return new ChatbotError(
      "bad_request:api",
      "Invalid query parameters"
    ).toResponse();
  }

  const { limit, starting_after, ending_before } = parsed.data;

  if (starting_after && ending_before) {
    return new ChatbotError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided"
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:document").toResponse();
  }

  try {
    const result = await getDocumentsByUserId({
      userId: session.user.id,
      limit,
      startingAfter: starting_after ?? null,
      endingBefore: ending_before ?? null,
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    console.error("Failed to get documents:", error);
    return new ChatbotError(
      "bad_request:database",
      "Failed to retrieve documents"
    ).toResponse();
  }
}
