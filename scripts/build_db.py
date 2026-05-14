#!/usr/bin/env python3
"""
鲁迅数字宇宙 — 数据构建工具
============================
扫描 raw_data/ 目录，构建 SQLite 数据库：
  - articles 表：文章全文
  - chunks 表：段落分片（用于 RAG 检索）
  - characters 表：角色信息
  - relations 表：人物关系（本体论标准）

用法：
  python3 build_db.py              # 构建完整数据库
  python3 build_db.py --rebuild    # 删除并重建
"""

import os
import re
import json
import sqlite3
import hashlib
import argparse
from pathlib import Path

# ─── 配置 ──────────────────────────────────────────────
# scripts/build_db.py 在项目根目录的 scripts/ 下
# 所以项目根是 parent 的 parent
_SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = _SCRIPT_DIR.parent
RAW_DATA_DIR = PROJECT_ROOT / "raw_data"
DB_DIR = PROJECT_ROOT / "db"
DB_PATH = DB_DIR / "luxun.db"

# ─── 本体论：关系类型标准 ─────────────────────────────
# 这套关系类型是所有小说世界通用的
RELATION_TYPES = {
    "惧怕":       "A 恐惧/畏惧 B",
    "怀疑":       "A 怀疑 B 有恶意",
    "迫害":       "A 迫害/加害 B",
    "保护":       "A 保护/照顾 B",
    "怜悯":       "A 同情 B 的处境",
    "劝导":       "A 试图说服/改变 B",
    "敌对":       "双向对立关系",
    "亲属":       "血缘或姻亲关系",
    "服从":       "A 听从 B 的指令",
    "观察":       "A 注视/监视 B",
    "信任":       "A 信任/依赖 B",
    "背叛":       "A 背叛/出卖 B",
    "崇拜":       "A 崇拜/敬仰 B",
    "同情":       "A 同情/怜悯 B",
}


def clean_text(text: str) -> str:
    """清理原文：去掉 ``` 标记、去除多余空行"""
    text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'```\s*$', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_title_from_filename(filename: str) -> str:
    """从文件名提取标题"""
    name = filename.replace('.md', '')
    # 去掉作者名前缀，如 "何满子《xxx》" → "xxx"
    name = re.sub(r'^.*?《', '', name)
    name = re.sub(r'》.*$', '', name)
    return name


def get_collection_name(root_path: Path, base_path: Path) -> str:
    """获取文集名（相对于 raw_data 的文件夹名）"""
    try:
        rel = root_path.relative_to(base_path)
        parts = rel.parts
        # raw_data/全集/呐喊 → "呐喊"
        # raw_data/单文件.md → "未分类"
        if len(parts) >= 2:
            return parts[-2]  # 子文件夹名
        elif len(parts) == 1:
            # raw_data/下的直接文件 → "未分类"
            return "未分类"
        return "未分类"
    except ValueError:
        return "未分类"


def chunk_text(text: str, max_chars: int = 500) -> list[str]:
    """将文本按段落分片"""
    paragraphs = re.split(r'\n\n+', text)
    chunks = []
    current = ""
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        if len(current) + len(p) < max_chars:
            current += "\n\n" + p if current else p
        else:
            if current:
                chunks.append(current)
            current = p
    if current:
        chunks.append(current)
    return chunks


# ─── 狂人日记 角色关系定义 ────────────────────────────
# NOTE: 后续每部小说扩展时，在这里加新的定义
# 格式：{ "小说标题": { "characters": [...], "relations": [...] } }
NOVEL_WORLDS: dict = {}

