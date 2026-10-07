import express from 'express';
import { authenticate } from '../middleware/auth';
import * as boardController from '../controllers/boardController';

/** Mounted at `/api/boards`. */
export const boardsRouter = express.Router();

boardsRouter.use(authenticate);

boardsRouter.get('/', boardController.getBoards);
boardsRouter.post('/', boardController.createBoard);
boardsRouter.get('/:boardId/columns', boardController.getColumns);
boardsRouter.post('/:boardId/columns', boardController.createColumn);
boardsRouter.put('/:boardId/columns/reorder', boardController.reorderColumns);
boardsRouter.get('/:id', boardController.getBoardById);
boardsRouter.put('/:id', boardController.updateBoard);
boardsRouter.delete('/:id', boardController.deleteBoard);

/** Mounted at `/api/columns`. The fixed `reorder` segment must be registered
 *  before `/:id`, otherwise it is swallowed by the parameter route. */
export const columnsRouter = express.Router();

columnsRouter.use(authenticate);

columnsRouter.put('/reorder', boardController.reorderColumns);
columnsRouter.put('/:id', boardController.updateColumn);
columnsRouter.delete('/:id', boardController.deleteColumn);
