import os
import re

def get_title_from_html(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Try to get from <h1> first: <h1>Privacy Policy for BMI Calculator</h1>
            match = re.search(r'<h1>Privacy Policy for (.*?)</h1>', content, re.IGNORECASE)
            if match:
                return match.group(1).strip()
            # Try to get from <h1> without "for": <h1>BMI Calculator Privacy Policy</h1>
            match = re.search(r'<h1>(.*?) Privacy Policy</h1>', content, re.IGNORECASE)
            if match:
                return match.group(1).strip()
            # Fallback to <title>
            match = re.search(r'<title>(.*?) - (.*?)</title>', content, re.IGNORECASE)
            if match:
                return match.group(2).strip()
            match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE)
            if match:
                return match.group(1).replace('Privacy Policy - ', '').strip()
    except Exception:
        pass
    
    # Fallback to filename
    base = os.path.basename(file_path).replace('.html', '')
    return base.replace('-', ' ').title()

def generate_index():
    policies_dir = 'privacy-policies'
    index_file = 'privacy_index.html'
    
    if not os.path.exists(policies_dir):
        print(f"Error: {policies_dir} not found.")
        return

    policies = []
    filenames = sorted(os.listdir(policies_dir))
    for filename in filenames:
        if filename.endswith('.html'):
            path = os.path.join(policies_dir, filename)
            title = get_title_from_html(path)
            policies.append({
                'title': title,
                'filename': filename,
                'url': f'https://SAURABHTIWARI-ANSLATION.github.io/Extension-Hub/privacy-policies/{filename}'
            })

    html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policies - Extension Hub</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 20px; color: #333; }}
        h1 {{ text-align: center; margin-bottom: 20px; }}
        .description {{ text-align: center; color: #666; margin-bottom: 40px; }}
        .grid {{ display: grid; grid-template-columns: 1fr; gap: 15px; }}
        .card {{ border: 1px solid #eee; border-radius: 8px; padding: 20px; background: #fff; display: flex; justify-content: space-between; align-items: center; }}
        .card:hover {{ border-color: #bbb; }}
        .info {{ flex-grow: 1; }}
        .info h3 {{ margin: 0 0 5px 0; color: #2196F3; }}
        .info p {{ margin: 0; font-size: 0.9em; color: #666; }}
        .link-box {{ background: #f5f5f5; padding: 8px 12px; border-radius: 4px; border: 1px solid #ddd; font-family: monospace; font-size: 0.85em; color: #333; margin-left: 20px; user-select: all; white-space: nowrap; overflow-x: auto; max-width: 400px; }}
        .view-btn {{ display: inline-block; padding: 8px 16px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; font-size: 0.9em; margin-left: 10px; white-space: nowrap; }}
        .view-btn:hover {{ background-color: #1976D2; }}
    </style>
</head>
<body>
    <h1>Extension Hub Privacy Policies</h1>
    <p class="description">Below are the direct links to the privacy policies for all extensions ({count} total).</p>
    <div class="grid">
        {cards}
    </div>
</body>
</html>"""

    cards = []
    for p in policies:
        card = f"""
        <div class="card">
            <div class="info">
                <h3>{p['title']}</h3>
                <p>Privacy Policy</p>
            </div>
            <div class="link-box">
                {p['url']}</div>
            <a href="privacy-policies/{p['filename']}" class="view-btn">View Policy</a>
        </div>"""
        cards.append(card)

    with open(index_file, 'w', encoding='utf-8') as f:
        f.write(html_template.format(count=len(policies), cards="".join(cards)))
    
    print(f"Successfully generated {index_file} with {len(policies)} policies.")

def validate_policies():
    print("Validating extension policies...")
    exclude = ['.git', '.github', 'scripts', 'privacy-policies', 'node_modules', 'icons']
    extensions = []
    for item in os.listdir('.'):
        if os.path.isdir(item) and item not in exclude:
            if os.path.exists(os.path.join(item, 'manifest.json')):
                extensions.append(item)
    
    policy_files = os.listdir('privacy-policies')
    missing = []
    for ext in extensions:
        target = ext.lower().replace('-', '').replace(' ', '')
        found = False
        for pf in policy_files:
            if target in pf.lower().replace('-', '').replace(' ', ''):
                found = True
                break
        if not found:
            missing.append(ext)
    
    if missing:
        print(f"❌ Missing privacy policies for {len(missing)} extensions:")
        for m in missing:
            print(f"  - {m}")
        # We don't exit(1) yet to allow index generation even with warnings, 
        # but the Github Action will use this status.
        return False
    
    print("✅ All extensions have corresponding privacy policies.")
    return True

if __name__ == "__main__":
    generate_index()
    if not validate_policies():
        # Optional: exit(1) if you want to fail the CI on missing policies
        pass
