import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Team {
  _id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  createdAt: string;
}

interface TeamsGridProps {
  teams: Team[];
}

export function TeamsGrid({ teams }: TeamsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map((team) => (
        <Link key={team._id} href={`/teams/${team._id}`}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-primary">
                  {team.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <CardTitle>{team.name}</CardTitle>
              {team.description && <CardDescription>{team.description}</CardDescription>}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {new Date(team.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
