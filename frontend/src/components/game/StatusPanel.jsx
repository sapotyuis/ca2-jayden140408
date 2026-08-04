import Panel from '../Panel';
import Meter from '../Meter';
import { UPGRADE_SPECS } from '../../hooks/useGameState';
import styles from './game.module.css';

/** Raft vitals: hunger + a materials-toward-next-upgrade meter, and a plain-language next step. */
export default function StatusPanel({ status, index }) {
  const nextSpec = status?.next_recommended_upgrade ? UPGRADE_SPECS[status.next_recommended_upgrade] : null;
  const materialsTarget = nextSpec ? nextSpec.material_cost : Math.max(status?.materials || 1, 1);

  let hint = 'All upgrades are installed. Your raft is fully upgraded.';
  if (status?.next_recommended_upgrade) {
    hint = status.can_upgrade ? (
      <>
        Ready to install: <b>{status.next_recommended_upgrade}</b>. Open the Raft Upgrades panel below.
      </>
    ) : (
      <>
        Next upgrade: <b>{status.next_recommended_upgrade}</b>. Need {nextSpec.material_cost - status.materials} more materials.
      </>
    );
  }

  return (
    <Panel title="Raft status" index={index}>
      <div className={styles.statusStack}>
        <Meter label="Hunger" tone="hunger" value={status?.hunger ?? 0} max={100} valueText={`${status?.hunger ?? 0}/100`} />
        <Meter
          label="Materials needed for next upgrade"
          tone="lantern"
          value={status?.materials ?? 0}
          max={materialsTarget}
          valueText={status?.materials ?? 0}
        />
        <p className={styles.nextHint}>{hint}</p>
      </div>
    </Panel>
  );
}
