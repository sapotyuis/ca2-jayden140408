import { createClassNames } from '../lib/classNames.js';
import { escapeHtml } from '../lib/dom.js';

const badgeStyles = createClassNames('badge');
const buttonStyles = createClassNames('button');
const meterStyles = createClassNames('meter');
const panelStyles = createClassNames('panel');
const pixel = createClassNames('pixel-icon');
const stat = createClassNames('stat-chip');
const clock = createClassNames('world-clock-badge');

const iconFile = { materials: 'materials.png', raft: 'raft.png', sun: 'sun.png', moon: 'moon.png' };

export const pixelIcon = (name, label = '') => {
  const decorative = !label;
  return `<img class="${pixel.icon}" src="/assets/pixel-icons/${iconFile[name] || iconFile.raft}" alt="${escapeHtml(label)}"${decorative ? ' aria-hidden="true"' : ''}>`;
};

export const button = ({ label, variant = 'lantern', size = 'md', action = '', disabled = false, loading = false, className = '', style = '', type = 'button' }) => `
  <button type="${type}" class="${buttonStyles.btn} ${buttonStyles[variant]} ${buttonStyles[size]} ${loading ? buttonStyles.loading : ''} ${className}" data-action="${action}"${style ? ` style="${style}"` : ''}${disabled || loading ? ' disabled' : ''}>
    ${loading ? `<span class="${buttonStyles.spinner}" aria-hidden="true"></span>` : ''}
    <span class="${loading ? buttonStyles.hiddenLabel : ''}">${escapeHtml(label)}</span>
  </button>`;

export const badge = (label, tone = 'neutral') => `<span class="${badgeStyles.badge} ${badgeStyles[tone] || badgeStyles.neutral}">${escapeHtml(label)}</span>`;

export const panel = ({ title = '', subtitle = '', content = '', wide = false, index = 0 }) => `
  <section class="${panelStyles.panel} ${wide ? panelStyles.wide : ''}" style="animation-delay:${index * 70}ms">
    ${title || subtitle ? `<header class="${panelStyles.head}"><div>${title ? `<h2 class="${panelStyles.title}">${escapeHtml(title)}</h2>` : ''}${subtitle ? `<p class="${panelStyles.subtitle}">${escapeHtml(subtitle)}</p>` : ''}</div></header>` : ''}
    ${content}
  </section>`;

export const meter = ({ label, value = 0, max = 1, valueText = value, tone = 'lantern', compact = false }) => {
  const percentage = Math.max(0, Math.min(100, (Number(value) / Math.max(Number(max) || 1, 1)) * 100));
  return `<div class="${meterStyles.meter} ${compact ? meterStyles.compact : ''}">
    <div class="${meterStyles.labelRow}"><span>${escapeHtml(label)}</span><span class="${meterStyles.value}">${escapeHtml(valueText)}</span></div>
    <div class="${meterStyles.track}"><span class="${meterStyles.fill} ${meterStyles[tone] || meterStyles.lantern}" style="width:${percentage}%"></span></div>
  </div>`;
};

export const statChip = (icon, value, label) => `<div class="${stat.chip}">
  <span class="${stat.icon}" aria-hidden="true">${pixelIcon(icon)}</span>
  <span class="${stat.body}"><span class="${stat.value}" data-pulse>${escapeHtml(value)}</span><span class="${stat.label}">${escapeHtml(label)}</span></span>
</div>`;

const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export const worldClock = (time, compact = false) => `<div class="${clock.clock} ${compact ? clock.compact : ''} ${clock[time.visualPhase] || clock.night}" data-world-clock>
  <span class="${clock.icon}" aria-hidden="true">${pixelIcon(time.visualPhase === 'day' || time.visualPhase === 'dawn' ? 'sun' : 'moon')}</span>
  <span class="${clock.copy}"><span class="${clock.label}">${escapeHtml(time.label)}</span><strong>${formatTime(time.secondsRemaining)}</strong></span>
  <span class="${clock.track}" aria-hidden="true"><span class="${clock.fill}" style="width:${Math.max(3, time.progress * 100)}%"></span></span>
</div>`;

export const refreshWorldClocks = (time) => {
  document.querySelectorAll('[data-world-clock]').forEach((node) => {
    const compact = node.classList.contains(clock.compact);
    node.outerHTML = worldClock(time, compact);
  });
};
