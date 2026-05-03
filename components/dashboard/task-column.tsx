'use client';

import { Card } from '@/components/ui/card';
import { TaskCard } from './task-card';

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

interface TaskColumnProps {
  status: string;
  label: string;
  tasks: Task[];
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

export function TaskColumn({ status, label, tasks, onTaskUpdated, onTaskDeleted }: TaskColumnProps) {
  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">{label}</h2>
          <p className="text-sm text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 min-h-[400px] bg-muted/30 rounded-lg p-4">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onUpdated={onTaskUpdated}
              onDeleted={onTaskDeleted}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-16">
            No tasks yet
          </div>
        )}
      </div>
    </div>
  );
}
