import Panel from '../Panel';
import styles from './game.module.css';

const RARITY_COLOR = {
  common: 'var(--rarity-common)',
  uncommon: 'var(--rarity-uncommon)',
  rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
};

/** The survivor's hold — every item type they own, tinted by rarity along its left edge. */
export default function InventoryPanel({ items, index }) {
  return (
    <Panel title="Inventory" subtitle="Items you collected or crafted" wide index={index}>
      {items.length === 0 ? (
        <p className={styles.empty}>Your inventory is empty. Start a voyage and sail over debris to collect items.</p>
      ) : (
        <div className={styles.invGrid}>
          {items.map(({ item, quantity }) => {
            const color = RARITY_COLOR[item.rarity] || RARITY_COLOR.common;
            return (
              <div key={item.item_type_id} className={styles.invTile} style={{ borderLeftColor: color }}>
                <div className={styles.invName}>{item.item_name}</div>
                <div className={styles.invMeta}>
                  <span className={styles.rarityLabel} style={{ color }}>
                    {item.rarity}
                  </span>
                  <span className={styles.invQty}>×{quantity}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
