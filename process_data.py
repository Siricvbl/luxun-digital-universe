import os
import json

def process_luxun_data(search_path):
    library = {}
    # 确保 public 目录存在
    if not os.path.exists('./public'):
        os.makedirs('./public')
        
    print(f"🔍 正在启动深度挖掘 (目标: {os.path.abspath(search_path)})")

    # 深度遍历所有文件
    for root, dirs, files in os.walk(search_path):
        
        # 【逻辑优化 1】跳过根目录 (raw_data) 下的文件，只处理子文件夹
        # 这样可以解决你提到的 README.md 出现在列表里的尴尬
        if os.path.abspath(root) == os.path.abspath(search_path):
            continue

        # 寻找 .md 文件
        md_files = [f for f in files if f.endswith('.md')]
        
        if md_files:
            # 获取当前文件夹名字作为分类名（如：朝花夕拾、呐喊）
            category = os.path.basename(root)
            
            # 【逻辑优化 2】过滤掉非文字作品的文件夹
            if category in ['鲁迅相', '手稿图片', '新闻', '2q']:
                continue

            if category not in library:
                library[category] = []
            
            for file in sorted(md_files):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # 跳过空文件
                        if not content.strip(): continue
                        
                        # 清理标题：去掉 .md 后缀
                        title = file.replace('.md', '')
                        
                        library[category].append({
                            "title": title,
                            "content": content
                        })
                except Exception as e:
                    print(f"⚠️ 读取出错 {file}: {e}")
            
            if library.get(category):
                print(f"✅ 已装载文集: 《{category}》 ({len(library[category])} 篇)")

    # 写入结果
    if not library:
        print("❌ 错误：扫描完毕，但没有发现任何有效的 .md 作品！")
        return

    output_path = './public/library.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(library, f, ensure_ascii=False, indent=2)
    
    total_count = sum(len(v) for v in library.values())
    print(f"\n✨ 炼金大成功！")
    print(f"📦 最终入库: {len(library)} 个分类")
    print(f"📝 文本总量: {total_count} 篇")
    print(f"💾 存储位置: {output_path}")

if __name__ == "__main__":
    # 执行扫描
    process_luxun_data('./raw_data')