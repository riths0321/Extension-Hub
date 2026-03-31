import { BASE_RULES, CATEGORY_DEFINITIONS, CONFIG_DEFINITIONS, STACK_DEFINITIONS } from './state.js';

export function analyzeProjectInput(input) {
  const text = (input || '').toLowerCase();
  const detectedStacks = [];

  const matches = [
    { stack: 'node', pattern: /package\.json|pnpm-lock|yarn\.lock|node_modules|vite|express/ },
    { stack: 'react', pattern: /react|jsx|create-react-app|vite/ },
    { stack: 'nextjs', pattern: /next\.config|next\/|app router|__next/ },
    { stack: 'python', pattern: /requirements\.txt|pyproject\.toml|pipenv|poetry|pytest/ },
    { stack: 'django', pattern: /django|manage\.py|wsgi\.py|asgi\.py/ },
    { stack: 'java', pattern: /pom\.xml|build\.gradle|settings\.gradle|maven|gradle/ },
    { stack: 'spring', pattern: /spring-boot|springframework|application\.properties/ },
    { stack: 'php', pattern: /composer\.json|artisan|phpunit|laravel/ },
    { stack: 'laravel', pattern: /laravel|artisan|config\/app\.php/ },
    { stack: 'go', pattern: /go\.mod|go\.sum|package main/ },
    { stack: 'rust', pattern: /cargo\.toml|cargo\.lock|rustc|crate/ },
    { stack: 'docker', pattern: /dockerfile|docker-compose|compose\.yaml|container/ },
    { stack: 'flutter', pattern: /flutter|pubspec\.yaml|dart_tool/ }
  ];

  matches.forEach(match => {
    if (match.pattern.test(text)) {
      detectedStacks.push(match.stack);
    }
  });

  return {
    detectedStacks: [...new Set(detectedStacks)]
  };
}

export function buildArtifacts({ selectedStacks, selectedCategories, enabledConfigs, customRules, scanInput }) {
  const analysis = analyzeProjectInput(scanInput);
  const stacks = [...new Set([...selectedStacks, ...analysis.detectedStacks])];
  const selectedCategorySet = new Set(selectedCategories);
  const categoryRuleMap = buildCategoryRuleMap(stacks, selectedCategorySet, customRules);

  return {
    files: buildFiles(categoryRuleMap, stacks, enabledConfigs),
    suggestions: buildSuggestions(stacks, enabledConfigs),
    warnings: buildWarnings(stacks, customRules),
    categoryStats: buildCategoryStats(categoryRuleMap)
  };
}

function buildCategoryRuleMap(stacks, selectedCategorySet, customRules) {
  const categoryRuleMap = new Map();

  Object.entries(BASE_RULES).forEach(([categoryId, rules]) => {
    if (!selectedCategorySet.has(categoryId)) return;
    rules.forEach(rule => pushRule(categoryRuleMap, categoryId, rule));
  });

  stacks.forEach(stackId => {
    const stack = STACK_DEFINITIONS[stackId];
    if (!stack) return;
    Object.entries(stack.rules).forEach(([categoryId, rules]) => {
      if (!selectedCategorySet.has(categoryId)) return;
      rules.forEach(rule => pushRule(categoryRuleMap, categoryId, { ...rule, stackId }));
    });
  });

  customRules
    .split('\n')
    .map(rule => rule.trim())
    .filter(Boolean)
    .forEach(rule => {
      pushRule(categoryRuleMap, 'tooling', {
        pattern: rule,
        reason: 'Custom rule added from the advanced tools panel.',
        stackId: 'custom'
      });
    });

  return categoryRuleMap;
}

function pushRule(map, categoryId, rule) {
  const key = `${categoryId}:${rule.pattern}`;
  if (!map.has(categoryId)) {
    map.set(categoryId, new Map());
  }
  const categoryMap = map.get(categoryId);
  if (!categoryMap.has(key)) {
    categoryMap.set(key, rule);
  }
}

function buildFiles(categoryRuleMap, stacks, enabledConfigs) {
  const files = {};
  if (enabledConfigs.gitignore) {
    files.gitignore = buildGitignore(categoryRuleMap, stacks);
  }
  if (enabledConfigs.gitattributes) {
    files.gitattributes = buildGitattributes(stacks);
  }
  if (enabledConfigs.editorconfig) {
    files.editorconfig = buildEditorConfig(stacks);
  }
  if (enabledConfigs.dockerignore) {
    files.dockerignore = buildDockerignore(categoryRuleMap);
  }
  return files;
}

