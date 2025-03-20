
import { useQuery } from "@tanstack/react-query";
import { CareerPath } from "@shared/schema";
import CareerPathCard from "@/components/career-path-card";

export default function CareerPathPage() {
  const { data: careerPaths } = useQuery<CareerPath[]>({
    queryKey: ["careerPaths"],
    queryFn: () => fetch("/api/career-paths").then(res => res.json())
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-4xl font-bold mb-8">Career Paths</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {careerPaths?.map((path) => (
          <CareerPathCard key={path.id} path={path} />
        ))}
      </div>
    </div>
  );
}
