// medal bypass api - get watermark-free clip url from medal.tv

function configureURL(input) {
  if (!input || !String(input).trim()) return null;
  let url = String(input).trim();
  if (!url.toLowerCase().includes("medal")) {
    if (!url.includes("/")) return "https://medal.tv/?contentId=" + url;
    return null;
  }
  if (!url.toLowerCase().startsWith("http")) url = "https://" + url;
  url = url.replace("?theater=true", "");
  return url;
}

function checkURL(url) {
  try {
    if (!url) return false;
    return new URL(url).hostname.toLowerCase().includes("medal");
  } catch {
    return false;
  }
}

function extractClipID(input) {
  if (!input) return null;
  const s = String(input);
  const clipMatch = s.match(/\/clips\/([^\/?&]+)/);
  const contentMatch = s.match(/[?&]contentId=([^&]+)/);
  if (clipMatch) return clipMatch[1];
  if (contentMatch) return contentMatch[1];
  if (!s.includes("/") && s.length > 0) return s;
  return null;
}

async function getVideoURL(input) {
  const clipId = extractClipID(input);
  const fetchURL = clipId ? `https://medal.tv/clips/${clipId}` : input;

  const res = await fetch(fetchURL);
  const html = await res.text();

  const contentUrl = html.split('"contentUrl":"')[1]?.split('","')[0];
  if (contentUrl) return contentUrl;

  const metaUrl = html.split('property="og:video:url" content="')[1]?.split('"')[0];
  if (metaUrl) return metaUrl;

  return null;
}

async function runHandler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ valid: false, reasoning: "method not allowed" });
  }

  const raw = req.query.url || req.query.id || "";
  const url = configureURL(raw);

  if (!url || !checkURL(url)) {
    return res.status(400).json({ valid: false, reasoning: "invalid url or id" });
  }

  try {
    const src = await getVideoURL(url);
    if (src) {
      return res.status(200).json({ valid: true, src });
    }
    return res.status(404).json({ valid: false, reasoning: "no clip found" });
  } catch (err) {
    return res.status(500).json({ valid: false, reasoning: "error fetching clip" });
  }
}

module.exports = runHandler;
