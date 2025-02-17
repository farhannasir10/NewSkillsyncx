import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required for AI features");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const getFallbackNotes = (transcript: string) => {
  // Generate structured notes based on video ID patterns
  const topics = transcript.split('\n').filter(line => line.trim().length > 0);

  return `# Video Summary Notes

## Key Topics Covered
${topics.map(topic => `- ${topic}`).join('\n')}

## Study Resources
- Practice exercises provided in video
- Code examples and demonstrations
- Related documentation links

## Next Steps
- Review the concepts covered
- Try the practical exercises
- Join the community discussions

Note: These are automated study notes. For personalized AI-generated notes, please try again later.`;
};

export async function generateVideoNotes(transcript: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert at creating detailed educational notes. For each key concept, provide a thorough explanation with examples. Format your response using markdown with proper headings, subheadings, and code examples where relevant."
        },
        {
          role: "user",
          content: `Generate comprehensive study notes from this video transcript. Include key points with detailed explanations and examples:\n\n${transcript}`
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || getFallbackNotes(transcript);
  } catch (error) {
    console.error("AI notes generation failed:", error);
    return getFallbackNotes(transcript);
  }
}