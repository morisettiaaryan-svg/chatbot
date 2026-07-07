import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { getDocumentById } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

const querySchema = z.object({
  id: z.string(),
  format: z.enum(["json", "md", "txt", "csv"]).optional().default("json"),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parsed = querySchema.safeParse({
    id: searchParams.get("id"),
    format: searchParams.get("format"),
  });

  if (!parsed.success) {
    return new ChatbotError(
      "bad_request:api",
      "Invalid parameters. Required: id"
    ).toResponse();
  }

  const { id, format } = parsed.data;

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:document").toResponse();
  }

  try {
    const document = await getDocumentById({ id });

    if (!document) {
      return new ChatbotError("not_found:document").toResponse();
    }

    if (document.userId !== session.user.id) {
      return new ChatbotError("forbidden:document").toResponse();
    }

    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "md":
        content = document.content ?? "";
        contentType = "text/markdown";
        filename = `${document.title}.md`;
        break;

      case "txt":
        content = document.content ?? "";
        contentType = "text/plain";
        filename = `${document.title}.txt`;
        break;

      case "csv":
        if (document.kind === "sheet") {
          content = document.content ?? "";
        } else {
          content = document.content ?? "";
        }
        contentType = "text/csv";
        filename = `${document.title}.csv`;
        break;

      case "json":
      default:
        content = JSON.stringify(
          {
            id: document.id,
            title: document.title,
            kind: document.kind,
            content: document.content,
            createdAt: document.createdAt,
          },
          null,
          2
        );
        contentType = "application/json";
        filename = `${document.title}.json`;
        break;
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

    return new Response(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${sanitizedFilename}"`,
      },
    });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    console.error("Failed to export document:", error);
    return new ChatbotError(
      "bad_request:database",
      "Failed to export document"
    ).toResponse();
  }
}
