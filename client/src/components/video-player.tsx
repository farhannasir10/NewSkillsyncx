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

export const VideoPlayer = ({ videoId, playlistId }: VideoPlayerProps) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
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
      // Unique mock transcripts based on videoId
      const mockTranscripts: Record<string, string> = {
        "video1": `
          React Components and Props
          - Understanding component lifecycle
          - Props vs State comparison
          - Component composition patterns
          - Best practices for component design
          - Practical exercises and examples`,
        "video2": `
          State Management Deep Dive
          - Local state with useState
          - Context API implementation
          - Redux architecture overview
          - State management patterns
          - Performance considerations`,
        "video3": `
          React Hooks in Practice
          - Common hooks explained
          - Custom hook patterns
          - useEffect dependencies
          - Hook optimization strategies
          - Real-world examples`,
      };

      const transcript = mockTranscripts[videoId] || `
        Video Content Overview for ${videoId}:
        - Key concepts and principles
        - Implementation strategies
        - Best practices and patterns
        - Common pitfalls to avoid
        - Practical examples and exercises
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
    // Load YouTube API
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    let player: any = null;

    // Initialize player when API is ready
    const initializePlayer = () => {
      if (!playerContainerRef.current) return;

      // Clear any existing content
      playerContainerRef.current.innerHTML = "";

      // Create a new div for the player
      const playerElement = document.createElement("div");
      playerContainerRef.current.appendChild(playerElement);

      try {
        player = new window.YT.Player(playerElement, {
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
            onReady: () => setPlayerError(""),
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                completeMutation.mutate();
              }
            },
            onError: (event: any) => {
              const errors: Record<number, string> = {
                2: "This video ID is invalid. Please check the video ID and try again.",
                5: "HTML5 player error. Please try refreshing the page.",
                100: "This video was not found or has been removed from YouTube.",
                101: "This video cannot be played in an embedded player.",
                150: "This video cannot be played in an embedded player.",
              };
              setPlayerError(errors[event.data] || "An error occurred while playing the video. Please try again.");
              console.error("YouTube player error:", event.data);
            },
          },
        });
      } catch (error) {
        console.error("Error initializing player:", error);
        setPlayerError("Failed to initialize video player");
      }
    };

    // Create or update player when API is ready
    if (window.YT && window.YT.Player) {
      initializePlayer();
    } else {
      window.onYouTubeIframeAPIReady = initializePlayer;
    }

    // Cleanup
    return () => {
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = "";
      }
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
            <div ref={playerContainerRef} className="w-full h-full" />
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