NOVEL_WORLDS["狂人日记"] = {
    "characters": [
        {
            "name": "狂人",
            "identity": "叙事者/主人公",
            "personality": "敏感、多疑、觉醒、抗争",
            "quotes": [
                "凡事总须研究，才会明白。",
                "我横竖睡不着，仔细看了半夜，才从字缝里看出字来，满本都写着两个字是'吃人'！",
                "没有吃过人的孩子，或者还有？",
                "救救孩子……",
                "从来如此，便对么？",
            ],
            "appearance": "叙事者，第一人称视角，患有'迫害狂'症",
        },
        {
            "name": "大哥",
            "identity": "狂人的兄长",
            "personality": "表面关切、实则同谋、封建家长代表",
            "quotes": [
                "今天你仿佛很好。",
                "都出去！疯子有什么好看！",
            ],
            "appearance": "家中掌事者，请医生为狂人诊病，实则是合伙吃人的一员",
        },
        {
            "name": "赵贵翁",
            "identity": "乡绅/地主",
            "personality": "伪善、敌视、包藏祸心",
            "quotes": [],
            "appearance": "眼神怪异，似乎怕狂人，又似乎想害狂人。与路上的人约定同狂人作冤对",
        },
        {
            "name": "陈老五",
            "identity": "家中的仆人/佣工",
            "personality": "顺从、忠诚、麻木",
            "quotes": [],
            "appearance": "照顾狂人的生活起居，赶走围观的人，执行大哥的命令",
        },
        {
            "name": "何先生（医生/老头子）",
            "identity": "被请来看病的医生",
            "personality": "伪善、凶狠、实为刽子手",
            "quotes": [
                "不要乱想。静静的养几天，就好了。",
                "赶紧吃罢！",
            ],
            "appearance": "满眼凶光，低头向着地，从眼镜横边暗暗看人。实则是刽子手扮的，来揣一揣肥瘠",
        },
        {
            "name": "赵家的狗",
            "identity": "赵贵翁家的狗",
            "personality": "警觉、同谋",
            "quotes": [],
            "appearance": "看了狂人两眼，引起狂人的警觉。在文中多次出现，是吃人阴谋的一部分",
        },
        {
            "name": "街上的女人",
            "identity": "路人",
            "personality": "凶恶",
            "quotes": [
                "老子呀！我要咬你几口才出气！",
            ],
            "appearance": "打儿子时眼睛却看着狂人，青面獠牙的一伙人便哄笑起来",
        },
        {
            "name": "佃户",
            "identity": "狼子村的佃户",
            "personality": "传递消息的中间人",
            "quotes": [],
            "appearance": "来告荒时说起村里一个大恶人被大家打死，挖出心肝油煎炒了吃",
        },
        {
            "name": "年轻人（二十岁左右）",
            "identity": "路人/吃人理论的信奉者",
            "personality": "固执、遵循旧理、麻木",
            "quotes": [
                "不是荒年，怎么会吃人。",
                "有许有的，这是从来如此……",
                "我不同你讲这些道理；总之你不该说，你说便是你错！",
            ],
            "appearance": "满面笑容，笑不像真笑。被狂人追问吃人之事时变了脸，铁一般青",
        },
        {
            "name": "妹子",
            "identity": "狂人的妹妹",
            "personality": "年幼、无辜",
            "quotes": [],
            "appearance": "五岁时死去，被大哥吃了。狂人在第十一章中回忆起",
        },
        {
            "name": "母亲",
            "identity": "狂人的母亲",
            "personality": "沉默、隐忍",
            "quotes": [],
            "appearance": "妹子死时哭个不住，大约也知道是大哥所为，却没有说明",
        },
    ],
    "relations": [
        {"source": "狂人", "target": "大哥",      "type": "惧怕",   "evidence": "合伙吃我的人，便是我的哥哥！"},
        {"source": "狂人", "target": "大哥",      "type": "亲属",   "evidence": "文中多处称'我大哥'"},
        {"source": "狂人", "target": "赵贵翁",    "type": "怀疑",   "evidence": "赵贵翁的眼色便怪：似乎怕我，似乎想害我"},
        {"source": "狂人", "target": "陈老五",    "type": "服从",   "evidence": "陈老五赶上前，硬把我拖回家中了"},
        {"source": "狂人", "target": "何先生",    "type": "怀疑",   "evidence": "我岂不知道这老头子是刽子手扮的"},
        {"source": "陈老五", "target": "大哥",    "type": "服从",   "evidence": "陈老五执行大哥的命令，赶走围观的人"},
        {"source": "大哥", "target": "狂人",      "type": "迫害",   "evidence": "合伙吃我的人，便是我的哥哥"},
        {"source": "大哥", "target": "何先生",    "type": "信任",   "evidence": "大哥引了一个老头子来给狂人诊病"},
        {"source": "赵贵翁", "target": "狂人",    "type": "敌对",   "evidence": "约定路上的人，同我作冤对"},
        {"source": "赵家的狗", "target": "狂人",  "type": "观察",   "evidence": "赵家的狗，何以看我两眼呢"},
        {"source": "大哥", "target": "妹子",      "type": "迫害",   "evidence": "妹子是被大哥吃了"},
        {"source": "狂人", "target": "年轻人",    "type": "敌对",   "evidence": "他便变了脸，铁一般青"},
        {"source": "狂人", "target": "妹子",      "type": "怜悯",   "evidence": "那时我妹子才五岁，可爱可怜的样子"},
        {"source": "母亲", "target": "大哥",      "type": "服从",   "evidence": "母亲哭的时候，却并没有说明，大约也以为应当的了"},
        {"source": "狂人", "target": "佃户",      "type": "怀疑",   "evidence": "佃户和大哥便都看我几眼"},
    ],
}


