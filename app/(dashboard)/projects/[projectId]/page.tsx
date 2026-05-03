'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreateTaskDialog } from '@/components/dashboard/create-task-dialog';
import { TaskColumn } from '@/components/dashboard/task-column';
import { AlertCircle, Plus } from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  description?: string;
  color: string;
}

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigned_to?: string;
  due_date?: string;
  order: number;
}

const STATUSES = ['todo', 'in_progress', 'done'] as const;
const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export default function ProjectPage() {
  const { projectId } = useParams();
  const { authHeaders } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const headers = authHeaders();
        const [projectRes, tasksRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`, { headers }),
          fetch(`/api/tasks?projectId=${projectId}`, { headers }),
        ]);

        if (!projectRes.ok) throw new Error(`Failed to load project (${projectRes.status})`);

        const projectData = await projectRes.json();
        setProject(projectData.project);

        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setTasks(tasksData.tasks);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => [...prev, newTask]);
    setShowCreateTask(false);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
  };

  // Properly removes the deleted task from state
  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-10 w-48 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-16 gap-3">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="text-destructive font-medium">{error || 'Project not found'}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-3xl font-bold">{project.name}</h1>
          </div>
          {project.description && (
            <p className="text-muted-foreground mt-1 ml-7">{project.description}</p>
          )}
        </div>
        <Button onClick={() => setShowCreateTask(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      <CreateTaskDialog
        projectId={projectId as string}
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        onTaskCreated={handleTaskCreated}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATUSES.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            label={STATUS_LABELS[status]}
            tasks={tasks.filter((t) => t.status === status)}
            onTaskUpdated={handleTaskUpdated}
            onTaskDeleted={handleTaskDeleted}
          />
        ))}
      </div>
    </div>
  );
}
