'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

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

interface TaskCardProps {
  task: Task;
  onUpdated: (task: Task) => void;
  onDeleted: (taskId: string) => void;
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const statusTransitions = {
  todo: ['in_progress'],
  in_progress: ['todo', 'done'],
  done: ['in_progress'],
};

export function TaskCard({ task, onUpdated, onDeleted }: TaskCardProps) {
  const { authHeaders } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${task._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        onUpdated(data.task);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${task._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (response.ok) {
        onDeleted(task._id);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const nextStatuses = statusTransitions[task.status as keyof typeof statusTransitions] || [];

  return (
    <Card className="p-4 bg-card cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow opacity-100">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-2">{task.title}</h3>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isUpdating}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {nextStatuses.map((status) => (
              <DropdownMenuItem key={status} onClick={() => handleStatusChange(status)}>
                Move to{' '}
                {status === 'in_progress'
                  ? 'In Progress'
                  : status === 'todo'
                    ? 'To Do'
                    : 'Done'}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span
          className={`text-xs px-2 py-1 rounded ${
            priorityColors[task.priority as keyof typeof priorityColors]
          }`}
        >
          {task.priority}
        </span>
        {task.due_date && (
          <span className="text-xs text-muted-foreground">
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </Card>
  );
}
