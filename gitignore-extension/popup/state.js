export const CATEGORY_DEFINITIONS = {
  dependencies: {
    label: 'Dependencies',
    description: 'Installed packages, vendor folders, and package manager caches.'
  },
  builds: {
    label: 'Build Files',
    description: 'Compiled outputs, generated assets, and release artifacts.'
  },
  logs: {
    label: 'Logs',
    description: 'Debug, crash, and runtime logs that should not enter source control.'
  },
  os: {
    label: 'OS Files',
    description: 'Machine-specific files created by macOS, Windows, or Linux shells.'
  },
  ide: {
    label: 'IDE Configs',
    description: 'Editor caches and local workspace metadata.'
  },
  env: {
    label: 'Environment',
    description: 'Secrets, local env overrides, and sensitive machine-level settings.'
  },
  tooling: {
    label: 'Tooling',
    description: 'Temporary caches and generated artifacts from build tools and linters.'
  },
  containers: {
    label: 'Containers',
    description: 'Container-specific outputs, overrides, and deployment packaging files.'
  }
};

export const ALL_CATEGORY_IDS = Object.keys(CATEGORY_DEFINITIONS);

export const STACK_DEFINITIONS = {
  node: {
    label: 'Node.js',
    type: 'Runtime',
    description: 'npm, pnpm, yarn, and JavaScript server apps.',
    rules: {
      dependencies: [
        { pattern: 'node_modules/', reason: 'Installed dependencies are recreated from package manifests.' },
        { pattern: '.pnpm-store/', reason: 'pnpm keeps a local package cache outside source control.' }
      ],
      logs: [
        { pattern: 'npm-debug.log*', reason: 'npm debug files are generated locally during failures.' },
        { pattern: 'yarn-error.log*', reason: 'Yarn error logs are machine-specific and temporary.' }
      ],
      tooling: [
        { pattern: '.turbo/', reason: 'Turbo caches are regenerated locally.' }
      ],
      env: [
        { pattern: '.env.local', reason: 'Local environment values often contain machine-specific secrets.' }
      ]
    }
  },
  react: {
    label: 'React',
    type: 'Frontend',
    description: 'SPA projects, CRA, and component-driven UIs.',
    rules: {
      builds: [
        { pattern: 'build/', reason: 'Production builds are generated artifacts.' },
        { pattern: 'coverage/', reason: 'Coverage reports should be recreated when needed.' }
      ],
      tooling: [
        { pattern: '.parcel-cache/', reason: 'Parcel cache is environment-specific.' }
      ],
      env: [
        { pattern: '.env.development.local', reason: 'Development overrides are local-only.' }
      ]
    }
  },
  nextjs: {
    label: 'Next.js',
    type: 'Framework',
    description: 'SSR and app-router React applications.',
    rules: {
      builds: [
        { pattern: '.next/', reason: 'Next build output should not be tracked.' },
        { pattern: 'out/', reason: 'Static export folders are generated artifacts.' }
      ],
      containers: [
        { pattern: '.vercel/', reason: 'Vercel deployment metadata is environment-specific.' }
      ],
      tooling: [
        { pattern: '.next/cache/', reason: 'Build cache is safe to regenerate.' }
      ]
    }
  },
  python: {
    label: 'Python',
    type: 'Runtime',
    description: 'Scripts, services, data tooling, and backend apps.',
    rules: {
      dependencies: [
        { pattern: 'venv/', reason: 'Virtual environments should be restored locally.' },
        { pattern: '.venv/', reason: 'Hidden virtual env folders do not belong in source control.' }
      ],
      tooling: [
        { pattern: '__pycache__/', reason: 'Compiled Python caches are generated automatically.' },
        { pattern: '.pytest_cache/', reason: 'pytest cache is ephemeral.' }
      ],
      builds: [
        { pattern: '*.pyc', reason: 'Bytecode files are generated at runtime.' }
      ]
    }
  },
  django: {
    label: 'Django',
    type: 'Framework',
    description: 'Python web apps and APIs with Django.',
    rules: {
      builds: [
        { pattern: 'staticfiles/', reason: 'Collected static assets are deployment outputs.' }
      ],
      env: [
        { pattern: 'db.sqlite3', reason: 'Local SQLite databases should remain local.' }
      ],
      logs: [
        { pattern: '*.log', reason: 'Local Django logs are not useful in Git.' }
      ]
    }
  },
  java: {
    label: 'Java',
    type: 'Runtime',
    description: 'Java repositories, build outputs, and IDE metadata.',
    rules: {
      builds: [
        { pattern: 'target/', reason: 'Maven build output is generated.' },
        { pattern: 'build/', reason: 'Gradle build output should stay local.' }
      ],
      ide: [
        { pattern: '*.iml', reason: 'IDE module files are machine-specific.' }
      ],
      tooling: [
        { pattern: '.gradle/', reason: 'Gradle caches are recreated automatically.' }
      ]
    }
  },
  spring: {
    label: 'Spring Boot',
    type: 'Framework',
    description: 'Java backend services and APIs built with Spring.',
    rules: {
      logs: [
        { pattern: 'spring.log', reason: 'Spring log files are runtime-specific.' }
      ],
      builds: [
        { pattern: '*.jar', reason: 'Packaged jars are distributable outputs, not source.' }
      ]
    }
  },
  php: {
    label: 'PHP',
    type: 'Runtime',
    description: 'PHP applications and composer-managed services.',
    rules: {
      dependencies: [
        { pattern: 'vendor/', reason: 'Composer vendors are restored from composer.lock.' }
      ],
      env: [
        { pattern: '.env', reason: 'Environment secrets should remain local.' }
      ]
    }
  },
  laravel: {
    label: 'Laravel',
    type: 'Framework',
    description: 'Laravel apps with runtime caches and uploads.',
    rules: {
      tooling: [
        { pattern: 'bootstrap/cache/*.php', reason: 'Laravel cache files are generated per environment.' }
      ],
      builds: [
        { pattern: 'storage/*.key', reason: 'App keys should never be committed.' }
      ]
    }
  },
  go: {
    label: 'Go',
    type: 'Runtime',
    description: 'Compiled Go services and CLIs.',
    rules: {
      builds: [
        { pattern: 'bin/', reason: 'Compiled binaries are generated outputs.' },
        { pattern: '*.test', reason: 'Go test binaries are temporary.' }
      ]
    }
  },
  rust: {
    label: 'Rust',
    type: 'Runtime',
    description: 'Cargo-managed Rust packages and CLIs.',
    rules: {
      builds: [
        { pattern: 'target/', reason: 'Cargo build output should not be tracked.' }
      ],
      dependencies: [
        { pattern: 'Cargo.lock', reason: 'Library repos often avoid locking dependencies unless shipping an app.' }
      ]
    }
  },
  docker: {
    label: 'Docker',
    type: 'Tool',
    description: 'Containerized services and image build workflows.',
    rules: {
      containers: [
        { pattern: 'docker-compose.override.yml', reason: 'Override files often contain local-only container settings.' },
        { pattern: '.docker/', reason: 'Local Docker helper data should stay untracked.' }
      ]
    }
  },
  flutter: {
    label: 'Flutter',
    type: 'Framework',
    description: 'Flutter apps and generated mobile build outputs.',
    rules: {
      builds: [
        { pattern: '.dart_tool/', reason: 'Flutter tool state is generated automatically.' },
        { pattern: 'build/', reason: 'Flutter build output should be regenerated.' }
      ],
      tooling: [
        { pattern: '.packages', reason: 'Package resolution file is machine-generated.' }
      ]
    }
  }
};

