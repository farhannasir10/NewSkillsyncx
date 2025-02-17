import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required for AI features");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateVideoNotes(transcript: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert at creating concise, well-structured educational notes. Format your response using markdown."
        },
        {
          role: "user",
          content: `Generate comprehensive study notes from this video transcript. Include key points, concepts, and examples:\n\n${transcript}`
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Failed to generate notes.";
  } catch (error) {
    console.error("AI notes generation failed:", error);
    if (error instanceof Error) {
      // Handle specific OpenAI API errors
      if (error.message.includes("API key")) {
        throw new Error("Invalid OpenAI API key. Please check your configuration.");
      }
      if (error.message.includes("quota")) {
        throw new Error("AI service quota exceeded. Please try again later.");
      }
      if (error.message.includes("rate limit")) {
        throw new Error("Too many requests. Please wait a moment and try again.");
      }
    }
    throw new Error("Failed to generate notes. Please try again later.");
  }
}