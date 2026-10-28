import React from 'react';
import { motion } from 'framer-motion';
import CodePanel from './underhood/CodePanel';

/**
 * Each snippet mirrors the file it names:
 *   backend/src/socketServer.ts
 *   backend/src/controllers/taskController.ts
 *   frontend/src/hooks/useTasks.ts
 *
 * Lines are abbreviated for panel width (roughly 50 characters), but the
 * identifiers, method calls, and control flow are the same as the real
 * files. When the real code changes, this file changes with it.
 */
const SOCKET_CODE = [
  '// socketServer.ts',
  'io.use((socket, next) => {',
  '  // Token from the client, verified',
  '  // on the server. Room derives',
  '  // from the token, not the client.',
  '  const token =',
  '    socket.handshake.auth.token ??',
  '    socket.handshake.headers',
  "      .authorization?.replace(/^Bearer /, '');",
  '  try {',
  '    const { userId } =',
  '      verifyToken(token);',
  '    socket.data.userId = userId;',
  '    next();',
  '  } catch {',
  "    next(new Error('Unauthorized'));",
  '  }',
  '});',
];

const BACKEND_CODE = [
  '// taskController.ts - createTask',
  'let { title, category, priority } = req.body;',
  '',
  'if (naturalLanguage !== false) {',
  '  // Blanks filled from plain English.',
  '  const parsed = parseNaturalLanguage(title);',
  '  title = parsed.title || title.trim();',
  '  category = category ?? parsed.category;',
  '}',
  '',
  'const { rows } = await pool.query(',
  '  `INSERT INTO tasks',
  '     (user_id, title, category,',
  '      priority, board_id, column_id)',
  '   VALUES ($1,$2,$3,$4,$5,$6)',
  '   RETURNING *`,',
  '  [userId, title, category, priority,',
  '   boardId, columnId],',
  ');',
  '',
  "await broadcastTask('task:create',",
  '  userId, rows[0]);',
];

const FRONTEND_CODE = [
  '// useTasks.ts - optimistic + rollback',
  'const mutation = useMutation({',
  '  mutationFn: (input) =>',
  '    taskService.createTask(token!, input),',
  '',
  '  onMutate: async (input) => {',
  '    const prev = qc.getQueriesData(',
  '      { queryKey: taskKeys.all });',
  '    qc.setQueriesData(',
  '      { queryKey: taskKeys.all },',
  '      (old) => old',
  '        ? [optimistic(input), ...old]',
  '        : old,',
  '    );',
  '    return { prev };',
  '  },',
  '',
  '  onError: (_e, _v, ctx) => {',
  '    ctx?.prev.forEach(([key, data]) =>',
  '      qc.setQueryData(key, data));',
  '  },',
  '});',
];

const ease = [0.2, 0, 0, 1] as const;

const UnderTheHood: React.FC = () => (
  <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
    <div className="mb-12 max-w-2xl">
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5, ease }}
        className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint"
      >
        Under the hood
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, delay: 0.05, ease }}
        className="text-balance text-3xl font-semibold leading-tight text-ink sm:text-4xl"
      >
        Real-time sync, one insert, one cache key
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, delay: 0.1, ease }}
        className="mt-3 text-base leading-relaxed text-ink-muted"
      >
        Node, Postgres, Socket.io, React Query. No frameworks-in-a-framework,
        no ORM magic. Just the code that runs your board, in the open.
      </motion.p>
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <CodePanel
        title="socketServer.ts"
        language="typescript"
        code={SOCKET_CODE}
        delay={0}
        status="JWT handshake · per-user room"
      />
      <CodePanel
        title="taskController.ts"
        language="typescript"
        code={BACKEND_CODE}
        delay={350}
        status="POST /api/tasks · 201"
      />
      <CodePanel
        title="useTasks.ts"
        language="typescript"
        code={FRONTEND_CODE}
        delay={700}
        status="optimistic · rollback on error"
      />
    </div>
  </section>
);

export default UnderTheHood;