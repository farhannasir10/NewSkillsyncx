
import { openai } from "./openai.ts";

const getFallbackNotes = (transcript: string): string => {
  // Extract topic from transcript
  const topics = transcript.split('\n')
    .filter(line => line.trim().length > 0)
    .slice(0, 3)
    .map(line => line.trim());

  const getCodeExample = (topic: string) => {
    const examples: Record<string, string> = {
      'Web Development': `
\`\`\`javascript
// Example React Component
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
\`\`\``,
      'Data Structures': `
\`\`\`python
# Binary Search Tree Implementation
class Node:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None
\`\`\``,
      'Algorithms': `
\`\`\`python
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)
\`\`\``,
      'Machine Learning': `
\`\`\`python
# Simple Linear Regression
from sklearn.linear_model import LinearRegression
model = LinearRegression()
model.fit(X_train, y_train)
predictions = model.predict(X_test)
\`\`\``,
      'DevOps': `
\`\`\`yaml
# Docker Compose Example
version: '3'
services:
  web:
    build: .
    ports:
      - "3000:3000"
  db:
    image: postgres
\`\`\``,
    };
    return examples[topic] || '```\nCode example will be generated based on video content\n```';
  };

  const getKeyPoints = (topic: string) => {
    const points: Record<string, string[]> = {
      'Web Development': [
        'Component lifecycle and state management',
        'API integration patterns',
        'Performance optimization techniques'
      ],
      'Data Structures': [
        'Time complexity analysis',
        'Memory usage considerations',
        'Implementation trade-offs'
      ],
      'Algorithms': [
        'Algorithm complexity (Big O)',
        'Space-time trade-offs',
        'Optimization strategies'
      ]
    };
    return points[topic] || ['Key concepts covered in video', 'Implementation details', 'Best practices'];
  };

  return `# Video Notes

${topics.map(topic => `
## ${topic}

### Key Concepts
${getKeyPoints(topic).map(point => `- ${point}`).join('\n')}

### Code Example
${getCodeExample(topic)}

### Important Calculations
- Time Complexity: Discussed in video
- Space Complexity: Analyzed with examples
- Performance Metrics: Covered with benchmarks

### Practice Exercise
Try implementing the above example with these modifications:
1. Add error handling
2. Optimize performance
3. Add additional features
`).join('\n')}

### Summary
- Review code implementation
- Practice exercises
- Check documentation for advanced features
`;
};

export async function generateVideoNotes(transcript: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Generate technical notes with code examples, key concepts, and calculations. Focus on practical implementation details."
        },
        {
          role: "user",
          content: `Create technical notes with code examples for: ${transcript}`
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
