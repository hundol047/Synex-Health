"""Refresh the bundled directory from KSPO's public facility search.

Source: https://nfa.kspo.or.kr/spoint/selectSpointFacility.kspo
Neighbourhood centres: https://github.com/swuhalee/korea-regions-with-coords
The points mark legal neighbourhoods, not individual buildings.
"""
from datetime import datetime
import json
from pathlib import Path
import re
from urllib.request import urlopen
from zoneinfo import ZoneInfo

SEARCH = "https://nfa.kspo.or.kr/spoint/selectSpointFacilityJs.kspo"
AREAS = "https://raw.githubusercontent.com/swuhalee/korea-regions-with-coords/main/korea-regions-with-coords.json"
OUTPUT = Path(__file__).resolve().parents[1] / "src/gym/facility-directory.json"
SHORT_NAMES = {
    "강원": "강원특별자치도", "강원도": "강원특별자치도", "경기": "경기도",
    "경남": "경상남도", "경북": "경상북도", "광주": "광주광역시", "대구": "대구광역시",
    "대전": "대전광역시", "부산": "부산광역시", "서울": "서울특별시", "세종": "세종특별자치시",
    "울산": "울산광역시", "인천": "인천광역시", "전남": "전라남도", "전북": "전북특별자치도",
    "전라북도": "전북특별자치도", "제주": "제주특별자치도", "충남": "충청남도", "충북": "충청북도",
}


def fetch(url):
    with urlopen(url, timeout=45) as response:
        return json.load(response)


def neighbourhood(address, detail, regions):
    words = set(re.findall(r"[가-힣0-9·]+", address + " " + detail))
    province = address.split()[0]
    candidates = ["광주광역시", "전라남도"] if province == "전남광주통합특별시" else [SHORT_NAMES.get(province, province)]
    for name in candidates:
        node = regions.get(name)
        if not node:
            continue
        while True:
            matches = [child for child in node["children"] if child["name"] in words]
            if len(matches) != 1:
                break
            node = matches[0]
        if node["kind"] in ("dong", "eup", "myeon", "ri"):
            return [round(node["lat"], 5), round(node["lng"], 5), node["name"]]
    return None


def main():
    regions = {node["name"]: node for node in fetch(AREAS)["sido"]}
    def page(number):
        return fetch(f"{SEARCH}?pageNo={number}&recordCountPerPage=500")["facilityList"]

    entries = page(1)
    total = int(entries[0]["totCount"])
    for number in range(2, (total + 499) // 500 + 1):
        entries.extend(page(number))
    if len(entries) != total or len({entry["regSn"] for entry in entries}) != total:
        raise ValueError("The list changed during download. Run again before publishing.")
    rows = []
    for entry in entries:
        name, address = entry["spoFaciNm"].strip(), entry["addr1"].strip()
        mobile = re.search("모바일 앱|모바일앱|MOBILE_APP", name + " " + (entry.get("etcText") or ""), re.I)
        if not address or mobile or entry.get("faciStatCd") != "00":
            continue
        detail = (entry.get("addr2") or "").strip()
        row = [name, address, detail, entry.get("fUseStdYmd", ""), entry.get("fUseEndYmd", ""), neighbourhood(address, detail, regions)]
        rows.append(json.dumps(row, ensure_ascii=False, separators=(",", ":")))
    checked = datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()
    OUTPUT.write_text('{"checked":"' + checked + '","rows":[\n' + ",\n".join(rows) + "\n]}\n", encoding="utf-8")


if __name__ == "__main__":
    main()
