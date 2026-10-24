import React from 'react';
import { motion } from 'framer-motion';
import CodePanel from './underhood/CodePanel';

const SOCKET_CODE = [
  "import { Server } from 'socket.io';",
  "import { verifyToken } from './jwt';",
  '',
  'const io = new Server(httpServer, { cors });',
  '',
  'io.use((socket, next) => {',
  '  try {',
  '    const user = verifyToken(socket.handshake.auth.token);',
  '    socket.data.user = user;',
  '    next();',
  '  } catch {',
  "    next(new Error('Unauthorized'));",
  '  }',
  '});',
];

const BACKEND_CODE = [
  "import { pool } from './db';",
  '',
  "router.post('/', async (req, res) => {",
  '  const { title, category, priority } = req.body;',
  '  const userId = req.user.userId;',
  '',
  '  const { rows } = await pool.query(',
  '    `INSERT INTO tasks (user_id, title, category, priority)',
  '     VALUES ($1, $2, $3, $4) RETURNING *`,',
  '    [userId, title, category, priority],',
  '  );',
  '',
  '  res.status(201).json(rows[0]);',
  '});',
];

const FRONTEND_CODE = [
  "import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';",
  '',
  'export function useTasks(filters) {',
  '  return useQuery({',
  "    queryKey: ['tasks', filters],",
  "    queryFn: () => api.get('/tasks', { params: filters }),",
  '  });',
  '}',
  '',
  'export function useCreateTask() {',
  '  const qc = useQueryClient();',
  '  return useMutation({',
  "    mutationFn: (input) => api.post('/tasks', input),",
  "    onSuccess: () => qc.invalidateQueries(['tasks']),",
  '  });',
  '}',
];

const ease = [0.2, 0, 0, 1] as const;

/**
 * "Under the hood" — three code panels that type themselves in when they
 * scroll into view. The code samples are the same as the mockup's; they
 * are honest about the live stack (Node, Postgres, Socket.io, React Query).
 */
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
        title="server.ts"
        language="typescript"
        code={SOCKET_CODE}
        delay={0}
        status="connected · 2 clients"
      />
      <CodePanel
        title="tasks.ts"
        language="typescript"
        code={BACKEND_CODE}
        delay={350}
        status="listening on :5000"
      />
      <CodePanel
        title="useTasks.ts"
        language="typescript"
        code={FRONTEND_CODE}
        delay={700}
        status="live · staleTime 15s"
      />
    </div>
  </section>
);

export default UnderTheHood;