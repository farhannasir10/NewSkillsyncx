import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VideoPlayerProps {
  videoId: string;
  playlistId: number;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiLoaded = false;

export const VideoPlayer = ({ videoId, playlistId }: VideoPlayerProps) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const [generatedNotes, setGeneratedNotes] = useState<string>("");
  const [playerError, setPlayerError] = useState<string>("");
  const { toast } = useToast();

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/progress/${playlistId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
        credentials: "include",
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([`/api/progress/${playlistId}`], data.progress);
      queryClient.setQueryData(["/api/user"], data.user);
    },
  });

  const generateNotesMutation = useMutation({
    mutationFn: async () => {
      // Create unique mock transcripts based on videoId
      const mockTranscripts: { [key: string]: string } = {
        "video1": "Introduction to React Fundamentals covering components, props, and state management. This lecture focuses on building a strong foundation in React development.",
        "video2": "Advanced State Management in React exploring Context API, Redux, and other state management solutions. Includes practical examples and best practices.",
        "video3": "React Performance Optimization discussing key techniques like useMemo, useCallback, and React.memo. Learn how to identify and fix performance bottlenecks.",
        "default": "This video covers essential development concepts and practical implementations. Topics include best practices, common patterns, and real-world examples."
      };

      const transcript = `
        ${mockTranscripts[videoId] || mockTranscripts.default}

        Key Topics Covered:
        1. Core concepts and fundamentals
        2. Practical implementation examples
        3. Best practices and patterns
        4. Common challenges and solutions
        5. Real-world use cases

        Video ID: ${videoId}
        Additional Resources:
        - Code examples and documentation
        - Practice exercises
        - Related tutorials and guides
      `;

      const res = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate notes");
      }

      const data = await res.json();
      return data.notes;
    },
    onSuccess: (notes) => {
      setGeneratedNotes(notes);
      toast({
        title: "Success",
        description: "Notes generated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (!apiLoaded) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        apiLoaded = true;
      }
    };

    const createPlayer = () => {
      if (!playerRef.current) return;

      try {
        return new window.YT.Player(playerRef.current, {
          videoId,
          height: "400",
          width: "100%",
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                completeMutation.mutate();
              }
            },
            onError: (event: any) => {
              const errors: Record<number, string> = {
                2: "Invalid video ID",
                5: "HTML5 player error",
                100: "Video not found",
                101: "Embedded playback not allowed",
                150: "Embedded playback not allowed",
              };
              setPlayerError(errors[event.data] || "An error occurred playing the video");
            },
            onReady: () => {
              setPlayerError("");
            },
          },
        });
      } catch (error) {
        console.error("Error creating YouTube player:", error);
        setPlayerError("Failed to initialize video player");
        return null;
      }
    };

    const initializePlayer = () => {
      if (window.YT && window.YT.Player) {
        createPlayer();
      } else {
        window.onYouTubeIframeAPIReady = () => {
          createPlayer();
        };
        loadYouTubeAPI();
      }
    };

    initializePlayer();

    return () => {
      // Cleanup
    };
  }, [videoId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        {playerError ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            {playerError}
          </div>
        ) : (
          <div className="aspect-video">
            <div ref={playerRef} className="w-full h-full" />
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => generateNotesMutation.mutate()}
            disabled={generateNotesMutation.isPending}
            className="gap-2"
          >
            {generateNotesMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Generate Video Notes
          </Button>
        </div>
      </div>
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              AI Study Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] overflow-y-auto prose prose-sm dark:prose-invert">
            {generatedNotes ? (
              <ReactMarkdown>{generatedNotes}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">
                Click the "Generate Video Notes" button to create study notes for this video.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};