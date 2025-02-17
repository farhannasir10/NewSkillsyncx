import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Playlist } from "@shared/schema";
import PlaylistCard from "@/components/playlist-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "wouter";

export default function CoursesPage() {
  const { user } = useAuth();

  const { data: playlists } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">All Courses</h1>
          {user?.isAdmin && (
            <Link href="/admin">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists?.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              userId={user?.id || 0}
              showAdminActions={user?.isAdmin}
            />
          ))}
        </div>
      </div>
    </div>
  );
}