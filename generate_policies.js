const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const policiesDir = path.join(rootDir, 'privacy-policies');
const indexFile = path.join(rootDir, 'index.html');

// Ensure policies directory exists
if (!fs.existsSync(policiesDir)) {
    fs.mkdirSync(policiesDir);
}

// Helper to get directories
const getDirectories = source =>
    fs.readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

// Helper to read manifest
const readManifest = (dirPath) => {
    let manifestPath = path.join(dirPath, 'manifest.json');

    // Check root first, then public/ (common in Vite apps)
    if (!fs.existsSync(manifestPath)) {
        manifestPath = path.join(dirPath, 'public', 'manifest.json');
    }

    if (fs.existsSync(manifestPath)) {
        try {
            return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch (e) {
            console.error(`Error reading manifest in ${dirPath}:`, e);
        }
    }
    return null;
};

// HTML Template for Policy
const generatePolicyHTML = (extensionName, permissions) => {
    let permissionList = '<p>This extension requires no special permissions.</p>';

    if (permissions && permissions.length > 0) {
        permissionList = `<ul>${permissions.map(p => `<li><strong>${p}</strong>: Required for extension functionality.</li>`).join('')}</ul>`;
    }

    return `<!-- AUTO-GENERATED POLICY -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - ${extensionName}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { margin-top: 30px; }
        ul { list-style-type: disc; padding-left: 20px; }
        li { margin-bottom: 10px; }
        code { background-color: #f4f4f4; padding: 2px 5px; border-radius: 3px; font-family: monospace; }
        .footer { margin-top: 50px; font-size: 0.8em; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
</head>
<body>
    <h1>Privacy Policy for ${extensionName}</h1>
    
    <h2>Introduction</h2>
    <p>This Privacy Policy describes how the <strong>${extensionName}</strong> Chrome extension collects, uses, and discloses information, and what choices you have with respect to the information.</p>

    <h2>Data Collection and Usage</h2>
    <p><strong>We do not collect any personal data.</strong></p>
    <p>The <strong>${extensionName}</strong> operates entirely locally on your device.</p>
    <ul>
        <li>We do <strong>not</strong> transmit any data to external servers.</li>
        <li>We do <strong>not</strong> collect your browsing history.</li>
        <li>We do <strong>not</strong> collect any personally identifiable information (PII).</li>
    </ul>

    <h2>Permissions Usage</h2>
    <p>The extension requests the following permissions for functionality purposes only:</p>
    ${permissionList}

    <h2>Third-Party Services</h2>
    <p>This extension does not use any third-party analytics or tracking services.</p>

    <h2>Changes to This Policy</h2>
    <p>We may update our Privacy Policy from time to time. Thus, you are advised to review this page periodically for any changes.</p>

    <h2>Contact Us</h2>
    <p>If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us.</p>
    
    <div class="footer">
        &copy; 2026 Saurabh Tiwari and ANSLATION COMPANY. All rights reserved.
    </div>
</body>
</html>`;
};

// HTML Template for Index
const generateIndexHTML = (extensions) => {
    const cards = extensions.map(ext => `
        <div class="card">
            <div class="info">
                <h3>${ext.name}</h3>
                <p>Privacy Policy${ext.hasTerms ? ' & Terms' : ''}</p>
            </div>
            <div class="link-box">https://SAURABHTIWARI-ANSLATION.github.io/Extension-Hub/privacy-policies/${ext.filename}</div>
            ${ext.hasTerms ? `
            <div style="display: flex; gap: 10px;">
                <a href="privacy-policies/${ext.filename}" class="view-btn" style="flex: 1;">Privacy Policy</a>
                <a href="privacy-policies/${ext.termsFilename}" class="view-btn" style="flex: 1; background-color: #607d8b;">Terms of Service</a>
            </div>` : `
            <a href="privacy-policies/${ext.filename}" class="view-btn">View Policy</a>
            `}
        </div>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policies - Extension Hub</title>
    <style>
        :root {
            --primary-color: #2196F3;
            --primary-dark: #1976D2;
            --text-color: #333;
            --bg-color: #f8f9fa;
            --card-bg: #ffffff;
            --border-color: #e9ecef;
        }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 1100px; margin: 0 auto; padding: 40px 20px; color: var(--text-color); background-color: var(--bg-color); }
        header { text-align: center; margin-bottom: 50px; }
        h1 { font-size: 2.5em; margin-bottom: 10px; color: #1a1a1a; }
        .description { color: #6c757d; font-size: 1.1em; }
        
        .search-container { margin-bottom: 40px; position: sticky; top: 20px; z-index: 1000; display: flex; justify-content: center; }
        #searchInput { width: 100%; max-width: 700px; padding: 15px 25px; font-size: 18px; border: 1px solid #ced4da; border-radius: 50px; outline: none; transition: all 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        #searchInput:focus { border-color: var(--primary-color); box-shadow: 0 4px 20px rgba(33, 150, 243, 0.15); }

        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        .card { border: 1px solid var(--border-color); border-radius: 16px; padding: 28px; background: var(--card-bg); display: flex; flex-direction: column; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .card:hover { transform: translateY(-5px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: #dee2e6; }
        
        .info { margin-bottom: 24px; flex-grow: 1; }
        .info h3 { margin: 0 0 10px 0; color: #1a1a1a; font-size: 1.25em; font-weight: 600; line-height: 1.3; }
        .info p { margin: 0; font-size: 0.9em; color: #868e96; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; }
        
        .link-box { background: #f1f3f5; padding: 12px; border-radius: 8px; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.75em; color: #495057; margin-bottom: 20px; user-select: all; word-break: break-all; border: 1px solid #e9ecef; line-height: 1.4; }
        
        .view-btn { display: block; text-align: center; padding: 12px 24px; background-color: var(--primary-color); color: white; text-decoration: none; border-radius: 8px; font-size: 1em; font-weight: 600; transition: all 0.2s; }
        .view-btn:hover { background-color: var(--primary-dark); box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3); }
        
        #noResults { display: none; text-align: center; padding: 80px 20px; color: #adb5bd; font-size: 1.4em; border: 2px dashed #dee2e6; border-radius: 20px; }
        
        .footer { margin-top: 80px; text-align: center; color: #adb5bd; font-size: 0.9em; border-top: 1px solid #e9ecef; padding-top: 40px; }

        @media (max-width: 600px) {
            .grid { grid-template-columns: 1fr; }
            h1 { font-size: 1.8em; }
            body { padding: 20px 15px; }
        }
    </style>
</head>
<body>
    <header>
        <h1>Extension Hub Privacy Policies</h1>
        <p class="description">Browse and access privacy policies for all <strong>${extensions.length}</strong> official extensions.</p>
    </header>
    
    <div class="search-container">
        <input type="text" id="searchInput" placeholder="Search by extension name..." onkeyup="filterPolicies()" autofocus>
    </div>

    <div id="noResults">
        <p>No extensions found matching your search.</p>
        <button onclick="document.getElementById('searchInput').value=''; filterPolicies()" style="background:none; border:none; color:var(--primary-color); cursor:pointer; font-weight:bold; font-size:0.8em; text-decoration:underline;">Clear search</button>
    </div>
    
    <div class="grid" id="policyGrid">
        ${cards}
    </div>

    <div class="footer">
        &copy; 2026 Saurabh Tiwari and ANSLATION COMPANY. All rights reserved.<br>
        <small>Note: Updates may take a few minutes to appear on the live site after deployment.</small>
    </div>

    <script>
    function filterPolicies() {
        const input = document.getElementById('searchInput');
        const filter = input.value.toLowerCase();
        const grid = document.getElementById('policyGrid');
        const cards = grid.getElementsByClassName('card');
        const noResults = document.getElementById('noResults');
        let visibleCount = 0;

        for (let i = 0; i < cards.length; i++) {
            const h3 = cards[i].getElementsByTagName('h3')[0];
            const txtValue = h3.textContent || h3.innerText;
            if (txtValue.toLowerCase().indexOf(filter) > -1) {
                cards[i].style.display = "";
                visibleCount++;
            } else {
                cards[i].style.display = "none";
            }
        }
        
        noResults.style.display = visibleCount === 0 ? "block" : "none";
        grid.style.display = visibleCount === 0 ? "none" : "grid";
    }
    </script>
</body>
</html>`;
};

// Helper to resolve localized name
const resolveName = (dirPath, rawName) => {
    if (rawName && rawName.startsWith('__MSG_')) {
        const key = rawName.replace('__MSG_', '').replace('__', '');
        const messagesPath = path.join(dirPath, '_locales', 'en', 'messages.json');
        if (fs.existsSync(messagesPath)) {
            try {
                const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
                if (messages[key] && messages[key].message) {
                    return messages[key].message;
                }
            } catch (e) {
                console.error(`Error reading locales for ${dirPath}:`, e);
            }
        }
    }
    return rawName;
};

// Main Execution
const directories = getDirectories(rootDir);
const processedExtensions = [];

directories.forEach(dir => {
    if (dir === 'privacy-policies' || dir.startsWith('.')) return;

    const dirPath = path.join(rootDir, dir);
    const manifest = readManifest(dirPath);

    if (manifest) {
        let name = manifest.name || dir;
        name = resolveName(dirPath, name);

        const permissions = [
            ...(manifest.permissions || []),
            ...(manifest.host_permissions || [])
        ];

        // Sanitize filename
        let filename = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (!filename) filename = 'extension';
        filename += '.html';

        const existingPolicyPath = path.join(policiesDir, filename);
        let content;

        const p1 = path.join(dirPath, 'privacy_policy.html');
        const p2 = path.join(dirPath, 'privacy.html');

        if (fs.existsSync(p1)) {
            content = fs.readFileSync(p1, 'utf8');
            fs.unlinkSync(p1);
            console.log(`Moved custom policy: ${name} from privacy_policy.html`);
        } else if (fs.existsSync(p2)) {
            content = fs.readFileSync(p2, 'utf8');
            fs.unlinkSync(p2);
            console.log(`Moved custom policy: ${name} from privacy.html`);
        } else if (fs.existsSync(existingPolicyPath)) {
            const existingContent = fs.readFileSync(existingPolicyPath, 'utf8');
            if (!existingContent.includes('<!-- AUTO-GENERATED POLICY -->')) {
                content = existingContent;
                console.log(`Kept custom policy for: ${name} (from ${filename})`);
            } else {
                content = generatePolicyHTML(name, permissions);
                console.log(`Updated default policy for: ${name}`);
            }
        } else {
            content = generatePolicyHTML(name, permissions);
            console.log(`Generated default policy for: ${name}`);
        }

        fs.writeFileSync(existingPolicyPath, content);
        
        // Handle Terms of Service
        let hasTerms = false;
        let termsFilename = '';
        const t1 = path.join(dirPath, 'terms.html');
        const t2 = path.join(dirPath, 'terms_of_service.html');
        const t3 = path.join(policiesDir, filename.replace('.html', '-terms.html'));

        if (fs.existsSync(t1)) {
            const termsContent = fs.readFileSync(t1, 'utf8');
            termsFilename = filename.replace('.html', '-terms.html');
            fs.writeFileSync(path.join(policiesDir, termsFilename), termsContent);
            fs.unlinkSync(t1);
            hasTerms = true;
            console.log(`Moved custom terms: ${name} from terms.html`);
        } else if (fs.existsSync(t2)) {
            const termsContent = fs.readFileSync(t2, 'utf8');
            termsFilename = filename.replace('.html', '-terms.html');
            fs.writeFileSync(path.join(policiesDir, termsFilename), termsContent);
            fs.unlinkSync(t2);
            hasTerms = true;
            console.log(`Moved custom terms: ${name} from terms_of_service.html`);
        } else if (fs.existsSync(t3)) {
            hasTerms = true;
            termsFilename = filename.replace('.html', '-terms.html');
            console.log(`Found existing terms: ${name}`);
        }

        processedExtensions.push({ name, filename, hasTerms, termsFilename });
    }
});

const legacyIndexFile = path.join(rootDir, 'privacy_index.html');

// Before logging success:
const indexContent = generateIndexHTML(processedExtensions);
fs.writeFileSync(indexFile, indexContent);
fs.writeFileSync(legacyIndexFile, indexContent);
console.log(`\nSuccessfully generated ${processedExtensions.length} privacy policies and updated both index.html and privacy_index.html.`);
