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
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const { toast } = useToast();
  const [currentTimestamp, setCurrentTimestamp] = useState(0);

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
    mutationFn: async (timestamp: number) => {
      // For demo purposes, we'll use a mock transcript based on timestamp
      const mockTranscript = `At ${Math.floor(timestamp / 60)}:${Math.floor(timestamp % 60)} - 
      This section covers essential concepts including component architecture, 
      state management, and useEffect hooks. We discuss best practices for building 
      scalable React applications.`;

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
      setGeneratedNotes(prev => prev + "\n\n" + notes);
      setIsGeneratingNotes(false);
      toast({
        title: "Notes Updated",
        description: "New section notes generated",
      });
    },
    onError: (error: Error) => {
      setIsGeneratingNotes(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;

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
              // Video is playing
              if (event.data === 1) {
                // Start periodic notes generation
                interval = setInterval(async () => {
                  if (!isGeneratingNotes) {
                    const currentTime = playerRef.current.getCurrentTime();
                    // Generate notes every 30 seconds
                    if (Math.abs(currentTime - currentTimestamp) >= 30) {
                      setCurrentTimestamp(currentTime);
                      setIsGeneratingNotes(true);
                      generateNotesMutation.mutate(currentTime);
                    }
                  }
                }, 1000);
              }
              // Video is paused
              if (event.data === 2) {
                clearInterval(interval);
              }
            },
          },
        });
      }
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
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
      </div>
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              AI Study Notes
              {isGeneratingNotes && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] overflow-y-auto prose prose-sm dark:prose-invert">
            {generatedNotes ? (
              <ReactMarkdown>{generatedNotes}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">
                Notes will be generated as you watch the video...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}