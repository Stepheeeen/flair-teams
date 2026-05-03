import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Project {
  _id: string;
  name: string;
  description?: string;
  color: string;
}

interface ProjectsGridProps {
  projects: Project[];
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Link key={project._id} href={`/projects/${project._id}`}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: project.color }}
              >
                <span className="text-lg font-bold text-white">
                  {project.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <CardTitle>{project.name}</CardTitle>
              {project.description && <CardDescription>{project.description}</CardDescription>}
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
