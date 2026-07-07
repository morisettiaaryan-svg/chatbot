import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { imageDocumentHandler } from "@/artifacts/image/server";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

type CreateImageProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const createImage = ({
  session,
  dataStream,
}: CreateImageProps) =>
  tool({
    description:
      "Create an image artifact. Use this when the user wants to generate an image, illustration, artwork, or visual content.",
    inputSchema: z.object({
      title: z.string().describe("A detailed description of the image to generate"),
    }),
    execute: async ({ title }) => {
      const id = generateUUID();

      dataStream.write({
        type: "data-kind",
        data: "image",
        transient: true,
      });

      dataStream.write({
        type: "data-id",
        data: id,
        transient: true,
      });

      dataStream.write({
        type: "data-title",
        data: title,
        transient: true,
      });

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      await imageDocumentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        session,
        modelId: "",
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title,
        kind: "image" as const,
        content: "An image was generated and is now visible to the user.",
      };
    },
  });
