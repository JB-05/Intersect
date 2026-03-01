"""Constrained Malayalam response from LLM via OpenRouter (OSS models). Temperature <= 0.3, context-only."""
import logging

from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a dementia support assistant. You help the user with simple, factual answers.
- The user may speak in English or Malayalam. Always respond only in Malayalam, regardless of the language they use.
- Use only the provided context to answer. If the information is not in the context, say you do not know (എനിക്ക് അറിയില്ല or similar).
- Do not provide medical advice.
- Do not invent names, appointments, or any information.
- Keep responses short and calm."""

OPENROUTER_BASE = "https://openrouter.ai/api/v1"


def generate_response(transcript: str, intent: str, context: str) -> str:
    """
    Generate Malayalam response using OpenRouter (OpenAI-compatible API, OSS models).
    Temperature <= 0.3. Does not log the full prompt (privacy).
    """
    api_key = getattr(settings, "openrouter_api_key", None) or ""
    model = getattr(settings, "openrouter_model", None) or "meta-llama/llama-3.2-3b-instruct:free"
    if not api_key:
        logger.warning("LLM: OPENROUTER_API_KEY not set; returning fallback.")
        return "ക്ഷമിക്കണം, ഇപ്പോൾ ഈ സേവനം ലഭ്യമല്ല."  # Service unavailable

    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("LLM: openai package not installed; returning fallback.")
        return "ക്ഷമിക്കണം, ഈ സേവനം ക്രമീകരിച്ചിട്ടില്ല."

    client = OpenAI(base_url=OPENROUTER_BASE, api_key=api_key)
    # Include intent so replies vary by question type (medication vs date vs etc.)
    user_content = f"Intent: {intent}\n\nUser said: {transcript}"
    if context:
        user_content = f"Intent: {intent}\n\nContext:\n{context}\n\nUser said: {transcript}"

    logger.info("LLM: transcript_len=%d intent=%s context_len=%d", len(transcript or ""), intent, len(context or ""))

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.5,
            max_tokens=128,
        )
        msg = resp.choices[0].message if resp.choices else None
        if msg and msg.content:
            return msg.content.strip()
        logger.warning("LLM: empty completion from API; returning fallback.")
    except Exception as e:
        err_str = str(e)
        if "429" in err_str:
            logger.warning("LLM: OpenRouter rate limit (429); ask user to retry.")
            return "ക്ഷമിക്കണം, ഇപ്പോൾ ആവശ്യം കൂടുതലാണ്. കുറച്ച് നിമിഷങ്ങൾക്ക് ശേഷം വീണ്ടും ശ്രമിക്കുക."
        if "404" in err_str and ("data policy" in err_str.lower() or "privacy" in err_str.lower()):
            logger.warning(
                "LLM: OpenRouter 404 - free models disabled by data policy. "
                "Enable at https://openrouter.ai/settings/privacy"
            )
            return "ക്ഷമിക്കണം, ഇപ്പോൾ ഈ സേവനം ലഭ്യമല്ല. സെറ്റിംഗ്സ് പരിശോധിക്കുക."
        logger.warning("LLM: OpenRouter API error: %s", e, exc_info=True)
        return "ക്ഷമിക്കണം, ഉത്തരം നൽകാൻ കഴിഞ്ഞില്ല."
    return "ക്ഷമിക്കണം, ഉത്തരം നൽകാൻ കഴിഞ്ഞില്ല."
