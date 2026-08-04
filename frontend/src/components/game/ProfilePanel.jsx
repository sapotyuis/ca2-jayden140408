import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Panel from '../Panel';
import Button from '../Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ToastProvider';
import { extractErrorMessage } from '../../lib/api';
import styles from './game.module.css';

/** The survivor log: rename the account, or abandon the raft (delete) and return to sign-in. */
export default function ProfilePanel({ index }) {
  const { api, setUser, logout } = useAuth();
  const pushToast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRename = async (event) => {
    event.preventDefault();
    const next = name.trim();
    if (!next) return;

    setRenaming(true);
    const { ok, data } = await api('/api/me', { method: 'PATCH', body: { username: next } });
    setRenaming(false);

    if (!ok) return pushToast(extractErrorMessage(data), 'error');
    setUser(data);
    setName('');
    pushToast('Survivor name updated.', 'success');
  };

  const handleDelete = async () => {
    if (!window.confirm('This will permanently delete your survivor, raft, inventory, and progress. Continue?')) return;

    setDeleting(true);
    const { ok, data } = await api('/api/me', { method: 'DELETE' });

    if (!ok) {
      setDeleting(false);
      return pushToast(extractErrorMessage(data), 'error');
    }
    logout();
    navigate('/', { replace: true });
  };

  return (
    <Panel title="Survivor profile" index={index}>
      <form className={styles.profileForm} onSubmit={handleRename}>
        <div className={styles.profileField}>
          <label className={styles.profileLabel} htmlFor="rename">
            Survivor name
          </label>
          <input
            id="rename"
            className={styles.profileInput}
            type="text"
            placeholder="Enter a new survivor name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button type="submit" variant="ghost" size="md" loading={renaming} disabled={!name.trim()}>
          SAVE NEW NAME
        </Button>
      </form>

      <div className={styles.dangerZone}>
        <p className={styles.dangerNote}>Deleting your raft permanently deletes your survivor, inventory, and all progress.</p>
        <Button variant="danger" size="md" loading={deleting} onClick={handleDelete} style={{ width: '100%' }}>
          DELETE SURVIVOR AND RAFT
        </Button>
      </div>
    </Panel>
  );
}
