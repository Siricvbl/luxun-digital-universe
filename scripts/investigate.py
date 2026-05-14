#!/usr/bin/env python3
"""调查当前节点名称 vs 脚本名称的差异"""
import json

with open("public/kr-graph-v6.json") as f:
    d = json.load(f)

print("=== ALL NODES ===")
for n in d["nodes"]:
    print(f"{n['id']:20s}  cat={n.get('cat','?'):10s}  desc_len={len(n.get('desc',''))}")

print("\n=== SCRIPT keys not in data ===")
script_chars = [
    "狂人","大哥","赵贵翁","陈老五","医生（何先生）","母亲",
    "佃户","女人（街上骂人的）","狼子村人","易牙","狂人（幼年）","狼子村村民"
]
data_char_ids = {n["id"] for n in d["nodes"] if n.get("cat")=="character"}
for s in script_chars:
    if s not in data_char_ids:
        print(f"  MISSING: {s}")

print("\n=== Data chars not in script ===")
for s in sorted(data_char_ids - set(script_chars)):
    print(f"  EXTRA: {s}")
