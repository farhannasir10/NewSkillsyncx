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

export default function VideoPlayer({ videoId, playlistId }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [generatedNotes, setGeneratedNotes] = useState<string>("");
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
      // For demo purposes, we'll use a mock transcript
      const mockTranscript = `This comprehensive video covers key concepts in React development including:
      1. Component Architecture
      2. State Management with React Query
      3. Form Handling with React Hook Form
      4. Authentication Patterns
      5. API Integration Best Practices
      We discuss real-world implementation examples and common pitfalls to avoid.`;

      const res = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: mockTranscript }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate notes");
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
    let isMounted = true;

    if (!apiLoaded) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      apiLoaded = true;

      window.onYouTubeIframeAPIReady = () => {
        if (isMounted) {
          initPlayer();
        }
      };
    } else {
      initPlayer();
    }

    function initPlayer() {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      if (containerRef.current && !playerRef.current && window.YT?.Player) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          height: "400",
          width: "100%",
          videoId,
          playerVars: {
            playsinline: 1,
          },
          events: {
            onStateChange: (event: any) => {
              // Video ended
              if (event.data === 0) {
                completeMutation.mutate();
              }
            },
          },
        });
      }
    }

    return () => {
      isMounted = false;
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error("Failed to destroy player:", e);
        }
        playerRef.current = null;
      }
    };
  }, [videoId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <div ref={containerRef} />
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
}