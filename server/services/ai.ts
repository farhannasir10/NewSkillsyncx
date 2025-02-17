import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required for AI features");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const getFallbackNotes = (transcript: string) => {
  const topics = transcript.split('\n')
    .filter(line => line.trim().length > 0)
    .map(topic => topic.trim());

  const getExplanation = (topic: string) => {
    // Common explanations for React-related topics
    const explanations: Record<string, string> = {
      'Components': 'Building blocks of React applications that encapsulate UI and logic. They can be either function components or class components. Components improve code reusability and maintainability.',
      'Props': 'Read-only properties passed to components that allow parent-to-child communication. Props enable component customization and data flow management.',
      'State': 'Mutable data storage within components that triggers re-rendering when changed. Managed using useState hook in functional components.',
      'Hooks': 'Functions that enable state and lifecycle features in functional components. Common hooks include useState, useEffect, useContext, and useRef.',
      'Effects': 'Side effects in components handled by useEffect hook. Used for data fetching, subscriptions, and DOM manipulations.',
      'Context': 'Global state management solution to avoid prop drilling. Provides a way to share data between components without passing props.',
      'Routing': 'Navigation management in React apps using React Router. Enables multiple pages and deep linking.',
      'Forms': 'User input handling in React using controlled or uncontrolled components. Includes validation and submission logic.',
      'API Integration': 'Connecting React apps to backend services using fetch or axios. Includes data fetching, error handling, and state updates.',
      'Performance': 'Optimization techniques like useMemo, useCallback, and React.memo to prevent unnecessary renders.',
      'Testing': 'Writing tests for React components using Jest and React Testing Library. Includes unit tests and integration tests.',
      'Styling': 'CSS management in React using CSS modules, styled-components, or other CSS-in-JS solutions.',
      'Authentication': 'User authentication and authorization implementation in React apps. Includes login, logout, and protected routes.',
      'State Management': 'Global state handling using solutions like Redux, Context API, or other state management libraries.',
      'Deployment': 'Publishing React apps to production environments. Includes build optimization and environment configuration.'
    };

    // Return custom explanation or generate one based on topic
    return explanations[topic] || `${topic} - Understanding core concepts, implementation details, and best practices for effective development.`;
  };

  return `# Video Summary Notes

## Key Topics Covered with Explanations

${topics.map(topic => `### ${topic}
${getExplanation(topic)}

**Key Points:**
- Implementation strategies and patterns
- Common pitfalls and solutions
- Best practices for production use
- Integration with other features
`).join('\n\n')}

## Study Resources
- Practice exercises provided in video
- Code examples and demonstrations
- Related documentation links
- Community resources and discussions

## Next Steps
- Review and practice each concept
- Build sample projects using these concepts
- Join community discussions
- Explore advanced implementations

Note: These are automated study notes with general explanations. For personalized AI-generated notes, please try again later.`;
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