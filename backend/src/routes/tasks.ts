import express from 'express';
import { authenticate } from '../middleware/auth';
import * as taskController from '../controllers/taskController';

const router = express.Router();

// All task routes require authentication
router.use(authenticate);

// Get all tasks with optional filters
router.get('/', taskController.getAllTasks);

// Get overdue tasks (must come before /:id)
router.get('/overdue', taskController.getOverdueTasks);

// Get single task by ID
router.get('/:id', taskController.getTaskById);

// Create new task
router.post('/', taskController.createTask);

// Update task
router.put('/:id', taskController.updateTask);

// Delete task
router.delete('/:id', taskController.deleteTask);

export default router;
