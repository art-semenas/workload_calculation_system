import json
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
COLLECTION_ROOT = ROOT / "postman" / "collections" / "Workload Calculation System API"
OUTPUT_COLLECTION = (
    ROOT
    / "postman"
    / "collection"
    / "Workload Calculation System API.postman_collection.json"
)
OUTPUT_ENVIRONMENT = (
    ROOT / "postman" / "environments" / "local.postman_environment.json"
)


def strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


def parse_definition(path: Path) -> dict:
    data = {"variables": {}, "auth": {}}
    lines = path.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            i += 1
            continue
        if stripped.startswith("$kind:"):
            data["kind"] = strip_quotes(stripped.split(":", 1)[1])
        elif stripped.startswith("name:"):
            data["name"] = strip_quotes(stripped.split(":", 1)[1])
        elif stripped == "variables:":
            i += 1
            while i < len(lines):
                nested = lines[i]
                if not nested.startswith("  "):
                    break
                nested_stripped = nested.strip()
                if nested_stripped and not nested_stripped.startswith("#"):
                    key, raw = nested_stripped.split(":", 1)
                    data["variables"][key.strip()] = strip_quotes(raw)
                i += 1
            continue
        elif stripped == "auth:":
            i += 1
            while i < len(lines):
                nested = lines[i]
                if not nested.startswith("  "):
                    break
                nested_stripped = nested.strip()
                if nested_stripped.startswith("type:"):
                    data["auth"]["type"] = strip_quotes(
                        nested_stripped.split(":", 1)[1]
                    )
                elif nested_stripped == "credentials:":
                    i += 1
                    while i < len(lines):
                        credential = lines[i]
                        if not credential.startswith("    "):
                            break
                        credential_stripped = credential.strip()
                        if credential_stripped:
                            key, raw = credential_stripped.split(":", 1)
                            data["auth"][key.strip()] = strip_quotes(raw)
                        i += 1
                    continue
                i += 1
            continue
        i += 1
    return data


def parse_request(path: Path) -> dict:
    data = {
        "schema": None,
        "kind": None,
        "name": None,
        "order": None,
        "method": None,
        "url": None,
        "auth": None,
        "headers": [],
        "queryParams": [],
        "body": None,
        "event": [],
    }
    lines = path.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            i += 1
            continue
        if stripped.startswith("$schema:"):
            data["schema"] = strip_quotes(stripped.split(":", 1)[1])
        elif stripped.startswith("$kind:"):
            data["kind"] = strip_quotes(stripped.split(":", 1)[1])
        elif stripped.startswith("name:"):
            data["name"] = strip_quotes(stripped.split(":", 1)[1])
        elif stripped.startswith("order:"):
            data["order"] = int(strip_quotes(stripped.split(":", 1)[1]))
        elif stripped.startswith("method:"):
            data["method"] = strip_quotes(stripped.split(":", 1)[1])
        elif stripped.startswith("url:"):
            data["url"] = strip_quotes(stripped.split(":", 1)[1])
        elif stripped == "auth:":
            auth = {}
            i += 1
            while i < len(lines):
                nested = lines[i]
                if not nested.startswith("  "):
                    break
                nested_stripped = nested.strip()
                if nested_stripped.startswith("type:"):
                    auth["type"] = strip_quotes(nested_stripped.split(":", 1)[1])
                i += 1
            data["auth"] = auth
            continue
        elif stripped == "headers:":
            headers = []
            i += 1
            while i < len(lines):
                nested = lines[i]
                if not nested.startswith("  "):
                    break
                nested_stripped = nested.strip()
                if nested_stripped.startswith("- key:"):
                    header = {"key": strip_quotes(nested_stripped.split(":", 1)[1])}
                    i += 1
                    while i < len(lines):
                        value_line = lines[i]
                        if not value_line.startswith("    "):
                            break
                        value_stripped = value_line.strip()
                        key, raw = value_stripped.split(":", 1)
                        header[key.strip()] = strip_quotes(raw)
                        i += 1
                    headers.append(header)
                    continue
                i += 1
            data["headers"] = headers
            continue
        elif stripped == "queryParams:":
            params = []
            i += 1
            while i < len(lines):
                nested = lines[i]
                if not nested.startswith("  "):
                    break
                nested_stripped = nested.strip()
                if nested_stripped.startswith("- key:"):
                    param = {"key": strip_quotes(nested_stripped.split(":", 1)[1])}
                    i += 1
                    while i < len(lines):
                        value_line = lines[i]
                        if not value_line.startswith("    "):
                            break
                        value_stripped = value_line.strip()
                        key, raw = value_stripped.split(":", 1)
                        value = strip_quotes(raw)
                        if key.strip() == "disabled":
                            param["disabled"] = value.lower() == "true"
                        else:
                            param[key.strip()] = value
                        i += 1
                    params.append(param)
                    continue
                i += 1
            data["queryParams"] = params
            continue
        elif stripped == "body:":
            body = {}
            i += 1
            while i < len(lines):
                nested = lines[i]
                if not nested.startswith("  "):
                    break
                nested_stripped = nested.strip()
                if nested_stripped.startswith("type:"):
                    body["type"] = strip_quotes(nested_stripped.split(":", 1)[1])
                    i += 1
                    continue
                if nested_stripped.startswith("content: |"):
                    i += 1
                    body_lines = []
                    while i < len(lines):
                        content_line = lines[i]
                        if not content_line.startswith("    "):
                            break
                        body_lines.append(content_line[4:])
                        i += 1
                    body["content"] = "\n".join(body_lines)
                    continue
                i += 1
            data["body"] = body
            continue
        elif stripped == "event:":
            events = []
            i += 1
            while i < len(lines):
                nested = lines[i]
                if not nested.startswith("  "):
                    break
                nested_stripped = nested.strip()
                if nested_stripped.startswith("- listen:"):
                    event = {"listen": strip_quotes(nested_stripped.split(":", 1)[1])}
                    i += 1
                    while i < len(lines):
                        event_line = lines[i]
                        if not event_line.startswith("    "):
                            break
                        event_stripped = event_line.strip()
                        if event_stripped == "script:":
                            script = {}
                            i += 1
                            while i < len(lines):
                                script_line = lines[i]
                                if not script_line.startswith("      "):
                                    break
                                script_stripped = script_line.strip()
                                if script_stripped.startswith("type:"):
                                    script["type"] = strip_quotes(
                                        script_stripped.split(":", 1)[1]
                                    )
                                    i += 1
                                    continue
                                if script_stripped == "exec:":
                                    i += 1
                                    exec_lines = []
                                    while i < len(lines):
                                        exec_line = lines[i]
                                        if not exec_line.startswith("        "):
                                            break
                                        exec_stripped = exec_line.strip()
                                        if exec_stripped.startswith("- "):
                                            exec_lines.append(exec_stripped[2:])
                                        i += 1
                                    script["exec"] = exec_lines
                                    continue
                                i += 1
                            event["script"] = script
                            continue
                        i += 1
                    events.append(event)
                    continue
                i += 1
            data["event"] = events
            continue
        i += 1
    return data


