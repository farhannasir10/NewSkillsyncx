import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface XPBadgeProps {
  xp: number;
  level: number;
}

export default function XPBadge({ xp, level }: XPBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="px-2 py-1">
        <Trophy className="w-4 h-4 mr-1" />
        Level {level}
      </Badge>
      <Badge variant="outline" className="px-2 py-1">
        {xp} XP
      </Badge>
    </div>
  );
}
