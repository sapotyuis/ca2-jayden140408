import { useState } from 'react';
import Panel from '../Panel';
import Button from '../Button';
import Badge from '../Badge';
import { UPGRADE_SPECS } from '../../hooks/useGameState';
import styles from './game.module.css';

/**
 * Raft upgrades. Owned ones show an "Installed" badge; the rest offer a Buy button that's
 * disabled until you can afford it. Buying one grows the actual raft you sail on the voyage.
 */
export default function UpgradesPanel({ status, onUpgrade, index }) {
  const [pending, setPending] = useState(null);
  const owned = new Set(status?.upgrades || []);
  const materials = status?.materials ?? 0;

  const handleUpgrade = async (type) => {
    setPending(type);
    await onUpgrade(type);
    setPending(null);
  };

  return (
    <Panel title="Raft Upgrades" subtitle="Each one reshapes the raft you sail" index={index}>
      <div className={styles.list}>
        {Object.entries(UPGRADE_SPECS).map(([type, spec]) => {
          const isOwned = owned.has(type);
          const canAfford = materials >= spec.material_cost;
          return (
            <div key={type} className={styles.row}>
              <div>
                <div className={styles.rowName}>{type}</div>
                <div className={styles.rowMeta}>
                  {spec.material_cost} materials
                  {spec.protects_against
                    ? ` · protects against ${spec.protects_against.replaceAll('_', ' ')}`
                    : ` · +${spec.raft_size_gain} raft size`}
                </div>
              </div>
              {isOwned ? (
                <Badge tone="done">Installed</Badge>
              ) : (
                <Button
                  variant="lantern"
                  size="sm"
                  disabled={!canAfford}
                  loading={pending === type}
                  onClick={() => handleUpgrade(type)}
                >
                  Buy
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
