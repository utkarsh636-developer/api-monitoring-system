from __future__ import annotations

from langchain_core.tools import tool

from app.db import get_db_connection

# ── Allowed column names for metric/comparison filtering ─────────────────────
ALLOWED_METRICS = {"avgLatency", "errorHits", "totalHits", "maxLatency", "minLatency"}
ALLOWED_COMPARISONS = {">", "<", ">=", "<=", "="}


@tool
def query_endpoint_metrics(
    client_id: str,
    service_name: str | None = None,
    endpoint: str | None = None,
    method: str | None = None,
    time_range_minutes: int = 60,
    metric: str = "avgLatency",
    threshold: float | None = None,
    comparison: str | None = None,
) -> list[dict]:
    """
    Query the EndpointMetrics table for a specific client.

    Args:
        client_id: The client identifier (always required, injected by service).
        service_name: Optional – filter to a specific service name.
        endpoint: Optional – filter to a specific endpoint path.
        method: Optional – filter to a specific HTTP method (GET, POST, …).
        time_range_minutes: How many minutes back to look (default 60).
        metric: The metric column to surface. Must be one of: avgLatency,
                errorHits, totalHits, maxLatency, minLatency.
        threshold: Optional numeric threshold for filtering.
        comparison: Comparison operator when threshold is set ('>', '<', etc.).

    Returns:
        A list of dicts, each representing one matching EndpointMetrics row.
    """
    # ── Validate column name to prevent SQL injection via metric name ─────────
    if metric not in ALLOWED_METRICS:
        raise ValueError(
            f"Invalid metric '{metric}'. Must be one of: {', '.join(sorted(ALLOWED_METRICS))}"
        )

    if comparison is not None and comparison not in ALLOWED_COMPARISONS:
        raise ValueError(
            f"Invalid comparison operator '{comparison}'. "
            f"Must be one of: {', '.join(sorted(ALLOWED_COMPARISONS))}"
        )

    # ── Build the query ────────────────────────────────────────────────────────
    # SELECT clause – always include key columns plus the requested metric
    select_cols = [
        '"id"',
        '"clientId"',
        '"serviceName"',
        '"endpoint"',
        '"method"',
        '"timeBucket"',
        '"totalHits"',
        '"errorHits"',
        '"avgLatency"',
        '"minLatency"',
        '"maxLatency"',
    ]

    where_clauses = [
        '"clientId" = %s',
        '"timeBucket" >= NOW() - INTERVAL \'1 minute\' * %s',
    ]
    params: list = [client_id, time_range_minutes]

    if service_name:
        where_clauses.append('"serviceName" ILIKE %s')
        params.append(f"%{service_name}%")

    if endpoint:
        where_clauses.append('"endpoint" ILIKE %s')
        params.append(f"%{endpoint}%")

    if method:
        where_clauses.append('"method" = %s')
        params.append(method.upper())

    # metric column name is validated against ALLOWED_METRICS above — safe to
    # interpolate as an identifier (not as a value, so %s won't work here)
    if threshold is not None and comparison is not None:
        where_clauses.append(f'"{metric}" {comparison} %s')
        params.append(threshold)

    sql = (
        f'SELECT {", ".join(select_cols)} '
        f'FROM "EndpointMetrics" '
        f'WHERE {" AND ".join(where_clauses)} '
        f'ORDER BY "timeBucket" DESC '
        f"LIMIT 50;"
    )

    # ── Execute ────────────────────────────────────────────────────────────────
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(sql, params)
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        raise RuntimeError(f"Metrics query failed: {str(e)}") from e
    finally:
        if conn:
            conn.close()
