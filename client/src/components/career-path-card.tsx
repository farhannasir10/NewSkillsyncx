
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

interface CareerPathCardProps {
  path: {
    title: string;
    description: string;
    requiredSkills: string[];
    roadmap: { stage: string; skills: string[] }[];
  };
}

const CareerPathCard = ({ path }: CareerPathCardProps) => {
  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl">{path.title}</CardTitle>
        <CardDescription>{path.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Required Skills:</h4>
            <div className="flex flex-wrap gap-2">
              {path.requiredSkills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Learning Path:</h4>
            <div className="space-y-2">
              {path.roadmap.map((stage) => (
                <div key={stage.stage} className="text-sm">
                  <span className="font-medium">{stage.stage}:</span>{" "}
                  {stage.skills.join(", ")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CareerPathCard;
