from __future__ import annotations

import json
import logging

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.tools.metricsTools import query_endpoint_metrics

# Module-level logger — set to INFO; suppress by raising this module's level to WARNING
logger = logging.getLogger(__name__)


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
      2. If the model decides NOT to call the tool (vague query), it responds
         with a clarifying question — that text is returned directly.
      3. If the model issues a tool call, execute it (injecting client_id
         server-side for security) and feed the result back for a NL summary.
      4. "No data found" is ONLY returned when the tool ran and returned 0 rows.

    Args:
        user_prompt: Natural-language question from the user.
        client_id:   Client identifier — always injected server-side.

    Returns:
        A natural-language summary string, or a clarifying question.
    """
    try:
        llm = _build_llm()
        llm_with_tools = llm.bind_tools([query_endpoint_metrics])

        system_ctx = (
            "You are an API monitoring assistant with access to a metrics database. "
            "\n\n"
            "WHEN TO CALL THE TOOL:\n"
            "Call query_endpoint_metrics only when the user's query clearly specifies "
            "enough to run a meaningful search — i.e. at least one of: a service name, "
            "an endpoint path, or a specific metric (latency, errors, total hits). "
            "A rough time range is helpful but not strictly required (default to 60 minutes). "
            "User terms like 'checkout' or 'orders' often refer to endpoint paths "
            "(e.g. '/api/v1/checkout') — pass them as the `endpoint` parameter, not `service_name`, "
            "unless the user explicitly says 'service'.\n\n"
            "WHEN TO ASK FOR CLARIFICATION:\n"
            "If the query is too vague to confidently fill any useful parameter "
            "(e.g. 'how's my API doing', 'is everything okay', 'any issues?'), "
            "do NOT call the tool with guessed values. "
            "Instead, respond with a short, specific clarifying question asking: "
            "which service or endpoint they mean, which metric (latency, errors, traffic), "
            "and what time range they care about.\n\n"
            "Summarise tool results clearly in plain English."
        )

        messages: list = [
            HumanMessage(content=f"{system_ctx}\n\nUser question: {user_prompt}")
        ]

        # ── Turn 1: model decides whether to call the tool ────────────────────
        ai_response: AIMessage = llm_with_tools.invoke(messages)

        # ── DEBUG: Log whether the model called the tool or responded in text ─
        if ai_response.tool_calls:
            logger.info(
                "[llmService] Model chose to call tool. tool_calls count=%d",
                len(ai_response.tool_calls),
            )
        else:
            logger.info(
                "[llmService] Model responded with plain text (no tool call). "
                "Likely a clarification response."
            )

        # ── No tool call → return clarifying question or plain answer directly ─
        if not ai_response.tool_calls:
            clarification = _extract_text(ai_response)
            return (
                clarification
                or (
                    "Could you clarify your question? Please specify which service "
                    "or endpoint you're asking about, what metric you care about "
                    "(e.g. latency, error rate, traffic), and the time range."
                )
            )

        # ── Execute each tool call ────────────────────────────────────────────
        messages.append(ai_response)  # append assistant turn

        tool_ran = False
        for tool_call in ai_response.tool_calls:
            if tool_call["name"] != "query_endpoint_metrics":
                logger.info(
                    "[llmService] Ignoring unexpected tool call: %s", tool_call["name"]
                )
                continue

            # Build args from the model – then override client_id for security
            raw_args: dict = dict(tool_call["args"])
            raw_args["client_id"] = client_id  # server-side tenant injection

            # ── DEBUG: Log exact args the model chose ─────────────────────────
            logger.info(
                "[llmService] Executing tool call '%s' with args:\n"
                "  client_id        = %s  (server-injected)\n"
                "  service_name     = %s\n"
                "  endpoint         = %s\n"
                "  method           = %s\n"
                "  time_range_min   = %s\n"
                "  metric           = %s\n"
                "  threshold        = %s\n"
                "  comparison       = %s",
                tool_call["name"],
                raw_args.get("client_id"),
                raw_args.get("service_name"),
                raw_args.get("endpoint"),
                raw_args.get("method"),
                raw_args.get("time_range_minutes"),
                raw_args.get("metric"),
                raw_args.get("threshold"),
                raw_args.get("comparison"),
            )

            try:
                tool_result = query_endpoint_metrics.invoke(raw_args)
                tool_content = json.dumps(tool_result, default=str)
                logger.info(
                    "[llmService] Tool returned %d row(s).",
                    len(tool_result) if isinstance(tool_result, list) else 0,
                )
            except Exception as db_err:
                logger.error("[llmService] Tool execution failed: %s", db_err)
                tool_content = json.dumps({"error": str(db_err)})

            messages.append(
                ToolMessage(
                    content=tool_content,
                    tool_call_id=tool_call["id"],
                )
            )
            tool_ran = True

        if not tool_ran:
            # All tool calls were for unexpected tool names — nothing ran
            return (
                "I wasn't able to run the metrics query. "
                "Please try rephrasing your question."
            )

        # ── Turn 2: plain LLM summarises the tool result ─────────────────────
        final_response: AIMessage = llm.invoke(messages)
        summary = _extract_text(final_response)

        # "No data found" ONLY here — when the tool actually ran and returned 0 rows
        if not summary:
            summary = (
                "No metrics data was found for the specified filters and time window. "
                "Try broadening the time range or checking the service or endpoint name."
            )

        return summary

    except Exception as e:
        raise RuntimeError(f"query_metrics_with_llm failed: {str(e)}") from e
