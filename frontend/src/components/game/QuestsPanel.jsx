import { useState } from 'react';
import Panel from '../Panel';
import Button from '../Button';
import Badge from '../Badge';
import Meter from '../Meter';
import styles from './game.module.css';

const STATUS_BADGE = {
  active: { label: 'In Progress', tone: 'active' },
  available: { label: 'Not Started', tone: 'active' },
  completed: { label: 'Ready to Claim', tone: 'ready' },
  claimed: { label: 'Claimed', tone: 'done' },
};

/**
 * The quest board. Progress ticks up on its own as you play (the backend advances it as a side
 * effect of collecting/crafting), so this is mostly a live readout — the one action is claiming a
 * finished quest's reward.
 */
export default function QuestsPanel({ quests, itemsById, onClaim, index }) {
  const [pending, setPending] = useState(null);

  const handleClaim = async (questId) => {
    setPending(questId);
    await onClaim(questId);
    setPending(null);
  };

  const rewardText = (quest) => {
    const rewardItem = quest.reward_item_type_id ? itemsById.get(quest.reward_item_type_id) : null;
    const parts = [
      quest.reward_materials > 0 ? `${quest.reward_materials} materials` : null,
      rewardItem ? `${quest.reward_item_quantity}× ${rewardItem.item_name}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' + ') : 'Bragging rights';
  };

  return (
    <Panel title="Quest board" subtitle="Complete objectives while you play and claim rewards" wide index={index}>
      {quests.length === 0 ? (
        <p className={styles.empty}>No quests are available right now.</p>
      ) : (
        <div className={styles.list}>
          {quests.map((quest) => {
            const started = quest.status !== null && quest.status !== undefined;
            const progress = quest.progress ?? 0;
            const badge = started ? STATUS_BADGE[quest.status] : { label: 'Not Started', tone: 'neutral' };

            return (
              <div key={quest.quest_id} className={styles.questCard}>
                <div className={styles.questTop}>
                  <span className={styles.questTitle}>{quest.title}</span>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </div>
                <p className={styles.questDesc}>{quest.description}</p>
                <Meter tone="quest" value={progress} max={quest.target_value} compact />
                <div className={styles.questFooter}>
                  <span className={styles.questReward}>
                      Progress: {progress}/{quest.target_value} · Reward: <b>{rewardText(quest)}</b>
                  </span>
                  {quest.status === 'completed' && (
                    <Button variant="lantern" size="sm" loading={pending === quest.quest_id} onClick={() => handleClaim(quest.quest_id)}>
                      CLAIM REWARD
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
