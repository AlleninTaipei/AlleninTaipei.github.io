"""從 AlleninTaipei repo 的 README.md 與 README-en.md 產生 js/projects.js.

README 是唯一的資料來源, 預設讀取與本 repo 並排的 ../allenintaipei 資料夾.
新增專案, 或變更 repo 的 public / private 狀態後, 執行:

    python tools/build_projects.py
    python tools/build_projects.py --readme-dir D:/path/to/AlleninTaipei

需要已登入的 gh CLI, 用來查詢各 repo 目前的可見度.
"""

import argparse

import json
import subprocess
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# README 標題 -> 網站分類代碼
CATEGORY_BY_HEADING = {
    "AI-Native Assets": "native",
    "API Key required": "api",
    "No API Key required": "local",
    "GitHub-Pages": "pages",
    "Notes": "notes",
}

LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
PROVIDER_RE = re.compile(r"\s*(?:支援的 API 供應商|Supported API providers)\s*:\s*(.+)$")


def parse(path: Path) -> list[dict]:
    items = []
    category = None
    for line in path.read_text(encoding="utf-8").splitlines():
        heading = re.match(r"^#{2,3}\s+(.+)$", line)
        if heading:
            category = CATEGORY_BY_HEADING.get(heading.group(1).strip(), category)
            continue
        if not line.startswith("[") or " : " not in line or category is None:
            continue

        head, desc = line.split(" : ", 1)
        links = [{"name": n, "url": u} for n, u in LINK_RE.findall(head)]
        providers = []
        match = PROVIDER_RE.search(desc)
        if match:
            providers = re.findall(r"`([^`]+)`", match.group(1))
            desc = desc[: match.start()].rstrip()
        items.append(
            {"category": category, "links": links, "desc": desc, "providers": providers}
        )
    return items


OWNER = "AlleninTaipei"
REPO_RE = re.compile(r"github\.com/([^/]+)/([^/#?]+)")


def fetch_private_repos() -> set[str]:
    """回傳目前為 private 的 repo 名稱 (小寫). gh 不可用時中止, 避免誤把 private 專案公開連結."""
    result = subprocess.run(
        ["gh", "repo", "list", OWNER, "--limit", "1000",
         "--json", "name,visibility", "-q", '.[] | select(.visibility != "PUBLIC") | .name'],
        capture_output=True, text=True, encoding="utf-8",
    )
    if result.returncode != 0:
        sys.exit("無法透過 gh 查詢 repo 可見度, 請先執行 gh auth login.\n" + result.stderr)
    return {name.strip().lower() for name in result.stdout.splitlines() if name.strip()}


def mark_visibility(links: list[dict], private_repos: set[str]) -> list[dict]:
    """移除 private repo 的連結. 全部連結都是 private 的專案會整個不顯示."""
    marked = []
    for link in links:
        match = REPO_RE.search(link["url"])
        is_private = (
            bool(match)
            and match.group(1).lower() == OWNER.lower()
            and match.group(2).lower() in private_repos
        )
        if not is_private:
            marked.append(link)
    return marked


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--readme-dir", type=Path, default=ROOT.parent / "allenintaipei",
                        help="AlleninTaipei repo 的本機路徑 (預設: ../allenintaipei)")
    readme_dir = parser.parse_args().readme_dir.resolve()
    if not (readme_dir / "README.md").exists():
        sys.exit(f"找不到 {readme_dir / 'README.md'}, 請用 --readme-dir 指定 AlleninTaipei repo 的路徑.")

    private_repos = fetch_private_repos()
    zh = parse(readme_dir / "README.md")
    en = {item["links"][0]["name"]: item for item in parse(readme_dir / "README-en.md")}

    projects = []
    hidden = []
    for item in zh:
        key = item["links"][0]["name"]
        links = mark_visibility(item["links"], private_repos)
        if not links:
            hidden.append(key)
            continue
        projects.append(
            {
                "category": item["category"],
                "links": links,
                "providers": item["providers"],
                "desc": {"zh": item["desc"], "en": en.get(key, {}).get("desc", "")},
            }
        )

    out = ROOT / "js" / "projects.js"
    body = json.dumps(projects, ensure_ascii=False, indent=2)
    out.write_text(
        "// 此檔案由 tools/build_projects.py 自動產生, 請勿手動修改.\n"
        f"window.PROJECTS = {body};\n",
        encoding="utf-8",
    )
    missing = [p["links"][0]["name"] for p in projects if not p["desc"]["en"]]
    print(f"已寫入 {len(projects)} 個公開專案到 {out.relative_to(ROOT)}")
    if hidden:
        print(f"略過 {len(hidden)} 個 private 專案:", ", ".join(hidden))
    if missing:
        print("缺少英文說明:", ", ".join(missing))


if __name__ == "__main__":
    main()
