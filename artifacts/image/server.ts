import { smoothStream, streamText } from "ai";
import { generateImage, type UIMessageStreamWriter } from "ai";
import { gateway, imageModel } from "ai";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { createDocumentHandler } from "@/lib/artifacts/server";
import type { ChatMessage } from "@/lib/types";

export const imageDocumentHandler = createDocumentHandler<"image">({
  kind: "image",
  onCreateDocument: async ({ title, dataStream, modelId: _modelId }) => {
    let draftContent = "";

    try {
      const model = imageModel(gateway, "gpt-image-1");

      const { fullStream } = generateImage({
        model,
        prompt: title,
        providerOptions: {
          openai: {
            n: 1,
            style: "vivid",
            size: "1024x1024",
          },
        },
      });

      for await (const delta of fullStream) {
        if (delta.type === "image-base64") {
          draftContent = delta.imageBase64;
          dataStream.write({
            type: "data-imageDelta",
            data: delta.imageBase64,
            transient: true,
          });
        } else if (delta.type === "image-url") {
          draftContent = delta.imageUrl;
          dataStream.write({
            type: "data-imageDelta",
            data: delta.imageUrl,
            transient: true,
          });
        }
      }
    } catch (error) {
      console.error("Image generation error:", error);

      const { fullStream } = streamText({
        model: gateway.languageModel("gpt-4o"),
        system:
          "Generate a detailed image prompt based on the user's request. The prompt should be optimized for AI image generation and describe the scene, lighting, style, and composition in detail.",
        prompt: title,
        experimental_transform: smoothStream({ chunking: "word" }),
      });

      for await (const delta of fullStream) {
        if (delta.type === "text-delta") {
          draftContent += delta.text;
        }
      }

      dataStream.write({
        type: "data-textDelta",
        data: `Image prompt generated: ${draftContent}`,
        transient: true,
      });
    }

    return draftContent;
  },
  onUpdateDocument: async ({
    document,
    description,
    dataStream,
    modelId: _modelId,
  }) => {
    let draftContent = "";

    try {
      const model = imageModel(gateway, "gpt-image-1");

      const prompt = `${document.content}\n\nModification request: ${description}`;

      const { fullStream } = generateImage({
        model,
        prompt,
        providerOptions: {
          openai: {
            n: 1,
            style: "vivid",
            size: "1024x1024",
          },
        },
      });

      for await (const delta of fullStream) {
        if (delta.type === "image-base64") {
          draftContent = delta.imageBase64;
          dataStream.write({
            type: "data-imageDelta",
            data: delta.imageBase64,
            transient: true,
          });
        } else if (delta.type === "image-url") {
          draftContent = delta.imageUrl;
          dataStream.write({
            type: "data-imageDelta",
            data: delta.imageUrl,
            transient: true,
          });
        }
      }
    } catch (error) {
      console.error("Image regeneration error:", error);

      const { fullStream } = streamText({
        model: gateway.languageModel("gpt-4o"),
        system: updateDocumentPrompt(document.content, "image"),
        prompt: description,
      });

      for await (const delta of fullStream) {
        if (delta.type === "text-delta") {
          draftContent += delta.text;
        }
      }

      dataStream.write({
        type: "data-textDelta",
        data: `Image modification prompt generated: ${draftContent}`,
        transient: true,
      });
    }

    return draftContent;
  },
});
