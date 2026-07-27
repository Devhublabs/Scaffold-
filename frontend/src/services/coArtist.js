const PYTHON_API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:8000";


async function authenticatedPost(path, token, body) {
  const response = await fetch(`${PYTHON_API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Co-Artist request failed");
  }

  return data;
}


export async function createCoArtistGuide({
  description,
  token,
  characterId,
}) {
  const analysis = await authenticatedPost(
    "/api/co-artist/proportions",
    token,
    { description, history: [] },
  );
  const guide = await authenticatedPost(
    "/api/co-artist/skeleton",
    token,
    {
      characterId,
      proportions: analysis.proportions || {},
      angles: null,
    },
  );

  return { analysis, guide };
}
