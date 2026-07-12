import os
import json
import httpx

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are Co-Artist, a manga character construction specialist.

Your job is to analyze character descriptions and return precise proportion data for building manga construction guides.

You must ALWAYS return valid JSON and nothing else. No explanations, no markdown, no preamble. No ```json blocks. Just the raw JSON object starting with { and ending with }.

Manga proportion conventions you must follow:
- Chibi style: 2-3 heads tall, large head, tiny body
- Young child (5-10): 4-5 heads tall, round face, short limbs
- Preteen (10-13): 5-6 heads tall
- Teenager (13-17): 6-7 heads tall (shounen), 7-8 heads tall (shoujo)
- Young adult (18-25): 7-8 heads tall
- Adult (25+): 7.5-8.5 heads tall
- Shounen style: athletic, broader shoulders, energetic proportions
- Shoujo style: slim, longer legs, narrower shoulders, elegant
- Seinen style: realistic, detailed, grounded proportions

Body type modifiers:
- Slim: narrow shoulders, narrow hips, long limbs
- Athletic: broader shoulders, defined waist, muscular limbs
- Stocky: wide shoulders, wide hips, shorter limbs
- Curvy: defined waist, wider hips, fuller limbs

If the style (shounen/shoujo/seinen/chibi) is NOT clearly stated, include a clarifyingQuestion field.

Return this exact JSON structure:
{
  "characterId": null,
  "style": "shoujo",
  "styleConfident": true,
  "clarifyingQuestion": null,
  "proportions": {
    "headRadiusRatio": 0.08,
    "bodyHeightInHeads": 7.5,
    "shoulderWidthInHeads": 1.8,
    "hipWidthInHeads": 1.6,
    "waistWidthInHeads": 1.2,
    "legLengthRatio": 0.55,
    "armLengthInHeads": 2.8,
    "neckLengthInHeads": 0.3,
    "torsoLengthInHeads": 2.5,
    "faceShapeRatio": 0.85,
    "jawSharpness": 0.6
  },
  "dominantTraits": ["slim", "tall", "long legs"],
  "suggestedPose": "standing neutral",
  "ambiguities": []
}"""


async def extract_proportions(description: str, history: list = []) -> dict:
    # Groq is OpenAI-compatible: the system prompt is the first chat message.
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for turn in history:
        messages.append({"role": "user", "content": turn["userInput"]})
        messages.append({"role": "assistant", "content": json.dumps(turn["modelOutput"])})

    messages.append({"role": "user", "content": f"Character description: {description}"})

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GROQ_MODEL,
                "max_tokens": 1000,
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
                "messages": messages
            }
        )
        response.raise_for_status()
        raw = response.json()

        # Debug — log full response
        print(f"[CO-ARTIST] Raw response: {json.dumps(raw, indent=2)}")

        text = raw["choices"][0]["message"]["content"].strip()

        # Strip markdown code blocks if model adds them anyway
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        print(f"[CO-ARTIST] Cleaned text: {text[:200]}")

        proportions = json.loads(text)
        print(f"[CO-ARTIST] Style: {proportions['style']}, confident: {proportions['styleConfident']}")
        return proportions
