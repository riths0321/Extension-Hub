function drawChart(wallet) {
  const canvas = document.getElementById("chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const theme = getChartTheme();
  const width = canvas.width;
  const height = canvas.height;
  const cx = Math.floor(width * 0.34);
  const cy = Math.floor(height * 0.5);
  const radius = 72;
  const innerRadius = 38;

  const totals = {};
  wallet.forEach((item) => {
    if (item.type !== "expense") return;
    const category = item.category || "Other";
    totals[category] = (totals[category] || 0) + Number(item.amount || 0);
  });

  const entries = Object.entries(totals).filter(([, value]) => value > 0);
  const sum = entries.reduce((acc, [, value]) => acc + value, 0);

  ctx.clearRect(0, 0, width, height);

  if (!sum) {
    ctx.fillStyle = theme.textMuted;
    ctx.font = theme.labelFont;
    ctx.textAlign = "center";
    ctx.fillText("No expense data to visualize yet.", width / 2, height / 2);
    return;
  }

  const sorted = [...entries].sort((a, b) => b[1] - a[1]);

  drawChartBase(ctx, cx, cy, radius, theme);

  let start = -Math.PI / 2;
  sorted.forEach(([category, value], index) => {
    const angle = (value / sum) * Math.PI * 2;
    const sliceGradient = createSliceGradient(ctx, cx, cy, radius, index, category);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = sliceGradient;
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
    ctx.lineWidth = 2;
    ctx.stroke();

    start += angle;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = theme.surface;
  ctx.fill();
  ctx.strokeStyle = theme.strokeStrong;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = theme.textMuted;
  ctx.font = theme.captionFont;
  ctx.textAlign = "center";
  ctx.fillText("Expenses", cx, cy - 2);
  ctx.fillStyle = theme.text;
  ctx.font = theme.valueFont;
  ctx.fillText(`₹${Math.round(sum)}`, cx, cy + 14);

  drawLegend(ctx, sorted, sum, width, theme);
}

function drawLegend(ctx, entries, sum, width, theme) {
  const legendX = Math.floor(width * 0.6);
  let legendY = 28;

  ctx.font = theme.labelFont;
  ctx.textAlign = "left";
  entries.slice(0, 7).forEach(([category, value]) => {
    const color = colorFromCategory(category);
    const pct = Math.round((value / sum) * 100);

    ctx.fillStyle = color;
    roundRect(ctx, legendX, legendY - 11, 12, 12, 3);
    ctx.fill();

    ctx.fillStyle = theme.text;
    ctx.fillText(`${category} (${pct}%)`, legendX + 16, legendY);
    legendY += 22;
  });
}

function drawChartBase(ctx, cx, cy, radius, theme) {
  const base = ctx.createRadialGradient(cx - 8, cy - 10, radius * 0.2, cx, cy, radius);
  base.addColorStop(0, theme.primarySoft);
  base.addColorStop(1, theme.primarySofter);

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
  ctx.fillStyle = base;
  ctx.fill();
}

function createSliceGradient(ctx, cx, cy, radius, index, category) {
  const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  const [c1, c2] = getPremiumPair(index, category);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  return grad;
}

function colorFromCategory(text) {
  return getPremiumPair(0, text)[0];
}

function getPremiumPair(index, text) {
  const pairs = [
    ["#2563eb", "#60a5fa"],
    ["#1d4ed8", "#3b82f6"],
    ["#0ea5e9", "#38bdf8"],
    ["#0284c7", "#7dd3fc"],
    ["#1e40af", "#2563eb"],
    ["#0369a1", "#0ea5e9"],
    ["#60a5fa", "#bfdbfe"]
  ];
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = (Math.abs(hash) + index) % pairs.length;
  return pairs[idx];
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function getChartTheme() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;

  return {
    text: read("--ink", "#111111"),
    textMuted: read("--ink2", "#6b7280"),
    surface: read("--surface", "#ffffff"),
    strokeStrong: "rgba(37, 99, 235, 0.18)",
    primarySoft: "rgba(219, 234, 254, 1)",
    primarySofter: "rgba(191, 219, 254, 0.95)",
    captionFont: '600 11px "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    labelFont: '600 12px "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    valueFont: '700 14px "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  };
}
