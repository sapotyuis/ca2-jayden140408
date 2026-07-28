import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OceanViewport from '../components/OceanViewport';
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
  { id: 'overview', icon: '◈', label: 'Deck', title: 'Raft overview', caption: 'Vitals and active objectives' },
  { id: 'inventory', icon: '▣', label: 'Hold', title: 'Your inventory', caption: 'Everything recovered from the sea' },
  { id: 'crafting', icon: '✦', label: 'Craft', title: 'Crafting bench', caption: 'Turn salvage into survival' },
  { id: 'upgrades', icon: '⬡', label: 'Build', title: 'Raft upgrades', caption: 'Expand your floating home' },
  { id: 'profile', icon: '◎', label: 'Log', title: 'Survivor log', caption: 'Account and raft records' },
];

/**
 * The camp is a playable space first and a management screen second. The sea and raft stay
 * visible at all times; the existing feature panels open as a single focused station drawer
 * from the bottom deck rail, keeping the survival-game rhythm instead of presenting six equal
 * dashboard cards at once.
 */
export default function GamePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { loading, status, itemsById, inventoryItems, craftables, quests, craft, upgrade, claimQuest } = useGameState();
  const [activeStation, setActiveStation] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const active = STATIONS.find((station) => station.id === activeStation) || STATIONS[0];

  const renderStation = () => {
    if (activeStation === 'inventory') return <InventoryPanel items={inventoryItems} index={0} />;
    if (activeStation === 'crafting') return <CraftingPanel craftables={craftables} onCraft={craft} index={0} />;
    if (activeStation === 'upgrades') return <UpgradesPanel status={status} onUpgrade={upgrade} index={0} />;
    if (activeStation === 'profile') return <ProfilePanel index={0} />;

    return (
      <div className={styles.overviewStack}>
        <StatusPanel status={status} index={0} />
        <QuestsPanel quests={quests} itemsById={itemsById} onClaim={claimQuest} index={1} />
      </div>
    );
  };

  return (
    <div className={styles.gameShell}>
      <OceanViewport mode="camp" interactive={false} collectiblesEnabled fetchStatus />

      <header className={styles.hud}>
        <div className={styles.brandBlock}>
          <span className={styles.brandKicker}>CASTAWAY CHRONICLES / SURVIVAL 01</span>
          <div className={styles.brandLine}>
            <strong className={styles.brandMark}>RAFT CAMP</strong>
            <span className={styles.brandDivider}>/</span>
            <span className={styles.brandUser}>{user?.username || 'UNKNOWN'}</span>
          </div>
        </div>

        <div className={styles.gauges} aria-label="Survival resources">
          <StatChip icon="🪵" value={status?.materials ?? 0} label="Materials" />
          <StatChip icon="🍖" value={status?.hunger ?? 0} label="Hunger" />
          <StatChip icon="⛵" value={status?.raft_size ?? 1} label="Raft size" />
        </div>

        <div className={styles.actions}>
          <WorldClockBadge compact />
          <Button variant="lantern" onClick={() => navigate('/voyage')}>
            SET SAIL
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            EXIT
          </Button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}>
          <span className={styles.loadingMark}>◎</span>
          <span>Charting the raft…</span>
        </div>
      ) : (
        <main className={styles.stage}>
          <div className={styles.locationReadout}>
            <span className={styles.readoutLabel}>LOCATION</span>
            <strong>OPEN OCEAN / RAFT CAMP</strong>
            <span className={styles.readoutSignal}>● LIVE</span>
          </div>

          <div className={styles.raftReadout}>
            <span className={styles.readoutLabel}>CURRENT RAFT</span>
            <strong>{status?.raft_size ?? 1} TILES AFLOAT</strong>
            <span>{status?.upgrades?.length || 0} upgrades installed</span>
          </div>

          <div className={styles.centerMarker} aria-hidden="true">
            <span />
            <span />
          </div>

          <div className={styles.survivalPrompt}>
            <span className={styles.promptKey}>CAMP CONSOLE</span>
            <strong>Choose a station below</strong>
            <span>Manage the raft without leaving the open water.</span>
          </div>

          {activeStation && (
            <aside className={styles.stationDrawer} aria-label={`${active.label} station`}>
              <div className={styles.drawerHeader}>
                <div>
                  <span className={styles.drawerKicker}>{active.label.toUpperCase()} STATION</span>
                  <h1>{active.title}</h1>
                  <p>{active.caption}</p>
                </div>
                <button className={styles.closeDrawer} type="button" onClick={() => setActiveStation(null)} aria-label="Close station panel">
                  ×
                </button>
              </div>
              <div className={styles.drawerBody}>{renderStation()}</div>
            </aside>
          )}

          <nav className={styles.stationDock} aria-label="Raft stations">
            <span className={styles.dockLabel}>RAFT STATIONS</span>
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
