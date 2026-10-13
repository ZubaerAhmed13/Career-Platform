#!/usr/bin/env python3
"""Operator-only gateway verification; uses stdlib and keeps keys out of output."""
import json
import os
from pathlib import Path
import ssl
import sys
import urllib.error
import urllib.request


def read_config():
    envfile = Path(__file__).resolve().parent / ".env"
    if not envfile.is_file():
        raise RuntimeError("Run setup.sh on the model server first; missing .env.")
    values = {}
    for line in envfile.read_text().splitlines():
        if not line or line.lstrip().startswith("#"):
            continue
        k, sep, v = line.partition("=")
        if sep:
            values[k.strip()] = v.strip()
    for name in ("MODEL_DOMAIN", "INFERENCE_BEARER_TOKEN"):
        if not values.get(name):
            raise RuntimeError("Missing a private model host setting: " + name)
    return values


def request(url, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token is not None:
        headers["Authorization"] = "Bearer " + token
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers,
                                 method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=120, context=ssl.create_default_context()) as r:
            result = r.read(100000)
            return r.status, result
    except urllib.error.HTTPError as e:
        e.close()
        return e.code, b""


def main():
    values = read_config()
    base = "https://" + values["MODEL_DOMAIN"]
    token = values["INFERENCE_BEARER_TOKEN"]
    chat = base + "/api/chat"
    # A missing Authorization header must not reach the model.
    status, _ = request(chat, {"model": "qwen3:8b", "messages": []})
    if status != 403:
        raise RuntimeError("Security failure: unauthenticated chat did not return HTTP 403.")
    # Administrative model pull/list APIs must not be public, even with a valid token.
    status, _ = request(base + "/api/tags", token=token)
    if status != 403:
        raise RuntimeError("Security failure: administrative model routes are exposed.")
    payload = {
        "model": "qwen3:8b",
        "stream": False,
        "think": False,
        "options": {"temperature": 0.1, "num_predict": 64},
        "messages": [{"role": "system", "content": "Return only JSON."},
                     {"role": "user", "content": "Return a JSON object with purpose equal to career."}],
        "format": {
            "type": "object",
            "properties": {"purpose": {"type": "string"}},
            "required": ["purpose"],
            "additionalProperties": False,
        },
    }
    status, data = request(chat, payload, token)
    if status != 200:
        raise RuntimeError("Private inference check failed with HTTP status " + str(status))
    response = json.loads(data)
    if response.get("done") is not True:
        raise RuntimeError("Ollama did not complete the structured inference.")
    message = response.get("message", {})
    result = json.loads(message.get("content", ""))
    if result.get("purpose") != "career":
        raise RuntimeError("Model structured output failed the test prompt.")
    print("PASS: Private HTTPS gateway and structured model inference are operational.")
    print("PASS: Anonymous chat and model administration routes are blocked.")
    print("No token or private user data was displayed.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError, KeyError, json.JSONDecodeError) as error:
        print("FAILED: " + str(error), file=sys.stderr)
        sys.exit(1)
