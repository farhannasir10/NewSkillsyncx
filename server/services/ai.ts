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
          content: "You are an expert at creating detailed educational notes. For each key concept, provide a thorough explanation with examples. Format your response using markdown with proper headings, subheadings, and code examples where relevant."
        },
        {
          role: "user",
          content: `Generate comprehensive study notes from this video transcript. Include key points with detailed explanations and examples:\n\n${transcript}`
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
        // Return basic structured notes when AI is unavailable
        return `# Video Summary Notes

## 1. React Development Fundamentals
React is a JavaScript library for building user interfaces. Here's what you need to know:
- **Components**: Building blocks of React applications
- **Props**: Pass data between components
- **State**: Manage component data
- **Hooks**: Functions that let you use state and other React features

## 2. State Management
Understanding how to manage state is crucial in React:
- Use useState for local component state
- Consider useContext for global state
- Learn when to use external state management libraries

## 3. Form Handling
Best practices for handling forms in React:
- Controlled vs Uncontrolled components
- Form validation techniques
- Using form libraries like React Hook Form

## 4. API Integration
How to work with APIs in React:
- Fetch vs Axios
- Async/await patterns
- Error handling
- Loading states

## 5. Performance Optimization
Key techniques for optimizing React apps:
- Code splitting
- Lazy loading
- Memoization
- Virtual DOM understanding

## Additional Resources
- React official documentation: https://reactjs.org
- Community forums and Discord channels
- Practice exercises recommended

Note: AI-powered detailed notes are currently unavailable. These are basic structured notes with explanations.`;
      }
      if (error.message.includes("rate limit")) {
        throw new Error("Too many requests. Please wait a moment and try again.");
      }
    }
    throw new Error("Failed to generate notes. Please try again later.");
  }
}