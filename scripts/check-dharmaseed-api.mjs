const apiUrl = "https://www.dharmaseed.org/api/1/talks/";

async function post(fields) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  const response = await fetch(apiUrl, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(20_000),
    headers: {
      Accept: "application/json",
      "User-Agent": "Stillpoint contract check (read-only; one record)",
    },
  });
  if (!response.ok) throw new Error(`Dharma Seed returned HTTP ${response.status}`);
  return response.json();
}

const index = await post({ detail: "0" });
if (typeof index.edition !== "string" || !Array.isArray(index.items) || index.items.length === 0) {
  throw new Error("Talk index shape changed");
}

const talkId = index.items[0];
const details = await post({ detail: "1", items: String(talkId) });
const talk = details.items?.[String(talkId)];
if (
  !talk ||
  talk.id !== talkId ||
  typeof talk.title !== "string" ||
  typeof talk.audio_url !== "string"
) {
  throw new Error("Talk detail shape changed");
}

console.log(`Dharma Seed contract is compatible (edition ${index.edition}, talk ${talkId}).`);
