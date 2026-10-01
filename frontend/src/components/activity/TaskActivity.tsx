import React from 'react';
import { useTaskActivity } from '../../hooks/useActivity';
import ActivityFeed from './ActivityFeed';

/** My activity on a single task, shown inside the task card. */
const TaskActivity: React.FC<{ taskId: string }> = ({ taskId }) => {
  const { data, isLoading } = useTaskActivity(taskId, 10);

  return (
    <ActivityFeed
      activities={data?.items ?? []}
      isLoading={isLoading}
      compact
      emptyMessage="No activity on this task yet."
    />
  );
};

export default TaskActivity;