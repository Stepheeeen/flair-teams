'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface CreateTaskDialogProps {
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated?: (task: any) => void;
}

export function CreateTaskDialog({
  projectId,
  open,
  onOpenChange,
  onTaskCreated,
}: CreateTaskDialogProps) {
  const { authHeaders } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');

  useEffect(() => {
    if (!projectId && open) {
      fetch('/api/projects', { headers: authHeaders() })
        .then((res) => res.json())
        .then((data) => {
          setProjects(data.projects || []);
          if (data.projects && data.projects.length > 0) {
            setSelectedProjectId(data.projects[0]._id);
          }
        })
        .catch((err) => console.error('Failed to load projects:', err));
    } else {
      setSelectedProjectId(projectId || '');
    }
  }, [projectId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError('Please select a project');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title,
          description,
          priority,
          project_id: selectedProjectId,
          status: 'todo',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create task');
      }

      const data = await response.json();
      setTitle('');
      setDescription('');
      setPriority('medium');
      if (onTaskCreated) {
        onTaskCreated(data.task);
      }
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create new task</DialogTitle>
          <DialogDescription>Add a new task to this project</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {!projectId && (
            <div className="space-y-2">
              <label htmlFor="task-project" className="text-sm font-medium">
                Project
              </label>
              <select
                id="task-project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="" disabled>Select a project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="task-title" className="text-sm font-medium">
              Task title
            </label>
            <Input
              id="task-title"
              placeholder="e.g. Design homepage"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="task-desc" className="text-sm font-medium">
              Description (optional)
            </label>
            <Input
              id="task-desc"
              placeholder="Add more details about this task"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="task-priority" className="text-sm font-medium">
              Priority
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !title}>
              {isLoading ? 'Creating...' : 'Create task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
