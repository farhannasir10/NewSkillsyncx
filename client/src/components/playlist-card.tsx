import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Playlist } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import VideoPlayer from "./video-player";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PlaylistCardProps {
  playlist: Playlist;
  userId: number;
  showAdminActions?: boolean;
}

export default function PlaylistCard({ playlist, userId, showAdminActions }: PlaylistCardProps) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const { data: progress } = useQuery({
    queryKey: [`/api/progress/${playlist.id}`],
    enabled: userId > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/playlists/${playlist.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete playlist");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Success",
        description: "Course deleted successfully",
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

  const completedCount = progress?.completedVideos?.length || 0;
  const totalVideos = playlist.videos.length;
  const progressPercent = (completedCount / totalVideos) * 100;

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{playlist.title}</CardTitle>
          {showAdminActions && (
            <Button 
              variant="ghost" 
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course
              and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}