export const BASE_RULES = {
  os: [
    { pattern: '.DS_Store', reason: 'macOS Finder metadata should never be committed.' },
    { pattern: 'Thumbs.db', reason: 'Windows Explorer thumbnail cache is local-only.' }
  ],
  ide: [
    { pattern: '.idea/', reason: 'JetBrains project settings are user-specific.' },
    { pattern: '.vscode/', reason: 'Local VS Code settings often differ per developer.' }
  ],
  logs: [
    { pattern: '*.log', reason: 'Generic log files are transient and noisy in Git history.' }
  ],
  env: [
    { pattern: '.env.*', reason: 'Environment-specific overrides often contain secrets.' }
  ]
};

export const CONFIG_DEFINITIONS = {
  gitignore: { label: '.gitignore' },
  gitattributes: { label: '.gitattributes' },
  editorconfig: { label: '.editorconfig' },
  dockerignore: { label: '.dockerignore' }
};

export const FILE_META = {
  gitignore: { label: '.gitignore', filename: '.gitignore' },
  gitattributes: { label: '.gitattributes', filename: '.gitattributes' },
  editorconfig: { label: '.editorconfig', filename: '.editorconfig' },
  dockerignore: { label: '.dockerignore', filename: '.dockerignore' }
};

export const PRESET_LIBRARY = [
  {
    id: 'preset-mern',
    name: 'MERN Stack',
    description: 'Node.js + React baseline with Next-ready frontend coverage.',
    stacks: ['node', 'react', 'nextjs'],
    categories: [...ALL_CATEGORY_IDS],
    enabledConfigs: { gitignore: true, gitattributes: true, editorconfig: true, dockerignore: false }
  },
  {
    id: 'preset-spring',
    name: 'Spring Boot API',
    description: 'Backend-heavy Java service with clean build and IDE defaults.',
    stacks: ['java', 'spring'],
    categories: [...ALL_CATEGORY_IDS],
    enabledConfigs: { gitignore: true, gitattributes: true, editorconfig: true, dockerignore: false }
  },
  {
    id: 'preset-django',
    name: 'Django Service',
    description: 'Python + Django backend with runtime cache and local DB safety.',
    stacks: ['python', 'django'],
    categories: [...ALL_CATEGORY_IDS],
    enabledConfigs: { gitignore: true, gitattributes: true, editorconfig: true, dockerignore: false }
  },
  {
    id: 'preset-flutter',
    name: 'Flutter App',
    description: 'Mobile-ready ignore patterns for Flutter and generated tool caches.',
    stacks: ['flutter'],
    categories: [...ALL_CATEGORY_IDS],
    enabledConfigs: { gitignore: true, gitattributes: false, editorconfig: true, dockerignore: false }
  },
  {
    id: 'preset-container',
    name: 'Dockerized Backend',
    description: 'Node.js backend with Docker and related config toggles enabled.',
    stacks: ['node', 'docker'],
    categories: [...ALL_CATEGORY_IDS],
    enabledConfigs: { gitignore: true, gitattributes: true, editorconfig: true, dockerignore: true }
  }
];

export const DEFAULT_STATE = {
  theme: 'light',
  settings: {
    showExplanations: true,
    autoRefresh: true,
    compactPreview: false
  },
  selectedStacks: ['node', 'react'],
  selectedCategories: [...ALL_CATEGORY_IDS],
  enabledConfigs: {
    gitignore: true,
    gitattributes: true,
    editorconfig: true,
    dockerignore: false
  },
  customRules: '',
  scanInput: '',
  detectedFromText: [],
  savedTemplates: [],
  activeFile: 'gitignore'
};
