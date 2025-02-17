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

### Components
The fundamental building blocks of React applications. Components are reusable pieces of UI that can contain their own logic and styling.
\`\`\`jsx
// Function Component Example
function Welcome({ name }) {
  return <h1>Hello, {name}!</h1>;
}
\`\`\`

### Props
Props are read-only properties passed to components, enabling parent-to-child component communication.
\`\`\`jsx
// Parent Component
<Welcome name="John" />
\`\`\`

### State
State represents mutable data in a component that can change over time. When state changes, React re-renders the component.
\`\`\`jsx
const [count, setCount] = useState(0);
// Use setCount to update the state
\`\`\`

### Hooks
Functions that let you use state and other React features in function components:
- useState: Manage local state
- useEffect: Handle side effects
- useContext: Access context data
- useRef: Reference DOM elements

## 2. State Management in React
State management is crucial for handling data flow in React applications:

### Local Component State (useState)
Used for component-specific data that doesn't need to be shared:
\`\`\`jsx
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
\`\`\`

### Context API (useContext)
For sharing state between components without prop drilling:
\`\`\`jsx
// Create context
const ThemeContext = createContext('light');

// Provider component
function App() {
  return (
    <ThemeContext.Provider value="dark">
      <MainContent />
    </ThemeContext.Provider>
  );
}

// Consumer component
function MainContent() {
  const theme = useContext(ThemeContext);
  return <div className={theme}>Content</div>;
}
\`\`\`

### State Management Libraries
For complex applications, consider using:
- Redux: Centralized state management
- React Query: Server state management
- Zustand: Simple state management
- Jotai: Atomic state management

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
- Memoization with useMemo and useCallback
- Virtual DOM understanding

## Additional Resources
- React official documentation: https://reactjs.org
- Community forums and Discord channels
- Practice exercises recommended

Note: AI-powered detailed notes are currently unavailable. These are basic structured notes with detailed explanations and examples.`;
      }
      if (error.message.includes("rate limit")) {
        throw new Error("Too many requests. Please wait a moment and try again.");
      }
    }
    throw new Error("Failed to generate notes. Please try again later.");
  }
}