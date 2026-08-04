import { useState } from 'react';
import Panel from '../Panel';
import Button from '../Button';
import styles from './game.module.css';

/**
 * The crafting bench. Each recipe shows its ingredients with have/need, marking any you're short
 * on in red and disabling Craft until you hold them all — the same rule the backend enforces, so
 * the button state matches what the server will actually allow.
 */
export default function CraftingPanel({ craftables, onCraft, index }) {
  const [pending, setPending] = useState(null);

  const handleCraft = async (resultId) => {
    setPending(resultId);
    await onCraft(resultId);
    setPending(null);
  };

  return (
    <Panel title="Crafting bench" subtitle="Use materials from your inventory to make items" wide index={index}>
      {craftables.length === 0 ? (
        <p className={styles.empty}>No crafting recipes are available right now.</p>
      ) : (
        <div className={styles.list}>
          {craftables.map(({ resultId, result, ingredients, canCraft }) => (
            <div key={resultId} className={styles.row}>
              <div>
                <div className={styles.rowName}>{result.item_name}</div>
                <div className={styles.rowMeta}>
                  Required: {' '}
                  {ingredients.map((ing, i) => (
                    <span key={i} className={ing.short ? styles.short : ''}>
                      {ing.need}× {ing.name} (you have {ing.have}){i < ingredients.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                variant="lantern"
                size="sm"
                disabled={!canCraft}
                loading={pending === resultId}
                onClick={() => handleCraft(resultId)}
              >
                CRAFT ITEM
              </Button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
