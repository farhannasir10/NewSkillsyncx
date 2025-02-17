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

// Using the component
function App() {
  return (
    <div>
      <Welcome name="John" />
      <Welcome name="Sarah" />
    </div>
  );
}
\`\`\`

### Props
Props are read-only properties passed to components, enabling parent-to-child component communication.
\`\`\`jsx
// Component with multiple props
function UserCard({ name, role, avatar }) {
  return (
    <div className="card">
      <img src={avatar} alt={name} />
      <h2>{name}</h2>
      <p>{role}</p>
    </div>
  );
}

// Using props with default values
function Button({ type = "primary", children }) {
  return (
    <button className={\`button-\${type}\`}>
      {children}
    </button>
  );
}
\`\`\`

### State
State represents mutable data in a component that can change over time. When state changes, React re-renders the component.
\`\`\`jsx
function Counter() {
  // Basic state example
  const [count, setCount] = useState(0);

  // Multiple state variables
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
\`\`\`

### Hooks
Functions that let you use state and other React features in function components:
- useState: Manage local state
- useEffect: Handle side effects like data fetching
- useContext: Access context data
- useRef: Reference DOM elements
- useMemo/useCallback: Performance optimization

## 2. State Management in React
State management is crucial for handling data flow in React applications:

### Local Component State (useState)
For component-specific data that doesn't need to be shared:
\`\`\`jsx
function TodoList() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input }]);
      setInput('');
    }
  };

  return (
    <div>
      <input 
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button onClick={addTodo}>Add Todo</button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
}
\`\`\`

### Context API (useContext)
For sharing state between components without prop drilling:
\`\`\`jsx
// Create theme context
const ThemeContext = createContext('light');

// Provider component with state
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Consumer component
function ThemedButton() {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <button 
      className={theme}
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      Toggle Theme
    </button>
  );
}
\`\`\`

### State Management Libraries
For complex applications, consider using:
1. **Redux**: 
   - Centralized state management
   - Great for large applications
   - Strong dev tools and middleware support

2. **React Query**:
   - Perfect for server state management
   - Built-in caching and invalidation
   - Automatic background updates

3. **Zustand**:
   - Simple and lightweight
   - No boilerplate required
   - Great for small to medium apps

4. **Jotai**:
   - Atomic state management
   - Works well with React Suspense
   - Minimal API surface

## Additional Resources
- React official documentation: https://reactjs.org
- Community forums and Discord channels
- Practice exercises recommended

Note: These are structured notes with detailed explanations and examples to help you understand React concepts better.`;
      }
      if (error.message.includes("rate limit")) {
        throw new Error("Too many requests. Please wait a moment and try again.");
      }
    }
    throw new Error("Failed to generate notes. Please try again later.");
  }
}