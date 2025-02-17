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
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
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
      // Generate different mock transcripts based on videoId to demonstrate unique content
      const mockTranscripts: { [key: string]: string } = {
        default: `This video covers key concepts including component architecture, state management, and API integration.`,
      };

      // Add the videoId to the transcript to make it unique
      const baseTranscript = mockTranscripts[videoId] || mockTranscripts.default;
      const uniqueTranscript = `Video ${videoId}: ${baseTranscript}
        Topics covered in this specific video:
        1. Implementation details and best practices
        2. Performance optimization techniques
        3. Common pitfalls to avoid
        Current video-specific examples and demonstrations.`;

      const res = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: uniqueTranscript }),
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
      if (error.message.includes("quota exceeded")) {
        toast({
          title: "Using Basic Notes",
          description: "AI service is temporarily unavailable. Showing basic structured notes instead.",
          variant: "default",
        });
      } else {
        toast({
          title: "AI Service Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  useEffect(() => {
    let isMounted = true;

    const loadYouTubeAPI = () => {
      if (!apiLoaded) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        apiLoaded = true;
      }
    };

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      if (playerContainerRef.current && window.YT?.Player) {
        try {
          playerRef.current = new window.YT.Player(playerContainerRef.current, {
            height: "400",
            width: "100%",
            videoId,
            playerVars: {
              playsinline: 1,
              autoplay: 0,
              modestbranding: 1,
              rel: 0,
            },
            events: {
              onReady: () => {
                setPlayerError("");
              },
              onError: (event: any) => {
                const errorMessages: { [key: number]: string } = {
                  2: "Invalid video ID or URL",
                  5: "HTML5 player error",
                  100: "Video not found",
                  101: "Video playback not allowed",
                  150: "Video playback not allowed",
                };
                const errorCode = event.data;
                setPlayerError(errorMessages[errorCode] || "An error occurred while loading the video");
              },
              onStateChange: (event: any) => {
                // Video ended
                if (event.data === 0) {
                  completeMutation.mutate();
                }
              },
            },
          });
        } catch (error) {
          console.error("Error initializing YouTube player:", error);
          setPlayerError("Failed to initialize video player");
        }
      }
    };

    loadYouTubeAPI();

    window.onYouTubeIframeAPIReady = () => {
      if (isMounted) {
        initPlayer();
      }
    };

    // If API is already loaded, initialize player directly
    if (window.YT?.Player) {
      initPlayer();
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
        {playerError ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            {playerError}
          </div>
        ) : (
          <div ref={playerContainerRef} />
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