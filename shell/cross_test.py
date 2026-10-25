#!/usr/bin/env python3
"""Cross-implementation verification matrix for Excel API.

Writes cells and records through every implementation and reads them back
through every other implementation, then checks lock status. Run against
the shared environment described in docs/TESTING.md
(Cross-Implementation Verification).

Environment variables:
  CROSS_PORTS    space-separated list of name=port pairs
                 (default: "node=4801 java=4802 csharp=4803 rust=4804")
  CROSS_BASE     base URL template with %d for the port
                 (default: "http://localhost:%d/api/v1")
  CROSS_WORKBOOK workbook id under test (default: "simple")
  CROSS_SHEET    sheet name under test  (default: "Sheet1")
  CROSS_CLIENT_ID / CROSS_CLIENT_SECRET  OAuth2 client-credentials pair
                 (default: test-client / test-secret)

Exits 0 on all pass, 1 on any failure.
"""

import json
import os
import sys
import urllib.error
import urllib.request

ports = {}
for pair in os.environ.get(
    "CROSS_PORTS", "node=4801 java=4802 csharp=4803 rust=4804"
).split():
    name, _, port = pair.partition("=")
    ports[name] = int(port)

BASE = os.environ.get("CROSS_BASE", "http://localhost:%d/api/v1")
WORKBOOK = os.environ.get("CROSS_WORKBOOK", "simple")
SHEET = os.environ.get("CROSS_SHEET", "Sheet1")
CLIENT_ID = os.environ.get("CROSS_CLIENT_ID", "test-client")
CLIENT_SECRET = os.environ.get("CROSS_CLIENT_SECRET", "test-secret")


def req(method, port, path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(
        BASE % port + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers=headers,
    )
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or "{}")


def token_for(port):
    st, res = req(
        "POST",
        port,
        "/auth/token",
        {
            "grant_type": "client_credentials",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        },
    )
    if st != 200:
        sys.exit(f"token request failed on port {port}: {st} {res}")
    return res["access_token"]


tokens = {name: token_for(port) for name, port in ports.items()}
cells = {name: f"Z1{i}" for i, name in enumerate(ports)}
fails = []

print("== cell write/read matrix (writer x reader)")
for writer, wport in ports.items():
    value = f"xw-{writer}"
    st, res = req(
        "PUT",
        wport,
        f"/workbooks/{WORKBOOK}/sheets/{SHEET}/cells/{cells[writer]}",
        {"value": value},
        tokens[writer],
    )
    if st != 200:
        fails.append(f"{writer} write cell {st} {res}")
    for reader, rport in ports.items():
        if reader == writer:
            continue
        st, res = req(
            "GET",
            rport,
            f"/workbooks/{WORKBOOK}/sheets/{SHEET}/cells/{cells[writer]}",
            token=tokens[reader],
        )
        v = res.get("value") if st == 200 else f"ERR{st}:{res}"
        ok = v == value
        print(f"  {writer}->{reader}: {'OK' if ok else 'FAIL'} ({v})")
        if not ok:
            fails.append(f"{writer}->{reader} cell: {v}")

print("== record update matrix")
record_path = f"/workbooks/{WORKBOOK}/sheets/{SHEET}/records/4"
for writer, wport in ports.items():
    value = f"rec-{writer}"
    st, res = req(
        "PUT", wport, record_path, {"data": {"Name": value}}, tokens[writer]
    )
    if st != 200:
        fails.append(f"{writer} write rec {st} {res}")
    for reader, rport in ports.items():
        if reader == writer:
            continue
        st, res = req("GET", rport, record_path, token=tokens[reader])
        v = (res.get("data") or {}).get("Name") if st == 200 else f"ERR{st}:{res}"
        ok = v == value
        print(f"  {writer}->{reader}: {'OK' if ok else 'FAIL'} ({v})")
        if not ok:
            fails.append(f"{writer}->{reader} rec: {v}")

print("== lock interop")
first = next(iter(ports))
st, res = req(
    "GET", ports[first], f"/workbooks/{WORKBOOK}/lock-status", token=tokens[first]
)
locked = res.get("locked") if st == 200 else f"ERR{st}:{res}"
ok = locked is False
print(f"  lock-status via {first}: {'OK' if ok else 'FAIL'} ({locked})")
if not ok:
    fails.append(f"lock-status: {locked}")

if fails:
    print(f"RESULT: {len(fails)} FAILURES: {fails}")
    sys.exit(1)
print("RESULT: ALL PASS")