function buildGitignore(categoryRuleMap, stacks) {
  const lines = [
    '# GitIgnore Pro',
    `# Generated for: ${stacks.map(id => STACK_DEFINITIONS[id]?.label || id).join(', ') || 'No stack selected'}`,
    '# Review before committing if you intentionally track local environment files.',
    ''
  ];

  categoryRuleMap.forEach((ruleMap, categoryId) => {
    const meta = CATEGORY_DEFINITIONS[categoryId];
    const rules = [...ruleMap.values()];
    if (!rules.length) return;
    lines.push(`# ${meta.label}`);
    rules.forEach(rule => lines.push(rule.pattern));
    lines.push('');
  });

  return lines.join('\n').trim();
}

function buildGitattributes(stacks) {
  const lines = [
    '# GitIgnore Pro',
    '* text=auto eol=lf',
    '*.png binary',
    '*.jpg binary',
    '*.jpeg binary',
    '*.gif binary',
    '*.pdf binary'
  ];

  if (stacks.includes('flutter')) {
    lines.push('*.dart text diff=dart');
  }
  if (stacks.includes('java') || stacks.includes('spring')) {
    lines.push('*.java text diff=java');
  }
  if (stacks.includes('python') || stacks.includes('django')) {
    lines.push('*.py text diff=python');
  }

  return lines.join('\n');
}

function buildEditorConfig(stacks) {
  const lines = [
    '# GitIgnore Pro',
    'root = true',
    '',
    '[*]',
    'charset = utf-8',
    'end_of_line = lf',
    'insert_final_newline = true',
    'indent_style = space',
    'indent_size = 2',
    'trim_trailing_whitespace = true'
  ];

  if (stacks.includes('python') || stacks.includes('django')) {
    lines.push('', '[*.py]', 'indent_size = 4');
  }
  if (stacks.includes('java') || stacks.includes('spring')) {
    lines.push('', '[*.java]', 'indent_size = 4');
  }
  if (stacks.includes('go')) {
    lines.push('', '[*.go]', 'indent_style = tab');
  }

  return lines.join('\n');
}

function buildDockerignore(categoryRuleMap) {
  const lines = [
    '# GitIgnore Pro',
    '.git',
    '.gitignore',
    'Dockerfile*'
  ];

  ['dependencies', 'builds', 'logs', 'env', 'tooling'].forEach(categoryId => {
    const ruleMap = categoryRuleMap.get(categoryId);
    if (!ruleMap) return;
    [...ruleMap.values()].forEach(rule => {
      if (!lines.includes(rule.pattern)) {
        lines.push(rule.pattern);
      }
    });
  });

  return lines.join('\n');
}

function buildCategoryStats(categoryRuleMap) {
  return Object.entries(CATEGORY_DEFINITIONS).map(([id, meta]) => {
    const rules = categoryRuleMap.get(id) ? [...categoryRuleMap.get(id).values()] : [];
    return {
      id,
      label: meta.label,
      description: meta.description,
      count: rules.length,
      rules
    };
  });
}

function buildSuggestions(stacks, enabledConfigs) {
  const suggestions = [];
  if (stacks.includes('node') && !stacks.includes('docker')) {
    suggestions.push({
      title: 'Consider a container baseline',
      body: 'If your team deploys services, enabling .dockerignore can keep image contexts smaller and faster.'
    });
  }
  if (stacks.includes('react') || stacks.includes('nextjs')) {
    suggestions.push({
      title: 'Track lockfiles intentionally',
      body: 'Frontend apps usually benefit from committing one lockfile while still ignoring package caches.'
    });
  }
  if (stacks.includes('python') || stacks.includes('django')) {
    suggestions.push({
      title: 'Separate secrets from defaults',
      body: 'Store committed example env files like .env.example and ignore real local env files.'
    });
  }
  if (!enabledConfigs.editorconfig) {
    suggestions.push({
      title: 'Enable .editorconfig',
      body: 'A small EditorConfig keeps indentation and line endings consistent across the team.'
    });
  }
  return suggestions;
}

function buildWarnings(stacks, customRules) {
  const warnings = [];
  if (stacks.includes('rust')) {
    warnings.push({
      title: 'Cargo.lock strategy',
      body: 'Track Cargo.lock for apps, but review whether you want it ignored for library-style crates.'
    });
  }
  if (customRules.toLowerCase().includes('.env.example')) {
    warnings.push({
      title: 'Possible tracked example file',
      body: 'Double-check whether .env.example should stay committed instead of being ignored.'
    });
  }
  if (!stacks.length) {
    warnings.push({
      title: 'No stacks selected',
      body: 'The generated files will stay generic until you select a language, framework, or preset.'
    });
  }
  return warnings;
}

export function highlightCode(content) {
  return content
    .split('\n')
    .map(line => {
      const safe = escapeHtml(line);
      if (line.startsWith('#')) {
        return `<span class="editor-line-comment">${safe}</span>`;
      }
      if (line.startsWith('[') && line.endsWith(']')) {
        return `<span class="editor-line-header">${safe}</span>`;
      }
      return `<span class="editor-line-rule">${safe || ' '}</span>`;
    })
    .join('\n');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
