import express from 'express';
import { authenticate } from '../middleware/auth';
import * as taskController from '../controllers/taskController';
import * as subtaskController from '../controllers/subtaskController';

const router = express.Router();

// All task routes require authentication
router.use(authenticate);

// Get all tasks with optional filters
router.get('/', taskController.getAllTasks);

// Bulk status updates for drag & drop (must be registered before /:id)
router.patch('/batch', taskController.batchUpdateTaskStatus);

// Get overdue tasks (must come before /:id)
router.get('/overdue', taskController.getOverdueTasks);

// Get single task by ID
router.get('/:id', taskController.getTaskById);

// Create new task
router.post('/', taskController.createTask);

// Update task
router.put('/:id', taskController.updateTask);

// Move a single task to another column (drag & drop)
router.patch('/:id/status', taskController.updateTaskStatus);

// Delete task
router.delete('/:id', taskController.deleteTask);

/* ------------------------- Sub-tasks ------------------------- */
router.get('/:taskId/subtasks', subtaskController.getSubtasks);
router.post('/:taskId/subtasks', subtaskController.createSubtask);
router.patch('/:taskId/subtasks/:subtaskId', subtaskController.updateSubtask);
router.delete('/:taskId/subtasks/:subtaskId', subtaskController.deleteSubtask);

export default router;
