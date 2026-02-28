function drawChart(wallet) {
  const canvas = document.getElementById("chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
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
    ctx.fillStyle = "#5c6682";
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("No expense data to visualize yet.", width / 2, height / 2);
    return;
  }

  const sorted = [...entries].sort((a, b) => b[1] - a[1]);

  drawChartBase(ctx, cx, cy, radius);

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

    ctx.strokeStyle = "rgba(255, 252, 245, 0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();

    start += angle;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#fffaf1";
  ctx.fill();
  ctx.strokeStyle = "rgba(191, 162, 125, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#6d6657";
  ctx.font = '11px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("Expenses", cx, cy - 2);
  ctx.fillStyle = "#2f2a1f";
  ctx.font = 'bold 14px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillText(`₹${Math.round(sum)}`, cx, cy + 14);

  drawLegend(ctx, sorted, sum, width, height);
}

function drawLegend(ctx, entries, sum, width, height) {
  const legendX = Math.floor(width * 0.6);
  let legendY = 28;

  ctx.font = '12px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.textAlign = "left";
  entries.slice(0, 7).forEach(([category, value]) => {
    const color = colorFromCategory(category);
    const pct = Math.round((value / sum) * 100);

    ctx.fillStyle = color;
    roundRect(ctx, legendX, legendY - 11, 12, 12, 3);
    ctx.fill();

    ctx.fillStyle = "#2f2a1f";
    ctx.fillText(`${category} (${pct}%)`, legendX + 16, legendY);
    legendY += 22;
  });
}

function drawChartBase(ctx, cx, cy, radius) {
  const base = ctx.createRadialGradient(cx - 8, cy - 10, radius * 0.2, cx, cy, radius);
  base.addColorStop(0, "rgba(255, 248, 234, 1)");
  base.addColorStop(1, "rgba(234, 220, 194, 0.9)");

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
    ["#1f6f78", "#45b29d"],
    ["#b4792e", "#e3b46a"],
    ["#2d4f8b", "#5d82c4"],
    ["#7a3e65", "#b26795"],
    ["#2d6a4f", "#52b788"],
    ["#8a5a44", "#c38e70"],
    ["#6b705c", "#a5a58d"]
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
