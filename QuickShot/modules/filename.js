import { formatDateParts } from "./time.js";

export function buildFilename({ format, includeDate, includeTime }, date = new Date()) {
  const { yyyy, mm, dd, hh, min, ss } = formatDateParts(date);
  const parts = ["screenshot"];
  if (includeDate) parts.push(`${yyyy}${mm}${dd}`);
  if (includeTime) parts.push(`${hh}${min}${ss}`);
  const ext = String(format || "png").toLowerCase() === "jpg" ? "jpg" : "png";
  return `${parts.join("-")}.${ext}`;
}

