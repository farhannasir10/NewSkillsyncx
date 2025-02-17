import OpenAI from "openai";

const openai = new OpenAI();

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
    throw new Error("Failed to generate notes. Please try again later.");
  }
}
