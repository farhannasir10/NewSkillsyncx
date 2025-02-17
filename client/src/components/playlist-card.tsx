import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Playlist } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import VideoPlayer from "./video-player";

interface PlaylistCardProps {
  playlist: Playlist;
  userId: number;
}

export default function PlaylistCard({ playlist, userId }: PlaylistCardProps) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const { data: progress } = useQuery({
    queryKey: [`/api/progress/${playlist.id}`],
    enabled: userId > 0,
  });

  const completedCount = progress?.completedVideos?.length || 0;
  const totalVideos = playlist.videos.length;
  const progressPercent = (completedCount / totalVideos) * 100;

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>{playlist.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{playlist.description}</p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{completedCount}/{totalVideos} videos</span>
            </div>
            <Progress value={progressPercent} />
            
            <div className="space-y-2">
              {playlist.videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => setSelectedVideo(video.id)}
                  className="w-full text-left p-2 hover:bg-accent rounded-md flex items-center gap-2"
                >
                  <div className="w-4 h-4 rounded-full border-2 flex-shrink-0">
                    {progress?.completedVideos?.includes(video.id) && (
                      <div className="w-full h-full bg-primary rounded-full" />
                    )}
                  </div>
                  <span className="truncate">{video.title}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {playlist.videos.find(v => v.id === selectedVideo)?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <VideoPlayer
              videoId={selectedVideo}
              playlistId={playlist.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
