import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPlaylistSchema, InsertUser, Playlist } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect, useState } from "react";

const videoSchema = z.object({
  id: z.string().min(1, "Video ID is required"),
  title: z.string().min(1, "Title is required"),
  duration: z.string().optional(),
});

const createPlaylistSchema = insertPlaylistSchema.extend({
  videos: z.array(videoSchema).default([]),
  playlistUrl: z.string().url("Please enter a valid YouTube playlist URL"),
});

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  // Fetch playlists on component mount
  useEffect(() => {
    fetch("/api/playlists")
      .then(res => res.json())
      .then(data => setPlaylists(data))
      .catch(error => console.error("Failed to fetch playlists:", error));
  }, []);

  const form = useForm({
    resolver: zodResolver(createPlaylistSchema),
    defaultValues: {
      title: "",
      description: "",
      playlistUrl: "",
      videos: [],
      tags: [],
    },
  });

  const createPlaylistMutation = useMutation({
    mutationFn: async (data: any) => {
      const playlistId = data.playlistUrl.split('list=')[1]?.split('&')[0];
      if (!playlistId) {
        throw new Error("Invalid playlist URL");
      }

      const videosRes = await fetch(`/api/youtube/playlist/${playlistId}`); //Requires backend API
      if (!videosRes.ok) {
        throw new Error("Failed to fetch playlist videos");
      }
      const videos = await videosRes.json();

      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          videos: videos.map((video: any) => ({
            id: video.id,
            title: video.title
          }))
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create playlist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Success",
        description: "Playlist created successfully",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createEmptyCourse = (data: any) => {
    const courseData = {
      ...data,
      videos: [],
      playlistUrl: '',
      tags: data.tags || []
    };

    createPlaylistMutation.mutate(courseData, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
        toast({
          title: "Success",
          description: "Empty Playlist created successfully",
        });
        form.reset({
          title: '',
          description: '',
          playlistUrl: '',
          tags: [],
          videos: []
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  useEffect(() => {
    form.reset({
      title: "",
      description: "",
      playlistUrl: "",
      tags: [],
      videos: []
    });
  }, []);


  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold">Access Denied</h1>
            </div>
            <p className="text-sm text-gray-600">
              You need administrator privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const generateNotes = (videoId: string) => {
    //Implementation to generate notes for a video.  This is a placeholder.
    console.log("Generating notes for video:", videoId);
    //Add your actual note generation logic here.  This might involve an API call.
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Course</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => createPlaylistMutation.mutate(data))}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="playlistUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>YouTube Playlist URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://www.youtube.com/playlist?list=..."
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the URL of a YouTube playlist to import all videos.
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags (comma-separated)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value?.join(", ")}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  .split(",")
                                  .map((tag) => tag.trim())
                                  .filter(Boolean)
                              )
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => createEmptyCourse(form.getValues())}
                      disabled={createPlaylistMutation.isLoading}
                    >
                      {createPlaylistMutation.isLoading ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                          Creating...
                        </div>
                      ) : (
                        "Create Empty Course"
                      )}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createPlaylistMutation.isLoading}
                    >
                      {createPlaylistMutation.isLoading ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                          Creating...
                        </div>
                      ) : (
                        "Create from YouTube"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
              {form.watch("videos")?.length > 0 && (
                <div className="space-y-4 mt-4">
                  <h3 className="text-lg font-medium">Videos in Playlist</h3>
                  <select 
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => {
                      if (e.target.value) {
                        generateNotes(e.target.value);
                      }
                    }}
                  >
                    <option value="">Select a video to generate notes</option>
                    {form.watch("videos").map((video: any, index: number) => (
                      <option key={index} value={video.id}>
                        {video.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage Videos</CardTitle>
              <p className="text-sm text-muted-foreground">Add videos to existing courses</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Course</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => {
                      if (e.target.value) {
                        fetch(`/api/playlists/${e.target.value}`)
                          .then(res => res.json())
                          .then(playlist => {
                            form.setValue('videos', playlist.videos || []);
                          })
                          .catch(console.error);
                      }
                    }}
                  >
                    <option value="">Select a course</option>
                    {playlists.map(playlist => (
                      <option key={playlist.id} value={playlist.id}>
                        {playlist.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Videos</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        form.setValue("videos", [
                          ...(form.watch("videos") || []),
                          { id: "", title: "" },
                        ])
                      }
                    >
                      Add Video
                    </Button>
                  </div>

                  {(form.watch("videos") || []).map((_, index) => (
                    <div key={index} className="p-4 border rounded-md space-y-4">
                      <FormField
                        control={form.control}
                        name={`videos.${index}.id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>YouTube Video ID</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g. dQw4w9WgXcQ (from youtube.com/watch?v=dQw4w9WgXcQ)"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`videos.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Video Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const videos = form.watch("videos");
                          form.setValue(
                            "videos",
                            videos.filter((_, i) => i !== index)
                          );
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    onClick={() => {
                      const select = document.querySelector('select') as HTMLSelectElement;
                      const courseId = select?.value;

                      if (!courseId) {
                        return alert('Please select a course');
                      }

                      fetch(`/api/playlists/${courseId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ videos: form.watch('videos') }),
                        credentials: 'include',
                      })
                        .then(res => {
                          if (!res.ok) throw new Error('Failed to update videos');
                          return res.json();
                        })
                        .then(() => {
                          alert('Videos updated successfully');
                        })
                        .catch(err => {
                          alert(err.message);
                        });
                    }}
                  >
                    Save Videos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}