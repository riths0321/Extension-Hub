export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatDateParts(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return { yyyy, mm, dd, hh, min, ss };
}

export function timeAgo(ts) {
  const deltaMs = Math.max(0, Date.now() - ts);
  const sec = Math.floor(deltaMs / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} mo ago`;
  const year = Math.floor(month / 12);
  return `${year} yr ago`;
}

