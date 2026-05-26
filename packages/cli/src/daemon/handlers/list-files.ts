import { ErrorCode } from '../../proto/error-codes';
import { RpcError } from '../../proto/jsonrpc';
import type { Handler } from '../dispatcher';

/**
 * `listFiles` handler — return every source file the session knows
 * about along with its dirty bit. Optional `glob` filters with a tiny
 * `**`/`*`-aware matcher (full path basis).
 */
export const listFilesHandler: Handler = ({ session }, params) => {
  if (!session) {
    throw new RpcError(ErrorCode.SessionNotFound, 'listFiles: session not found');
  }
  const { glob } = (params ?? {}) as { glob?: string };
  const dirty = new Set(session.dirtyFiles());
  let files = session.project.getSourceFiles().map((sf) => ({
    file: sf.getFilePath(),
    dirty: dirty.has(sf.getFilePath()),
  }));
  if (typeof glob === 'string' && glob.length > 0) {
    const matcher = globToRegExp(glob);
    files = files.filter((entry) => matcher.test(entry.file));
  }
  return files;
};

/**
 * Translate a minimal glob (`**`, `*`, `?`) into a `RegExp`. Designed
 * for the listFiles filter only; for full glob semantics callers can
 * pass a regex string instead (anything containing `(`, `[`, or `|` is
 * treated as a raw regex source).
 */
function globToRegExp(glob: string): RegExp {
  if (/[(|\\[]/.test(glob)) return new RegExp(glob);
  let re = '';
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i += 2;
      } else {
        re += '[^/]*';
        i += 1;
      }
    } else if (ch === '?') {
      re += '[^/]';
      i += 1;
    } else if ('.+^$()|{}'.includes(ch)) {
      re += '\\' + ch;
      i += 1;
    } else {
      re += ch;
      i += 1;
    }
  }
  return new RegExp(`^${re}$`);
}
