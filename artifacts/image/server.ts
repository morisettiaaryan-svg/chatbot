import { smoothStream, streamText } from "ai";
import { generateImage } from "ai";
import { gateway } from "ai";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const imageDocumentHandler = createDocumentHandler<"image">({
  kind: "image",
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = "";

    try {
      const model = gateway.imageModel("gpt-image-1");

      const result = await generateImage({
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

      if (result.images.length > 0) {
        const image = result.images[0];
        draftContent = image.base64;
        dataStream.write({
          type: "data-imageDelta",
          data: image.base64,
          transient: true,
        });
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
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = "";

    try {
      const model = gateway.imageModel("gpt-image-1");

      const prompt = `${document.content}\n\nModification request: ${description}`;

      const result = await generateImage({
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

      if (result.images.length > 0) {
        const image = result.images[0];
        draftContent = image.base64;
        dataStream.write({
          type: "data-imageDelta",
          data: image.base64,
          transient: true,
        });
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
