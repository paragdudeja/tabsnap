// Small DOM helpers shared by the extension pages

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c != null) node.append(c);
  return node;
}

export const tabs = n => `${n} tab${n === 1 ? "" : "s"}`;

export function ago(ms) {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  const days = Math.round(mins / 1440);
  return days < 30 ? `${days}d ago` : new Date(ms).toLocaleDateString();
}

// Reopen URLs together in a new window, so they don't scatter into the current one
export async function openTabs(urls) {
  if (!urls.length) return;
  if (urls.length > 10 && !confirm(`Open ${urls.length} tabs in a new window?`)) return;
  await chrome.windows.create({ url: urls, focused: true });
}
