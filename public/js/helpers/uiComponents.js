// Provides reusable HTML builders for buttons, panels, badges, meters, icons, statistics, and the world clock.
import { createClassNames } from './cssClassNames.js';
import { escapeHtml } from './domHelpers.js';

const badgeStyles = createClassNames('badge');
const buttonStyles = createClassNames('button');
const meterStyles = createClassNames('meter');
const panelStyles = createClassNames('panel');
const pixel = createClassNames('pixel-icon');
const stat = createClassNames('stat-chip');
const clock = createClassNames('world-clock-badge');

const iconFile = { materials: 'materials.png', raft: 'raft.png', sun: 'sun.png', moon: 'moon.png' };

export const pixelIcon = (name) => `<img class="${pixel.icon}" src="/assets/pixel-icons/${iconFile[name]}" alt="" aria-hidden="true">`;

export const button = ({ label, variant = 'lantern', size = 'md', action = '', disabled = false, style = '', type = 'button' }) => `
  <button type="${type}" class="${buttonStyles.btn} ${buttonStyles[variant]} ${buttonStyles[size]}" data-action="${action}"${style ? ` style="${style}"` : ''}${disabled ? ' disabled' : ''}>
    <span>${escapeHtml(label)}</span>
  </button>`;

export const badge = (label, tone = 'neutral') => `<span class="${badgeStyles.badge} ${badgeStyles[tone]}">${escapeHtml(label)}</span>`;

export const panel = ({ title = '', subtitle = '', content = '', wide = false, index = 0 }) => `
  <section class="${panelStyles.panel} ${wide ? panelStyles.wide : ''}" style="animation-delay:${index * 70}ms">
    ${title || subtitle ? `<header class="${panelStyles.head}"><div>${title ? `<h2 class="${panelStyles.title}">${escapeHtml(title)}</h2>` : ''}${subtitle ? `<p class="${panelStyles.subtitle}">${escapeHtml(subtitle)}</p>` : ''}</div></header>` : ''}
    ${content}
  </section>`;

export const meter = ({ label, value = 0, max = 1, valueText = value, tone = 'lantern', compact = false }) => {
  const percentage = Math.max(0, Math.min(100, (Number(value) / Math.max(Number(max) || 1, 1)) * 100));
  return `<div class="${meterStyles.meter} ${compact ? meterStyles.compact : ''}">
    <div class="${meterStyles.labelRow}"><span>${escapeHtml(label)}</span><span class="${meterStyles.value}">${escapeHtml(valueText)}</span></div>
    <div class="${meterStyles.track}"><span class="${meterStyles.fill} ${meterStyles[tone]}" style="width:${percentage}%"></span></div>
  </div>`;
};

export const statChip = (icon, value, label) => `<div class="${stat.chip}">
  <span class="${stat.icon}" aria-hidden="true">${pixelIcon(icon)}</span>
  <span class="${stat.body}"><span class="${stat.value}" data-pulse>${escapeHtml(value)}</span><span class="${stat.label}">${escapeHtml(label)}</span></span>
</div>`;

const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export const worldClock = (time) => `<div class="${clock.clock} ${clock.compact} ${clock[time.visualPhase]}" data-world-clock>
  <span class="${clock.icon}" aria-hidden="true">${pixelIcon(time.visualPhase === 'day' || time.visualPhase === 'dawn' ? 'sun' : 'moon')}</span>
  <span class="${clock.copy}"><span class="${clock.label}">${escapeHtml(time.label)}</span><strong>${formatTime(time.secondsRemaining)}</strong></span>
  <span class="${clock.track}" aria-hidden="true"><span class="${clock.fill}" style="width:${Math.max(3, time.progress * 100)}%"></span></span>
</div>`;

export const refreshWorldClocks = (time) => {
  document.querySelectorAll('[data-world-clock]').forEach((node) => {
    node.outerHTML = worldClock(time);
  });
};