def create_database():
    """创建 SQLite 数据库表结构"""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # 文章表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            word_count INTEGER DEFAULT 0,
            source_file TEXT,
            created_at TEXT
        )
    """)
    
    # 段落分片表（RAG 检索用）
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            chunk_index INTEGER DEFAULT 0,
            FOREIGN KEY (article_id) REFERENCES articles(id)
        )
    """)
    
    # 角色表（本体论）
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            identity TEXT,
            personality TEXT,
            appearance TEXT,
            quotes TEXT,
            metadata TEXT,
            FOREIGN KEY (article_id) REFERENCES articles(id)
        )
    """)
    
    # 关系表（本体论）
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS relations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id INTEGER NOT NULL,
            source TEXT NOT NULL,
            target TEXT NOT NULL,
            type TEXT NOT NULL,
            evidence TEXT,
            FOREIGN KEY (article_id) REFERENCES articles(id)
        )
    """)
    
    # 本体论关系类型词典
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS relation_types (
            type TEXT PRIMARY KEY,
            description TEXT
        )
    """)
    
    # 系统信息表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    
    # 插入关系类型词典
    for rtype, desc in RELATION_TYPES.items():
        cursor.execute(
            "INSERT OR IGNORE INTO relation_types (type, description) VALUES (?, ?)",
            (rtype, desc)
        )
    
    conn.commit()
    return conn


def scan_articles(conn: sqlite3.Connection):
    """扫描 raw_data 目录，导入文章和分片"""
    cursor = conn.cursor()
    total_articles = 0
    total_chunks = 0
    
    # 获取已导入的文件列表（用于增量更新）
    cursor.execute("SELECT source_file FROM articles WHERE source_file IS NOT NULL")
    imported = set(row[0] for row in cursor.fetchall())
    
    md_files = list(RAW_DATA_DIR.rglob("*.md"))
    
    for md_path in sorted(md_files):
        # 跳过非作品目录
        rel_parts = md_path.relative_to(RAW_DATA_DIR).parts
        skip_dirs = {"鲁迅相", "手稿图片", "新闻", "2q"}
        if any(d in rel_parts for d in skip_dirs):
            continue
        
        source_file = str(md_path.relative_to(RAW_DATA_DIR))
        
        # 增量更新：已导入的跳过
        if source_file in imported:
            continue
        
        try:
            with open(md_path, "r", encoding="utf-8") as f:
                raw = f.read()
        except Exception as e:
            print(f"  ⚠️  读取失败 {md_path.name}: {e}")
            continue
        
        text = clean_text(raw)
        if not text:
            continue
        
        collection = get_collection_name(md_path.parent, RAW_DATA_DIR)
        title = extract_title_from_filename(md_path.stem)
        word_count = len(text.replace(" ", "").replace("\n", ""))
        
        cursor.execute(
            "INSERT INTO articles (collection, title, content, word_count, source_file) VALUES (?, ?, ?, ?, ?)",
            (collection, title, text, word_count, source_file)
        )
        article_id = cursor.lastrowid
        total_articles += 1
        
        # 分片
        chunks = chunk_text(text)
        for i, chunk in enumerate(chunks):
            cursor.execute(
                "INSERT INTO chunks (article_id, content, chunk_index) VALUES (?, ?, ?)",
                (article_id, chunk, i)
            )
            total_chunks += 1
        
        print(f"  ✅ {collection}/{title} ({word_count}字, {len(chunks)}片)")
    
    conn.commit()
    return total_articles, total_chunks


def import_novel_worlds(conn: sqlite3.Connection):
    """导入小说世界的人物关系数据"""
    cursor = conn.cursor()
    
    for novel_title, world_data in NOVEL_WORLDS.items():
        # 查找对应的文章
        cursor.execute(
            "SELECT id FROM articles WHERE title LIKE ? LIMIT 1",
            (f"%{novel_title}%",)
        )
        row = cursor.fetchone()
        if not row:
            print(f"  ⚠️  找不到文章《{novel_title}》，跳过人物关系导入")
            continue
        
        article_id = row[0]
        
        # 导入角色
        for char in world_data["characters"]:
            cursor.execute(
                "INSERT INTO characters (article_id, name, identity, personality, appearance, quotes) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    article_id,
                    char["name"],
                    char.get("identity", ""),
                    char.get("personality", ""),
                    char.get("appearance", ""),
                    json.dumps(char.get("quotes", []), ensure_ascii=False),
                )
            )
        
        # 导入关系
        for rel in world_data["relations"]:
            cursor.execute(
                "INSERT INTO relations (article_id, source, target, type, evidence) VALUES (?, ?, ?, ?, ?)",
                (
                    article_id,
                    rel["source"],
                    rel["target"],
                    rel["type"],
                    rel.get("evidence", ""),
                )
            )
        
        chars_count = len(world_data["characters"])
        rels_count = len(world_data["relations"])
        print(f"  🌌 「{novel_title}」世界: {chars_count}角色, {rels_count}关系")
    
    conn.commit()


def print_stats(conn: sqlite3.Connection):
    """打印数据库统计信息"""
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM articles")
    articles = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM chunks")
    chunks = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM characters")
    characters = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM relations")
    relations = cursor.fetchone()[0]
    
    cursor.execute("SELECT SUM(word_count) FROM articles")
    total_words = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT COUNT(DISTINCT collection) FROM articles")
    collections = cursor.fetchone()[0]
    
    print(f"\n📊 数据库统计")
    print(f"  📚 文集数: {collections}")
    print(f"  📄 文章数: {articles}")
    print(f"  📝 总字数: {total_words:,}")
    print(f"  🧩 分片数: {chunks}")
    print(f"  👤 角色数: {characters}")
    print(f"  🔗 关系数: {relations}")
    print(f"  💾 数据库大小: {DB_PATH.stat().st_size / 1024:.1f} KB")


def rebuild_database():
    """重建数据库"""
    if DB_PATH.exists():
        DB_PATH.unlink()
        print("🗑️  已删除旧数据库")
    
    conn = create_database()
    print("🏗️  创建数据库表结构")
    
    print("\n📖 扫描文章...")
    art_count, chk_count = scan_articles(conn)
    print(f"  → 导入 {art_count} 篇文章, {chk_count} 个分片")
    
    print("\n🌌 导入小说世界...")
    import_novel_worlds(conn)
    
    # 更新元数据
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
        ("version", "1.0.0")
    )
    cursor.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
        ("built_at", __import__('datetime').datetime.now().isoformat())
    )
    conn.commit()
    
    print_stats(conn)
    conn.close()
    print(f"\n✨ 构建完成！数据库位置: {DB_PATH}")


def incremental_update():
    """增量更新"""
    if not DB_PATH.exists():
        print("⚠️  数据库不存在，执行完整构建")
        rebuild_database()
        return
    
    conn = create_database()
    
    print("\n📖 增量扫描文章...")
    art_count, chk_count = scan_articles(conn)
    
    if art_count == 0:
        print("  → 没有新文章需要导入")
    else:
        print(f"  → 新增 {art_count} 篇文章, {chk_count} 个分片")
    
    # 小说世界数据如果更新了，重新导入（通过检查文章是否已经有关联的角色）
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM characters")
    existing_chars = cursor.fetchone()[0]
    
    if existing_chars == 0 and NOVEL_WORLDS:
        print("\n🌌 导入小说世界...")
        import_novel_worlds(conn)
    
    print_stats(conn)
    conn.close()
    print(f"\n✨ 增量更新完成！数据库位置: {DB_PATH}")


def export_for_frontend(conn: sqlite3.Connection, novel_title: str) -> dict:
    """
    导出小说世界数据供前端使用
    返回 JSON 格式的图谱数据
    """
    cursor = conn.cursor()
    
    # 找文章
    cursor.execute(
        "SELECT id FROM articles WHERE title LIKE ? LIMIT 1",
        (f"%{novel_title}%",)
    )
    row = cursor.fetchone()
    if not row:
        return {"error": f"找不到文章《{novel_title}》"}
    
    article_id = row[0]
    
    # 取角色
    cursor.execute(
        "SELECT name, identity, personality, appearance, quotes FROM characters WHERE article_id = ?",
        (article_id,)
    )
    characters = []
    for row in cursor.fetchall():
        characters.append({
            "id": row[0],
            "name": row[0],
            "identity": row[1],
            "personality": row[2],
            "appearance": row[3],
            "quotes": json.loads(row[4]) if row[4] else [],
        })
    
    # 取关系
    cursor.execute(
        "SELECT source, target, type, evidence FROM relations WHERE article_id = ?",
        (article_id,)
    )
    relations = []
    for row in cursor.fetchall():
        relations.append({
            "source": row[0],
            "target": row[1],
            "type": row[2],
            "evidence": row[3],
        })
    
    return {
        "title": novel_title,
        "characters": characters,
        "relations": relations,
        "relationTypes": RELATION_TYPES,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="鲁迅数字宇宙数据构建工具")
    parser.add_argument("--rebuild", action="store_true", help="删除并重建数据库")
    parser.add_argument("--export", type=str, help="导出指定小说的图谱数据 (JSON)")
    args = parser.parse_args()
    
    if args.export:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        data = export_for_frontend(conn, args.export)
        print(json.dumps(data, ensure_ascii=False, indent=2))
        conn.close()
    elif args.rebuild:
        rebuild_database()
    else:
        incremental_update()
