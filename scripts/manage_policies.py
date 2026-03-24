import os
import re
import json

def get_title_from_html(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            match = re.search(r'<h1>Privacy Policy for (.*?)</h1>', content, re.IGNORECASE)
            if match: return match.group(1).strip()
            match = re.search(r'<h1>(.*?) Privacy Policy</h1>', content, re.IGNORECASE)
            if match: return match.group(1).strip()
            # Try to catch simple <h1>[Title]</h1>
            match = re.search(r'<h1>(.*?)</h1>', content, re.IGNORECASE)
            if match and "privacy" not in match.group(1).lower():
                return match.group(1).strip()
    except Exception:
        pass
    base = os.path.basename(file_path).replace('.html', '')
    return base.replace('-', ' ').title()

def generate_index():
    policies_dir = 'privacy-policies'
    index_file = 'privacy_index.html'
    
    if not os.path.exists(policies_dir):
        print(f"Error: {policies_dir} not found.")
        return

    # Map filenames to titles
    policies = []
    filenames = sorted(os.listdir(policies_dir))
    
    # Simple deduplication: map title to best filename
    seen_titles = {} 
    
    for filename in filenames:
        if filename.endswith('.html'):
            path = os.path.join(policies_dir, filename)
            title = get_title_from_html(path)
            
            # Basic cleanup
            title = title.replace('Privacy Policy - ', '').replace(' Privacy Policy', '').strip()
            if '__MSG_' in title:
                title = filename.replace('.html', '').replace('-', ' ').title()
            
            # Prefer longer filenames as they are usually more specific (e.g. accessibility-score-calculator over accessibility)
            if title not in seen_titles or len(filename) > len(seen_titles[title]['filename']):
                seen_titles[title] = {
                    'title': title,
                    'filename': filename,
                    'url': f'https://SAURABHTIWARI-ANSLATION.github.io/Extension-Hub/privacy-policies/{filename}'
                }

    final_policies = sorted(seen_titles.values(), key=lambda x: x['title'].lower())

    html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policies - Extension Hub</title>
    <style>
        :root {{
            --primary-color: #2196F3;
            --primary-dark: #1976D2;
            --text-color: #333;
            --bg-color: #f8f9fa;
            --card-bg: #ffffff;
            --border-color: #e9ecef;
        }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 1100px; margin: 0 auto; padding: 40px 20px; color: var(--text-color); background-color: var(--bg-color); }}
        header {{ text-align: center; margin-bottom: 50px; }}
        h1 {{ font-size: 2.5em; margin-bottom: 10px; color: #1a1a1a; }}
        .description {{ color: #6c757d; font-size: 1.1em; }}
        
        .search-container {{ margin-bottom: 40px; position: sticky; top: 20px; z-index: 1000; display: flex; justify-content: center; }}
        #searchInput {{ width: 100%; max-width: 700px; padding: 15px 25px; font-size: 18px; border: 1px solid #ced4da; border-radius: 50px; outline: none; transition: all 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
        #searchInput:focus {{ border-color: var(--primary-color); box-shadow: 0 4px 20px rgba(33, 150, 243, 0.15); }}

        .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }}
        .card {{ border: 1px solid var(--border-color); border-radius: 16px; padding: 28px; background: var(--card-bg); display: flex; flex-direction: column; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.02); }}
        .card:hover {{ transform: translateY(-5px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: #dee2e6; }}
        
        .info {{ margin-bottom: 24px; flex-grow: 1; }}
        .info h3 {{ margin: 0 0 10px 0; color: #1a1a1a; font-size: 1.25em; font-weight: 600; line-height: 1.3; }}
        .info p {{ margin: 0; font-size: 0.9em; color: #868e96; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; }}
        
        .link-box {{ background: #f1f3f5; padding: 12px; border-radius: 8px; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.75em; color: #495057; margin-bottom: 20px; user-select: all; word-break: break-all; border: 1px solid #e9ecef; line-height: 1.4; }}
        
        .view-btn {{ display: block; text-align: center; padding: 12px 24px; background-color: var(--primary-color); color: white; text-decoration: none; border-radius: 8px; font-size: 1em; font-weight: 600; transition: all 0.2s; }}
        .view-btn:hover {{ background-color: var(--primary-dark); box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3); }}
        
        #noResults {{ display: none; text-align: center; padding: 80px 20px; color: #adb5bd; font-size: 1.4em; border: 2px dashed #dee2e6; border-radius: 20px; }}
        
        .footer {{ margin-top: 80px; text-align: center; color: #adb5bd; font-size: 0.9em; border-top: 1px solid #e9ecef; padding-top: 40px; }}

        @media (max-width: 600px) {{
            .grid {{ grid-template-columns: 1fr; }}
            h1 {{ font-size: 1.8em; }}
            body {{ padding: 20px 15px; }}
        }}
    </style>
</head>
<body>
    <header>
        <h1>Extension Hub Privacy Policies</h1>
        <p class="description">Browse and access privacy policies for all <strong>{count}</strong> official extensions.</p>
    </header>
    
    <div class="search-container">
        <input type="text" id="searchInput" placeholder="Search by extension name..." onkeyup="filterPolicies()" autofocus>
    </div>

    <div id="noResults">
        <p>No extensions found matching your search.</p>
        <button onclick="document.getElementById('searchInput').value=''; filterPolicies()" style="background:none; border:none; color:var(--primary-color); cursor:pointer; font-weight:bold; font-size:0.8em; text-decoration:underline;">Clear search</button>
    </div>
    
    <div class="grid" id="policyGrid">
        {cards}
    </div>

    <div class="footer">
        &copy; 2026 Saurabh Tiwari and ANSLATION COMPANY. All rights reserved.<br>
        <small>Note: Updates may take a few minutes to appear on the live site after deployment.</small>
    </div>

    <script>
    function filterPolicies() {{
        const input = document.getElementById('searchInput');
        const filter = input.value.toLowerCase();
        const grid = document.getElementById('policyGrid');
        const cards = grid.getElementsByClassName('card');
        const noResults = document.getElementById('noResults');
        let visibleCount = 0;

        for (let i = 0; i < cards.length; i++) {{
            const h3 = cards[i].getElementsByTagName('h3')[0];
            const txtValue = h3.textContent || h3.innerText;
            if (txtValue.toLowerCase().indexOf(filter) > -1) {{
                cards[i].style.display = "";
                visibleCount++;
            }} else {{
                cards[i].style.display = "none";
            }}
        }}
        
        noResults.style.display = visibleCount === 0 ? "block" : "none";
        grid.style.display = visibleCount === 0 ? "none" : "grid";
    }}
    </script>
</body>
</html>"""

    cards = []
    for p in final_policies:
        card = f"""
        <div class="card">
            <div class="info">
                <h3>{p['title']}</h3>
                <p>Privacy Policy</p>
            </div>
            <div class="link-box">{p['url']}</div>
            <a href="privacy-policies/{p['filename']}" class="view-btn">View Policy</a>
        </div>"""
        cards.append(card)

    for filename in ['privacy_index.html', 'index.html']:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_template.format(count=len(final_policies), cards="".join(cards)))
    
    print(f"Successfully generated privacy_index.html and index.html with {len(final_policies)} policies (deduplicated).")

if __name__ == "__main__":
    generate_index()
    # validate_policies()
