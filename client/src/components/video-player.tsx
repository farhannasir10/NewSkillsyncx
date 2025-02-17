import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useEffect, useRef } from "react";

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
      // Clean up existing player if any
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      // Only create new player if container exists and we don't have a player
      if (containerRef.current && !playerRef.current && window.YT?.Player) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          height: "500",
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

  return <div ref={containerRef} />;
}