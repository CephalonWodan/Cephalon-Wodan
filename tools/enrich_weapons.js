#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Fixe des incohérences dans enriched_weapons.json :
- déduplication (id, slug) en gardant la version la plus "riche"
- Melee/Archmelee : fireRate -> attackSpeed (top-level), attacks.speed -> attacks.attackSpeed
- correction Slash/Puncture inversés vs top-level damageTypes
- recalcul des totaux 'total' dans attacks.damage et damageTypes
Sorties :
  /mnt/data/enriched_weapons.json
  /mnt/data/enriched_weapons_report.csv
"""

import json
from copy import deepcopy
from pathlib import Path
from typing import Dict, Any, List

import pandas as pd

# ---- Chemins : adapte si besoin ----
SRC = Path("/mnt/data/enriched_weapons.json")  # ton JSON d’entrée
OUT_JSON = Path("/mnt/data/enriched_weapons.json")
OUT_CSV = Path("/mnt/data/enriched_weapons_report.csv")
# ------------------------------------

def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(data, path: Path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def almost_equal(a: float, b: float, tol: float = 1e-3) -> bool:
    try:
        return abs((a or 0) - (b or 0)) <= tol
    except TypeError:
        return False

def sum_damage(dmg: Dict[str, Any]) -> float:
    return float(sum(v for k, v in dmg.items() if k != "total" and isinstance(v, (int, float))))

def normalize_total(dmg: Dict[str, Any]) -> (bool, float, float):
    """Assure que dmg['total'] = somme des composantes (hors 'total')."""
    if not isinstance(dmg, dict):
        return False, None, None
    components_sum = sum_damage(dmg)
    old_total = float(dmg.get("total", 0))
    new_total = round(components_sum, 3)
    if almost_equal(old_total, new_total):
        return False, old_total, old_total
    dmg["total"] = new_total
    return True, old_total, new_total

def fix_ps_swap(attack_dmg: Dict[str, Any], base_dmg: Dict[str, Any]) -> bool:
    """
    Si attack.damage a puncture/slash inversés vs damageTypes top-level, on les remet dans le bon sens.
    Détection stricte : p_attack == s_base ET s_attack == p_base (à tolérance près).
    """
    if not isinstance(attack_dmg, dict) or not isinstance(base_dmg, dict):
        return False
    p_a = attack_dmg.get("puncture")
    s_a = attack_dmg.get("slash")
    p_b = base_dmg.get("puncture")
    s_b = base_dmg.get("slash")
    if p_a is None or s_a is None or p_b is None or s_b is None:
        return False
    if almost_equal(p_a, s_b) and almost_equal(s_a, p_b):
        attack_dmg["puncture"], attack_dmg["slash"] = s_a, p_a
        return True
    return False

def better_record(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    """Choisit le meilleur doublon : privilégie celui avec plus d'infos (damageTypes, attacks avec dégâts non nuls...)."""
    def score(rec: Dict[str, Any]) -> int:
        s = 0
        if isinstance(rec.get("damageTypes"), dict) and any(
            isinstance(v, (int, float)) and v > 0
            for v in rec["damageTypes"].values()
            if isinstance(v, (int, float))
        ):
            s += 3
        attacks = rec.get("attacks") or []
        nz = 0
        for atk in attacks:
            dmg = atk.get("damage") or {}
            if isinstance(dmg, dict) and sum_damage(dmg) > 0:
                nz += 1
        s += min(nz, 5)
        s += len([k for k, v in rec.items() if v not in (None, [], {}, "", 0)]) // 10
        return s
    return a if score(a) >= score(b) else b

def clean_records(records: List[Dict[str, Any]]):
    changes = []
    # 1) Déduplication sur (id, slug)
    deduped = {}
    dup_counts = {}
    for rec in records:
        key = (rec.get("id"), rec.get("slug"))
        if key in deduped:
            chosen = better_record(deduped[key], rec)
            if chosen is not deduped[key]:
                deduped[key] = chosen
            dup_counts[key] = dup_counts.get(key, 1) + 1
        else:
            deduped[key] = rec
    if dup_counts:
        for (id_, slug), cnt in dup_counts.items():
            changes.append({
                "slug": slug,
                "id": id_,
                "change": "deduplicated",
                "details": f"Found {cnt} duplicates; kept best version."
            })

    cleaned = []
    for (id_, slug), rec in deduped.items():
        rec = deepcopy(rec)
        subtype = (rec.get("subtype") or "").lower()

        # 2) Melee/Archmelee : fireRate -> attackSpeed (top-level)
        if subtype in ("melee", "archmelee"):
            if "fireRate" in rec:
                old = rec.get("fireRate")
                if not rec.get("attackSpeed"):
                    rec["attackSpeed"] = old
                del rec["fireRate"]
                changes.append({
                    "slug": slug, "id": id_, "change": "rename",
                    "details": f"Top-level fireRate -> attackSpeed (value {old})."
                })

        # 3) Normalisation des attaques
        attacks = rec.get("attacks") or []
        base_phys = rec.get("damageTypes") or {}
        for atk in attacks:
            atk_name = atk.get("name")

            # Melee : speed -> attackSpeed
            if subtype in ("melee", "archmelee") and "speed" in atk:
                old = atk["speed"]
                atk["attackSpeed"] = old
                del atk["speed"]
                changes.append({
                    "slug": slug, "id": id_, "change": "rename",
                    "details": f"Attack '{atk_name}': speed -> attackSpeed (value {old})."
                })

            dmg = atk.get("damage")
            if isinstance(dmg, dict):
                # Correction éventuelle S/P inversés vs base
                if fix_ps_swap(dmg, base_phys):
                    changes.append({
                        "slug": slug, "id": id_, "change": "fix_puncture_slash",
                        "details": f"Attack '{atk_name}': swapped puncture/slash to match top-level breakdown."
                    })
                # Totaux
                changed, old_total, new_total = normalize_total(dmg)
                if changed:
                    changes.append({
                        "slug": slug, "id": id_, "change": "fix_total",
                        "details": f"Attack '{atk_name}': total {old_total} -> {new_total}."
                    })

        # 4) Total au niveau top-level damageTypes (si présent)
        if isinstance(rec.get("damageTypes"), dict) and "total" in rec["damageTypes"]:
            changed, old_total, new_total = normalize_total(rec["damageTypes"])
            if changed:
                changes.append({
                    "slug": slug, "id": id_, "change": "fix_total",
                    "details": f"Top-level damageTypes total {old_total} -> {new_total}."
                })

        cleaned.append(rec)

    return cleaned, changes

def main():
    data = load_json(SRC)
    cleaned, changes = clean_records(data)
    save_json(cleaned, OUT_JSON)
    pd.DataFrame(changes).to_csv(OUT_CSV, index=False)
    print(f"Input: {len(data)} records | Output: {len(cleaned)} records | Changes: {len(changes)}")
    print(f"Wrote: {OUT_JSON}")
    print(f"Wrote: {OUT_CSV}")

if __name__ == "__main__":
    main()
