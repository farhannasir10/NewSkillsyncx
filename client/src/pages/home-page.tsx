import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Playlist } from "@shared/schema";
import PlaylistCard from "@/components/playlist-card";
import { Button } from "@/components/ui/button";
import XPBadge from "@/components/xp-badge";
import { LogOut } from "lucide-react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  
  const { data: playlists } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">LearnHub</h1>
          <div className="flex items-center gap-4">
            <XPBadge xp={user?.xp || 0} level={user?.level || 1} />
            <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8">Featured Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists?.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              userId={user?.id || 0}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
