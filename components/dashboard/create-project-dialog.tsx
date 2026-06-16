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

interface CreateProjectDialogProps {
  teamId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (project: any) => void;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export function CreateProjectDialog({
  teamId,
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const { authHeaders } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState(teamId || '');

  useEffect(() => {
    if (!teamId && open) {
      fetch('/api/teams', { headers: authHeaders() })
        .then((res) => res.json())
        .then((data) => {
          setTeams(data.teams || []);
          if (data.teams && data.teams.length > 0) {
            setSelectedTeamId(data.teams[0]._id);
          }
        })
        .catch((err) => console.error('Failed to load teams:', err));
    } else {
      setSelectedTeamId(teamId || '');
    }
  }, [teamId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setError('Please select a team');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, description, color, team_id: selectedTeamId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create project');
      }

      const data = await response.json();
      setName('');
      setDescription('');
      setColor(COLORS[0]);
      if (onProjectCreated) {
        onProjectCreated(data.project);
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
          <DialogTitle>Create new project</DialogTitle>
          <DialogDescription>
            Create a project to organize your team&apos;s work.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {!teamId && (
            <div className="space-y-2">
              <label htmlFor="project-team" className="text-sm font-medium">
                Team
              </label>
              <select
                id="project-team"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="" disabled>Select a team</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="project-name" className="text-sm font-medium">
              Project name
            </label>
            <Input
              id="project-name"
              placeholder="e.g. Website Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="project-desc" className="text-sm font-medium">
              Description (optional)
            </label>
            <Input
              id="project-desc"
              placeholder="Describe what this project is about"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? 'border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name}>
              {isLoading ? 'Creating...' : 'Create project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
