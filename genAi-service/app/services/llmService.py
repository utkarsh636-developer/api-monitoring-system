from __future__ import annotations

import json

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.tools.metricsTools import query_endpoint_metrics


def _build_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model="gemini-3.5-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.2,
    )


def _extract_text(msg: AIMessage) -> str:
    """
    Safely extracts text string from an AIMessage across all Gemini response shapes.
    """
    if getattr(msg, "text", None):
        return msg.text.strip()
    if isinstance(msg.content, str):
        return msg.content.strip()
    if isinstance(msg.content, list):
        parts = []
        for item in msg.content:
            if isinstance(item, dict) and "text" in item:
                parts.append(item["text"])
            elif isinstance(item, str):
                parts.append(item)
        return "".join(parts).strip()
    return ""


def get_llm_response(prompt: str) -> str:
    """
    Simple single-turn LLM call. Returns the clean text response.
    """
    try:
        llm = _build_llm()
        response = llm.invoke(prompt)
        return _extract_text(response)
    except Exception as e:
        raise RuntimeError(f"LLM service call failed: {str(e)}") from e


def query_metrics_with_llm(user_prompt: str, client_id: str) -> str:
    """
    Tool-calling loop:
      1. Send the user's natural-language prompt to Gemini with the
         query_endpoint_metrics tool bound.
      2. If the model issues a tool call, execute it (injecting client_id
         ourselves so the model can never override it).
      3. Feed the tool result back to the model for a final NL summary.
      4. If the model never calls the tool, return a clear message asking
         for a more specific question.

    Args:
        user_prompt: Natural-language question from the user.
        client_id:   Client identifier – always injected server-side.

    Returns:
        A natural-language summary string.
    """
    try:
        llm = _build_llm()
        llm_with_tools = llm.bind_tools([query_endpoint_metrics])

        system_ctx = (
            "You are an API monitoring assistant. "
            "When the user asks about API metrics, latency, errors, or traffic, "
            "always call the query_endpoint_metrics tool to fetch real data. "
            "Important: User terms like 'checkout' or 'orders' often represent endpoint paths "
            "(e.g. '/api/v1/checkout'). Prefer passing such terms as `endpoint` or leaving "
            "`service_name` empty if unsure so all matching endpoints are returned. "
            "Summarise the results clearly in plain English."
        )

        messages: list = [
            HumanMessage(content=f"{system_ctx}\n\nUser question: {user_prompt}")
        ]

        # ── First model call (with tools bound) ───────────────────────────────
        ai_response: AIMessage = llm_with_tools.invoke(messages)

        # ── Check for tool calls ──────────────────────────────────────────────
        if not ai_response.tool_calls:
            text = _extract_text(ai_response)
            return (
                text
                or (
                    "I couldn't find a specific metric question in your request. "
                    "Try asking something like: 'Show me the average latency for "
                    "the checkout service in the last hour.'"
                )
            )

        # ── Execute each tool call ────────────────────────────────────────────
        messages.append(ai_response)  # append assistant turn

        for tool_call in ai_response.tool_calls:
            if tool_call["name"] != "query_endpoint_metrics":
                continue  # ignore unexpected tool calls

            # Build args from the model – then override client_id for security
            args: dict = dict(tool_call["args"])
            args["client_id"] = client_id  # server-side injection

            try:
                tool_result = query_endpoint_metrics.invoke(args)
                tool_content = json.dumps(tool_result, default=str)
            except Exception as db_err:
                tool_content = json.dumps({"error": str(db_err)})

            messages.append(
                ToolMessage(
                    content=tool_content,
                    tool_call_id=tool_call["id"],
                )
            )

        # ── Second model call (plain LLM for text summary) ───────────────────
        final_response: AIMessage = llm.invoke(messages)
        summary = _extract_text(final_response)

        if not summary:
            summary = "No metrics data found for the specified service and time window."

        return summary

    except Exception as e:
        raise RuntimeError(f"query_metrics_with_llm failed: {str(e)}") from e