def build_auth(auth_data: dict | None) -> dict | None:
    if not auth_data:
        return None
    auth_type = auth_data.get("type")
    if auth_type == "noauth":
        return {"type": "noauth", "noauth": []}
    if auth_type == "bearer":
        return {
            "type": "bearer",
            "bearer": [
                {
                    "key": "token",
                    "value": auth_data.get("token", ""),
                    "type": "string",
                }
            ],
        }
    return {"type": auth_type}


def build_url(raw_url: str, query_params: list[dict]) -> dict | str:
    if not query_params:
        return raw_url
    return {
        "raw": raw_url,
        "query": [
            {
                "key": param["key"],
                "value": param.get("value", ""),
                "disabled": param.get("disabled", False),
            }
            for param in query_params
        ],
    }


def build_request_item(request_data: dict) -> dict:
    item = {
        "name": request_data["name"],
        "request": {
            "method": request_data["method"],
            "header": [
                {
                    "key": header["key"],
                    "value": header.get("value", ""),
                    "type": "text",
                }
                for header in request_data["headers"]
            ],
            "url": build_url(request_data["url"], request_data["queryParams"]),
        },
    }
    auth = build_auth(request_data.get("auth"))
    if auth:
        item["request"]["auth"] = auth
    if request_data.get("body"):
        body = request_data["body"]
        item["request"]["body"] = {
            "mode": "raw",
            "raw": body.get("content", ""),
            "options": {"raw": {"language": "json"}},
        }
    if request_data.get("event"):
        item["event"] = [
            {
                "listen": event["listen"],
                "script": {
                    "type": event["script"].get("type", "text/javascript"),
                    "exec": event["script"].get("exec", []),
                },
            }
            for event in request_data["event"]
        ]
    return item


def build_folder_item(folder_path: Path) -> dict:
    definition = parse_definition(folder_path / ".resources" / "definition.yaml")
    requests = [
        parse_request(path)
        for path in folder_path.glob("*.request.yaml")
        if path.is_file()
    ]
    requests.sort(key=lambda entry: (entry.get("order", 999999), entry["name"].lower()))
    return {
        "name": definition["name"],
        "item": [build_request_item(entry) for entry in requests],
    }


def build_collection() -> dict:
    definition = parse_definition(COLLECTION_ROOT / ".resources" / "definition.yaml")
    environment_keys = {"baseUrl", "authEmail", "authPassword"}
    folders = [
        path
        for path in COLLECTION_ROOT.iterdir()
        if path.is_dir() and path.name != ".resources"
    ]
    folders.sort(key=lambda path: path.name.lower())
    collection = {
        "info": {
            "_postman_id": str(uuid.uuid4()),
            "name": definition["name"],
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "auth": build_auth(definition.get("auth")),
        "variable": [
            {"key": key, "value": value, "type": "string"}
            for key, value in definition["variables"].items()
            if key not in environment_keys
        ],
        "item": [build_folder_item(folder) for folder in folders],
    }
    return collection


def build_environment() -> dict:
    definition = parse_definition(COLLECTION_ROOT / ".resources" / "definition.yaml")
    values = []
    for key in ("baseUrl", "authEmail", "authPassword"):
        values.append(
            {
                "key": key,
                "value": definition["variables"].get(key, ""),
                "type": "default",
                "enabled": True,
            }
        )
    return {
        "id": str(uuid.uuid4()),
        "name": "Workload Calculation System Local",
        "values": values,
        "_postman_variable_scope": "environment",
        "_postman_exported_at": "2026-04-06T00:00:00.000Z",
        "_postman_exported_using": "Codex",
    }


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    path.write_text(text, encoding="utf-8")


def main() -> None:
    write_json(OUTPUT_COLLECTION, build_collection())
    write_json(OUTPUT_ENVIRONMENT, build_environment())


if __name__ == "__main__":
    main()
