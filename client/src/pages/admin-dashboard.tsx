import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPlaylistSchema, InsertUser, Playlist } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const videoSchema = z.object({
  id: z.string().min(1, "Video ID is required"),
  title: z.string().min(1, "Title is required"),
  duration: z.string().optional(),
});

const createPlaylistSchema = insertPlaylistSchema.extend({
  videos: z.array(videoSchema).min(1, "At least one video is required"),
  playlistUrl: z.string().url("Please enter a valid YouTube playlist URL"),
});

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(createPlaylistSchema),
    defaultValues: {
      title: "",
      description: "",
      playlistUrl: "",
      videos: [{ id: "", title: "", duration: "", thumbnail: "" }],
      tags: [],
    },
  });

  const createPlaylistMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, creatorId: user?.id }),
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

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
                          onChange={(e) => {
                            field.onChange(e);
                            // Extract playlist ID
                            const url = new URL(e.target.value);
                            const playlistId = url.searchParams.get('list');
                            if (playlistId) {
                              // Fetch video details from playlist
                              fetch(`/api/youtube/playlist/${playlistId}`)
                                .then(res => res.json())
                                .then(videos => {
                                  form.setValue('videos', videos.map((video: any) => ({
                                    id: video.id,
                                    title: video.title,
                                    duration: video.duration || '',
                                    thumbnail: video.thumbnail
                                  })));
                                })
                                .catch(console.error);
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <label className="text-sm font-medium">Videos</label>
                  {form.watch("videos")?.map((_, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`videos.${index}.id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>YouTube Video ID</FormLabel>
                            <FormControl>
                              <Input {...field} />
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
                      <FormField
                        control={form.control}
                        name={`videos.${index}.duration`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (e.g. "1:30:00")</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      form.setValue("videos", [
                        ...form.watch("videos"),
                        { id: "", title: "", duration: "", thumbnail: "" },
                      ])
                    }
                  >
                    Add Video
                  </Button>
                </div>

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

                <Button type="submit" className="w-full">
                  Create Course
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}