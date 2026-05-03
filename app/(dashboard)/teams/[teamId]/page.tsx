'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog';
import { ProjectsGrid } from '@/components/dashboard/projects-grid';
import { TeamSettings } from '@/components/dashboard/team-settings';
import { AlertCircle, Plus } from 'lucide-react';

interface Team {
  _id: string;
  name: string;
  description?: string;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  color: string;
}

export default function TeamPage() {
  const { teamId } = useParams();
  const { authHeaders } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const headers = authHeaders();
        const [teamRes, projectsRes] = await Promise.all([
          fetch(`/api/teams/${teamId}`, { headers }),
          fetch(`/api/projects?teamId=${teamId}`, { headers }),
        ]);

        if (!teamRes.ok) throw new Error(`Failed to load team (${teamRes.status})`);

        const teamData = await teamRes.json();
        setTeam(teamData.team);

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData.projects);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load team');
      } finally {
        setIsLoading(false);
      }
    };

    if (teamId) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const handleProjectCreated = (newProject: Project) => {
    setProjects([newProject, ...projects]);
    setShowCreateProject(false);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-10 w-48 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-16 gap-3">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="text-destructive font-medium">{error || 'Team not found'}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          {team.description && (
            <p className="text-muted-foreground mt-1">{team.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateProject(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
          <TeamSettings teamId={teamId as string} team={team} />
        </div>
      </div>

      <CreateProjectDialog
        teamId={teamId as string}
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onProjectCreated={handleProjectCreated}
      />

      <div>
        <h2 className="text-xl font-bold mb-4">Projects</h2>
        {projects.length > 0 ? (
          <ProjectsGrid projects={projects} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-16">
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">Create your first project to start organizing work</p>
              <Button onClick={() => setShowCreateProject(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
