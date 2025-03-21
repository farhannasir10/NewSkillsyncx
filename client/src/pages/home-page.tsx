import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Playlist, Post, CareerPath } from "@shared/schema";
import PlaylistCard from "@/components/playlist-card";
import { Button } from "@/components/ui/button";
import XPBadge from "@/components/xp-badge";
import { Link } from "wouter";
import { LogOut, Plus, Rocket, Trophy, Users } from "lucide-react";
import CareerPathCard from "@/components/career-path-card"; // Assuming this component exists
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Assuming these components exist


const HomePage = () => {
  const { user, logoutMutation } = useAuth();

  const { data: playlists } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  const { data: posts } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  const { data: careerPaths } = useQuery<CareerPath[]>({
    queryKey: ["careerPaths"],
    queryFn: () => fetch("/api/career-paths").then(res => res.json())
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              SkillSyncX
            </h1>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/courses" className="text-sm font-medium hover:text-primary">
                Courses
              </Link>
              <Link href="/community" className="text-sm font-medium hover:text-primary">
                Community
              </Link>
              <Link href="/career" className="text-sm font-medium hover:text-primary">
                Career Path
              </Link>
              <Link href="/leaderboard" className="text-sm font-medium hover:text-primary">
                Leaderboard
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {user?.isAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Button>
              </Link>
            )}
            <XPBadge xp={user?.xp || 0} level={user?.level || 1} />
            <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Career Path Banner */}
        <section className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-8">
          <div className="flex items-start justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
                <Rocket className="h-8 w-8 text-primary" />
                Start Your Tech Career Journey
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Let AI guide your learning path from fundamentals to industry projects and interview preparation.
                Get personalized course recommendations and mentorship to achieve your career goals.
              </p>
              <Link href="/career">
                <Button size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
                  Explore Career Paths
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trending Courses */}
          <div className="col-span-2">
            <h2 className="text-2xl font-semibold mb-4">Trending Courses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {playlists?.slice(0, 4).map((playlist) => (
                <Card key={playlist.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{playlist.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{playlist.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Community and Leaderboard Column */}
          <div className="space-y-8">
            {/* Community Posts */}
            <section>
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Users className="h-6 w-6" />
                Community
              </h2>
              <div className="space-y-4">
                {posts?.map((post) => (
                  <div key={post.id} className="bg-card p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">@{post.userId}</p>
                    <p className="mt-2">{post.content}</p>
                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{post.likes} likes</span>
                      <span>{post.comments} comments</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Posts
              </Button>
            </section>

            {/* Leaderboard */}
            <section>
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                Leaderboard
              </h2>
              <div className="bg-card rounded-lg p-4">
                <div className="space-y-4">
                  {/* We'll fetch this data later */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">1.</span>
                      <span>Top Learner</span>
                    </div>
                    <XPBadge xp={5000} level={5} />
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View Full Leaderboard
                </Button>
              </div>
            </section>
          </div>
        </div>


        {/* Career Paths Section */}
        <section className="mt-12">
          <h2 className="text-3xl font-bold mb-6">Career Paths</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {careerPaths?.map((path) => (
              <CareerPathCard key={path.id} path={path} />
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};

export default HomePage;