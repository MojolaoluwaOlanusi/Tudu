import axios from 'axios';
import type { Board } from '../types/board';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export interface InstallTemplateInput {
  name?: string;
  workspaceId?: string;
}

export const templateService = {
  /** Create a new board from a built-in template. */
  install: async (
    token: string,
    slug: string,
    input: InstallTemplateInput = {}
  ): Promise<Board> =>
    (
      await axios.post(
        API_URL + '/api/templates/' + slug + '/install',
        { name: input.name, workspace_id: input.workspaceId },
        { headers: auth(token) }
      )
    ).data,
};
