import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import StatChip from '../components/StatChip';
import WorldClockBadge from '../components/WorldClockBadge';
import { useAuth } from '../context/AuthContext';
import { useGameState } from '../hooks/useGameState';
import StatusPanel from '../components/game/StatusPanel';
import InventoryPanel from '../components/game/InventoryPanel';
import CraftingPanel from '../components/game/CraftingPanel';
import UpgradesPanel from '../components/game/UpgradesPanel';
import QuestsPanel from '../components/game/QuestsPanel';
import ProfilePanel from '../components/game/ProfilePanel';
import styles from './GamePage.module.css';

const STATIONS = [
  { id: 'quests', icon: '◈', label: 'QUESTS', title: 'Quest hub', caption: 'Track objectives, rewards, and your next voyage' },
  { id: 'inventory', icon: '▣', label: 'INVENTORY', title: 'Inventory', caption: 'View everything collected from the ocean' },
  { id: 'crafting', icon: '✦', label: 'CRAFTING', title: 'Crafting bench', caption: 'Turn collected materials into useful items' },
  { id: 'upgrades', icon: '⬡', label: 'UPGRADES', title: 'Raft upgrades', caption: 'Expand and protect your raft' },
  { id: 'profile', icon: '◎', label: 'PROFILE', title: 'Survivor profile', caption: 'Manage your survivor account' },
];

/**
 * The camp is the quest hub. It keeps the survivor's objectives and management tools visible,
 * while the raft-and-ocean gameplay scene stays on the separate voyage route.
 */
export default function GamePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { loading, status, itemsById, inventoryItems, craftables, quests, craft, upgrade, claimQuest } = useGameState();
  const [activeStation, setActiveStation] = useState('quests');

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const active = STATIONS.find((station) => station.id === activeStation) || STATIONS[0];

  const renderWorkspace = () => {
    if (activeStation === 'quests') {
      return (
        <>
          <section className={styles.hubHero}>
            <div>
              <span className={styles.hubKicker}>MISSION CONTROL / SURVIVAL OBJECTIVES</span>
              <h1>QUEST HUB</h1>
              <p>Track your objectives, claim rewards, and prepare your raft before setting sail.</p>
            </div>
            <div className={styles.hubLocation}>
              <span>CURRENT LOCATION</span>
              <strong>RAFT CAMP</strong>
              <b>READY TO SAIL</b>
            </div>
          </section>

          <div className={styles.questLayout}>
            <section className={styles.questPrimary} aria-labelledby="quest-board-title">
              <div className={styles.sectionHeading}>
                <span>ACTIVE OBJECTIVES</span>
                <strong id="quest-board-title">Quest board</strong>
                <p>Complete objectives while you play and claim your rewards here.</p>
              </div>
              <QuestsPanel quests={quests} itemsById={itemsById} onClaim={claimQuest} index={0} />
            </section>

            <aside className={styles.hubSidebar} aria-label="Survival summary">
              <StatusPanel status={status} index={1} />
              <section className={styles.sailCard}>
                <span className={styles.sailKicker}>NEXT ACTION</span>
                <h2>Ready for the ocean?</h2>
                <p>Press START VOYAGE when you want to control the raft, collect debris, and face ocean events.</p>
                <div className={styles.sailFacts}>
                  <span><b>Raft tiles</b>{status?.raft_size ?? 1}</span>
                  <span><b>Installed upgrades</b>{status?.upgrades?.length || 0}</span>
                </div>
              </section>
            </aside>
          </div>
        </>
      );
    }

    let panel = null;
    if (activeStation === 'inventory') panel = <InventoryPanel items={inventoryItems} index={0} />;
    if (activeStation === 'crafting') panel = <CraftingPanel craftables={craftables} onCraft={craft} index={0} />;
    if (activeStation === 'upgrades') panel = <UpgradesPanel status={status} onUpgrade={upgrade} index={0} />;
    if (activeStation === 'profile') panel = <ProfilePanel index={0} />;

    return (
      <section className={styles.workspacePage} aria-labelledby="workspace-title">
        <header className={styles.workspaceHeader}>
          <div>
            <span className={styles.workspaceKicker}>{active.label} WORKSPACE</span>
            <h1 id="workspace-title">{active.title}</h1>
            <p>{active.caption}</p>
          </div>
          <span className={styles.workspaceStatus}>CAMP CONSOLE</span>
        </header>
        <div className={styles.workspaceBody}>{panel}</div>
      </section>
    );
  };

  return (
    <div className={styles.gameShell}>
      <header className={styles.hud}>
        <div className={styles.brandBlock}>
          <span className={styles.brandKicker}>CASTAWAY CHRONICLES / QUEST HUB</span>
          <div className={styles.brandLine}>
            <strong className={styles.brandMark}>RAFT CAMP</strong>
            <span className={styles.brandDivider}>/</span>
            <span className={styles.brandUser}>{user?.username || 'UNKNOWN'}</span>
          </div>
        </div>

        <div className={styles.gauges} aria-label="Your survival resources">
          <StatChip icon="materials" value={status?.materials ?? 0} label="Materials" />
          <StatChip icon="hunger" value={status?.hunger ?? 0} label="Hunger" />
          <StatChip icon="raft" value={status?.raft_size ?? 1} label="Raft size" />
        </div>

        <div className={styles.actions}>
          <WorldClockBadge compact />
          <Button variant="lantern" onClick={() => navigate('/voyage')}>
            START VOYAGE
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            SIGN OUT
          </Button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}>
          <span className={styles.loadingMark}>◎</span>
          <span>Loading your quest hub…</span>
        </div>
      ) : (
        <main className={styles.questHub}>
          {renderWorkspace()}

          <nav className={styles.stationDock} aria-label="Raft management options">
            <span className={styles.dockLabel}>MANAGE YOUR RAFT</span>
            <div className={styles.stationButtons}>
              {STATIONS.map((station) => (
                <button
                  key={station.id}
                  type="button"
                  className={`${styles.stationButton} ${activeStation === station.id ? styles.stationButtonActive : ''}`}
                  aria-pressed={activeStation === station.id}
                  onClick={() => setActiveStation(station.id)}
                >
                  <span className={styles.stationIcon} aria-hidden="true">{station.icon}</span>
                  <span>{station.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </main>
      )}
    </div>
  );
}
