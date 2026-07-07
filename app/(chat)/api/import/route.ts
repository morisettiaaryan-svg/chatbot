import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { saveDocument } from "@/lib/db/queries";
import type { ArtifactKind } from "@/components/chat/artifact";
import { ChatbotError } from "@/lib/errors";
import { generateUUID } from "@/lib/utils";

const importSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string(),
  kind: z.enum(["text", "code", "sheet", "image"]).default("text"),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:document").toResponse();
  }

  let title: string;
  let content: string;
  let kind: ArtifactKind;

  try {
    const body = await request.json();

    if (typeof body === "string") {
      content = body;
      title = "Imported Document";
      kind = "text";
    } else {
      const parsed = importSchema.parse(body);
      title = parsed.title;
      content = parsed.content;
      kind = parsed.kind;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatbotError(
        "bad_request:api",
        `Invalid request body: ${error.errors.map((e) => e.message).join(", ")}`
      ).toResponse();
    }
    return new ChatbotError(
      "bad_request:api",
      "Invalid request body"
    ).toResponse();
  }

  try {
    const id = generateUUID();

    const document = await saveDocument({
      id,
      title,
      content,
      kind,
      userId: session.user.id,
    });

    return Response.json(
      {
        id,
        title,
        kind,
        message: "Document imported successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    console.error("Failed to import document:", error);
    return new ChatbotError(
      "bad_request:database",
      "Failed to import document"
    ).toResponse();
  }
}
