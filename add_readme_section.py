lines = open('README.md').readlines()
idx = next(i for i, l in enumerate(lines) if l.startswith('## Contributing'))
block = """## Team Boards & Role-Based Permissions

Phase 1.2 introduces multi-user collaboration with workspaces, role-based
permissions, board members, and task assignment.

### Concepts

- **Workspace**: A group of members sharing boards. Each workspace has a set of
  role-gated boards.
- **Board**: A Kanban-style board with customizable columns (see
  [Custom Boards & Columns](#custom-boards--columns)).
- **TeamRole**: One of `admin`, `editor`, `viewer`, or `guest`. Only `admin` can
  invite, remove, or change members.
- **Task Assignment**: Tasks carry an `assignee_id`; only the assignee and
  admins can see or act on a task in another member's workspace.

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/workspaces` | List workspaces for the authenticated user |
| `POST` | `/api/workspaces` | Create a new workspace |
| `PATCH` | `/api/workspaces/:id` | Update workspace name |
| `DELETE` | `/api/workspaces/:id` | Delete a workspace |
| `GET` | `/api/workspaces/:id/boards` | List boards in a workspace |
| `GET` | `/api/workspaces/:id/members` | List members of a workspace |
| `POST` | `/api/workspaces/:id/invite` | Invite a user by email |
| `PATCH` | `/api/workspaces/:id/members/:email/role` | Set member role |
| `DELETE` | `/api/workspaces/:id/members/:email` | Remove member |
| `GET` | `/api/tasks/assignee/:id` | Get tasks assigned to a user |
| `PUT` | `/api/tasks/:id/assign` | Change task assignee |

### Frontend Hooks

- `useWorkspaces` – fetch workspaces
- `useActiveWorkspaceId` – current workspace id
- `useCreateWorkspace` – create a new workspace
- `useInviteToWorkspace` – invite a member
- `useSetMemberRole` – change a member's role
- `useRemoveMember` – remove a member

### Frontend Components

- `WorkspaceSwitcher` – header dropdown to switch workspaces
- `MemberBadge` – shows a member avatar/initials
- `MembersPanel` – panel to invite/view/remove members
- `BoardSelector` – board selector (in header)

### Component Structure

- `frontend/src/components/common/WorkspaceSwitcher.tsx`
- `frontend/src/components/common/MemberBadge.tsx`
- `frontend/src/components/shared/MembersPanel.tsx`
- `frontend/src/store/workspaceStore.ts`
- `frontend/src/hooks/useBoards.ts`
"""
lines.insert(idx, block)
open('README.md', 'w').writelines(lines)
print('Inserted at line', idx)
