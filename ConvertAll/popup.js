// Enhanced categories with more units
const categories = {
  Length: {
    m: 1, km: 1000, cm: 0.01, mm: 0.001, μm: 0.000001, nm: 1e-9,
    mi: 1609.34, ft: 0.3048, in: 0.0254, yd: 0.9144, nautical_mile: 1852,
    light_year: 9.461e15, parsec: 3.086e16
  },
  Weight: {
    kg: 1, g: 0.001, mg: 0.000001, μg: 1e-9, t: 1000,
    lb: 0.453592, oz: 0.0283495, stone: 6.35029, 
    carat: 0.0002, grain: 0.0000648
  },
  Volume: {
    l: 1, ml: 0.001, m3: 1000, cm3: 0.001,
    gal: 3.78541, qt: 0.946353, pt: 0.473176, cup: 0.236588,
    fl_oz: 0.0295735, tbsp: 0.0147868, tsp: 0.00492892
  },
  Area: {
    m2: 1, km2: 1000000, cm2: 0.0001, mm2: 0.000001,
    ha: 10000, acre: 4046.86, ft2: 0.092903, in2: 0.00064516,
    mi2: 2589988.11
  },
  Speed: {
    mps: 1, kmh: 0.277778, mph: 0.44704, knot: 0.514444,
    fps: 0.3048, mach: 340.29, c: 299792458
  },
  Temperature: {
    C: 'celsius', F: 'fahrenheit', K: 'kelvin'
  },
  Time: {
    s: 1, ms: 0.001, μs: 0.000001, min: 60, h: 3600,
    d: 86400, week: 604800, month: 2592000, year: 31536000,
    decade: 315360000, century: 3153600000
  },
  Energy: {
    J: 1, kJ: 1000, cal: 4.184, kcal: 4184, Wh: 3600,
    kWh: 3600000, eV: 1.602e-19, BTU: 1055.06
  },
  Power: {
    W: 1, kW: 1000, MW: 1000000, hp: 745.7,
    BTU_h: 0.293071, dBm: 0.001
  },
  Pressure: {
    Pa: 1, kPa: 1000, MPa: 1000000, bar: 100000,
    psi: 6894.76, atm: 101325, torr: 133.322
  },
  Data: {
    B: 1, KB: 1024, MB: 1048576, GB: 1073741824,
    TB: 1099511627776, b: 0.125, Kb: 128, Mb: 131072
  },
  Angle: {
    deg: 1, rad: 57.2958, grad: 0.9, arcmin: 0.0166667, arcsec: 0.000277778
  },
  Frequency: {
    Hz: 1, kHz: 1000, MHz: 1000000, GHz: 1000000000,
    rpm: 0.0166667
  },
  Density: {
    kg_m3: 1, g_cm3: 1000, lb_ft3: 16.0185, lb_gal: 119.826
  },
  Force: {
    N: 1, kN: 1000, lbf: 4.44822, dyn: 0.00001, kgf: 9.80665
  },
  Electricity: {
    V: 1, kV: 1000, mV: 0.001, A: 1, mA: 0.001,
    Ω: 1, kΩ: 1000, MΩ: 1000000, F: 1, μF: 0.000001
  },
  FuelEconomy: {
    kmL: 1, L100km: 100, mpg: 0.425144, mpg_imp: 0.354006
  },
  Cooking: {
    cup: 236.588, tbsp: 14.7868, tsp: 4.92892, pinch: 0.308,
    dash: 0.616, drop: 0.05
  },
  Currency: {
    USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150.5, CNY: 7.19,
    INR: 83.5, CAD: 1.36, AUD: 1.52, CHF: 0.88
  },
  Number: {
    dec: 10, bin: 2, hex: 16, oct: 8
  }
};

// DOM Elements
const elements = {
  category: document.getElementById('category'),
  fromUnit: document.getElementById('fromUnit'),
  toUnit: document.getElementById('toUnit'),
  input: document.getElementById('inputValue'),
  output: document.getElementById('outputValue'),
  copyBtn: document.getElementById('copyBtn'),
  swapBtn: document.getElementById('swapBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettings: document.getElementById('closeSettings'),
  precisionSlider: document.getElementById('precisionSlider'),
  precisionValue: document.getElementById('precisionValue'),
  thousandsSeparator: document.getElementById('thousandsSeparator'),
  autoCopy: document.getElementById('autoCopy'),
  recentGrid: document.getElementById('recentGrid'),
  modeConverter: document.getElementById('modeConverter'),
  modeCalculator: document.getElementById('modeCalculator'),
  converterSection: document.getElementById('converterSection'),
  calculatorSection: document.getElementById('calculatorSection'),
  calcExpression: document.getElementById('calcExpression'),
  calcResult: document.getElementById('calcResult'),
  themeToggle: document.getElementById('themeToggle')
};

// Settings
let settings = {
  precision: 4,
  useThousandsSeparator: true,
  autoCopy: false,
  darkMode: false
};

// Recent conversions
let recentConversions = [];

// =====================================================
// SIMPLE WORKING CALCULATOR
// =====================================================

// Calculator state
let currentInput = '0';
let previousInput = '';
let operation = null;
let shouldResetInput = false;

/**
 * Setup calculator
 */
function setupCalculator() {
  console.log('Setting up calculator...');
  
  // Reset calculator state
  currentInput = '0';
  previousInput = '';
  operation = null;
  shouldResetInput = false;
  
  updateCalculatorDisplay();
  
  // Add event listeners to calculator buttons
  const calcBtns = document.querySelectorAll('.calc-btn');
  calcBtns.forEach(btn => {
    // Remove existing listeners to prevent duplicates
    btn.removeEventListener('click', handleCalculatorClick);
    btn.addEventListener('click', handleCalculatorClick);
  });
}

/**
 * Handle calculator button clicks
 */
function handleCalculatorClick(e) {
  const btn = e.target;
  const action = btn.dataset.action;
  const value = btn.dataset.value;
  
  if (action) {
    handleCalculatorAction(action);
  } else if (value !== undefined) {
    handleNumberInput(value);
  }
}

/**
 * Handle number input
 */
function handleNumberInput(num) {
  if (shouldResetInput) {
    currentInput = num;
    shouldResetInput = false;
  } else {
    if (num === '.' && currentInput.includes('.')) {
      return; // Prevent multiple decimals
    }
    if (currentInput === '0' && num !== '.') {
      currentInput = num;
    } else {
      currentInput += num;
    }
  }
  updateCalculatorDisplay();
}

/**
 * Handle calculator actions
 */
function handleCalculatorAction(action) {
  switch(action) {
    case 'clear':
      currentInput = '0';
      previousInput = '';
      operation = null;
      shouldResetInput = false;
      break;
      
    case 'backspace':
      if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
      } else {
        currentInput = '0';
      }
      break;
      
    case 'percent':
      currentInput = (parseFloat(currentInput) / 100).toString();
      break;
      
    case 'add':
    case 'subtract':
    case 'multiply':
    case 'divide':
      handleOperator(action);
      break;
      
    case 'sqrt':
      currentInput = Math.sqrt(parseFloat(currentInput)).toString();
      shouldResetInput = true;
      break;
      
    case 'square':
      currentInput = Math.pow(parseFloat(currentInput), 2).toString();
      shouldResetInput = true;
      break;
      
    case 'sin':
      currentInput = Math.sin(parseFloat(currentInput)).toString();
      shouldResetInput = true;
      break;
      
    case 'cos':
      currentInput = Math.cos(parseFloat(currentInput)).toString();
      shouldResetInput = true;
      break;
      
    case 'tan':
      currentInput = Math.tan(parseFloat(currentInput)).toString();
      shouldResetInput = true;
      break;
      
    case 'log':
      currentInput = Math.log10(parseFloat(currentInput)).toString();
      shouldResetInput = true;
      break;
      
    case 'pi':
      currentInput = Math.PI.toString();
      break;
      
    case 'e':
      currentInput = Math.E.toString();
      break;
      
    case 'power':
      // Store current as base and prepare for exponent
      previousInput = currentInput;
      operation = 'power';
      shouldResetInput = true;
      break;
      
    case 'fact':
      currentInput = factorial(parseFloat(currentInput)).toString();
      shouldResetInput = true;
      break;
      
    case 'recip':
      currentInput = (1 / parseFloat(currentInput)).toString();
      shouldResetInput = true;
      break;
      
    case 'equals':
      calculate();
      operation = null;
      shouldResetInput = true;
      break;
  }
  
  updateCalculatorDisplay();
}

/**
 * Handle operator input
 */
function handleOperator(op) {
  if (operation !== null && !shouldResetInput) {
    calculate();
  }
  
  previousInput = currentInput;
  operation = op;
  shouldResetInput = true;
}

/**
 * Perform calculation
 */
function calculate() {
  if (operation === null || previousInput === '') return;
  
  const prev = parseFloat(previousInput);
  const current = parseFloat(currentInput);
  
  if (isNaN(prev) || isNaN(current)) {
    currentInput = 'Error';
    return;
  }
  
  let result;
  
  switch(operation) {
    case 'add':
      result = prev + current;
      break;
    case 'subtract':
      result = prev - current;
      break;
    case 'multiply':
      result = prev * current;
      break;
    case 'divide':
      if (current === 0) {
        currentInput = 'Error';
        return;
      }
      result = prev / current;
      break;
    case 'power':
      result = Math.pow(prev, current);
      break;
    default:
      return;
  }
  
  currentInput = result.toString();
}

/**
 * Calculate factorial
 */
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Update calculator display
 */
function updateCalculatorDisplay() {
  if (elements.calcExpression) {
    // Show the expression being built
    if (operation && previousInput && !shouldResetInput) {
      elements.calcExpression.textContent = `${previousInput} ${getOperatorSymbol(operation)} ${currentInput}`;
    } else if (operation && previousInput) {
      elements.calcExpression.textContent = `${previousInput} ${getOperatorSymbol(operation)}`;
    } else {
      elements.calcExpression.textContent = currentInput;
    }
  }
  
  if (elements.calcResult) {
    elements.calcResult.textContent = currentInput;
  }
}

/**
 * Get operator symbol for display
 */
function getOperatorSymbol(op) {
  const symbols = {
    'add': '+',
    'subtract': '-',
    'multiply': '×',
    'divide': '÷',
    'power': '^'
  };
  return symbols[op] || op;
}

// =====================================================
// THEME MANAGEMENT
// =====================================================

/**
 * Toggle theme
 */
function toggleTheme() {
  settings.darkMode = !settings.darkMode;
  applyTheme();
  saveSettings();
}

/**
 * Apply theme to document
 */
function applyTheme() {
  if (!elements.themeToggle) return;
  
  if (settings.darkMode) {
    document.body.classList.add('dark-mode');
    elements.themeToggle.textContent = '☀️';
    elements.themeToggle.title = 'Switch to Light Mode';
  } else {
    document.body.classList.remove('dark-mode');
    elements.themeToggle.textContent = '🌙';
    elements.themeToggle.title = 'Switch to Dark Mode';
  }
}

// =====================================================
// CONVERTER FUNCTIONS
// =====================================================

/**
 * Initialize the application
 */
async function init() {
  console.log('Initializing ConvertAll...');
  await loadSettings();
  await loadRecent();
  populateCategories();
  setupEventListeners();
  loadUnits();
  setupCalculator();
  applyTheme();
  
  // Set default mode to converter
  toggleMode('converter');
}

/**
 * Load settings from Chrome storage
 */
async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get({
      precision: 4,
      useThousandsSeparator: true,
      autoCopy: false,
      darkMode: false
    });
    settings = stored;
    if (elements.precisionSlider) {
      elements.precisionSlider.value = settings.precision;
    }
    if (elements.precisionValue) {
      elements.precisionValue.textContent = settings.precision;
    }
    if (elements.thousandsSeparator) {
      elements.thousandsSeparator.checked = settings.useThousandsSeparator;
    }
    if (elements.autoCopy) {
      elements.autoCopy.checked = settings.autoCopy;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Save settings to Chrome storage
 */
async function saveSettings() {
  try {
    if (elements.precisionSlider) {
      settings.precision = parseInt(elements.precisionSlider.value);
    }
    if (elements.thousandsSeparator) {
      settings.useThousandsSeparator = elements.thousandsSeparator.checked;
    }
    if (elements.autoCopy) {
      settings.autoCopy = elements.autoCopy.checked;
    }
    await chrome.storage.sync.set(settings);
    convert();
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

/**
 * Load recent conversions from storage
 */
async function loadRecent() {
  try {
    const stored = await chrome.storage.local.get({ recent: [] });
    recentConversions = stored.recent.slice(0, 6);
    updateRecentUI();
  } catch (error) {
    console.error('Error loading recent:', error);
  }
}

/**
 * Save recent conversion
 */
async function saveRecent(conversion) {
  try {
    recentConversions.unshift(conversion);
    recentConversions = recentConversions.slice(0, 6);
    await chrome.storage.local.set({ recent: recentConversions });
    updateRecentUI();
  } catch (error) {
    console.error('Error saving recent:', error);
  }
}

/**
 * Update recent conversions UI
 */
function updateRecentUI() {
  if (!elements.recentGrid) return;
  
  if (recentConversions.length === 0) {
    elements.recentGrid.textContent = '';

    const empty = document.createElement('div');
    empty.className = 'recent-item';
    empty.style.textAlign = 'center';
    empty.style.color = '#6B7280';
    empty.textContent = 'No recent conversions';

    elements.recentGrid.appendChild(empty);
    return; // ✅ VERY IMPORTANT
  }

elements.recentGrid.textContent = '';

  recentConversions.forEach(conv => {
    const item = document.createElement('div');
    item.className = 'recent-item';

    item.dataset.category = conv.category;
    item.dataset.from = conv.from;
    item.dataset.to = conv.to;
    item.dataset.value = conv.value;

    const fromDiv = document.createElement('div');
    fromDiv.className = 'from';
    fromDiv.textContent = `${conv.value} ${conv.fromUnit}`;

    const toDiv = document.createElement('div');
    toDiv.className = 'to';
    toDiv.textContent = `= ${conv.result} ${conv.toUnit}`;

    item.appendChild(fromDiv);
    item.appendChild(toDiv);

    item.addEventListener('click', () => {
      elements.category.value = conv.category;
      loadUnits();
      setTimeout(() => {
        elements.fromUnit.value = conv.from;
        elements.toUnit.value = conv.to;
        elements.input.value = conv.value;
        convert();
      }, 100);
    });

    elements.recentGrid.appendChild(item);
  });
    
  }

/**
 * Populate category dropdown
 */
function populateCategories() {
  if (!elements.category) return;
  elements.category.innerHTML = Object.keys(categories)
    .map(cat => `<option value="${cat}">${cat}</option>`)
    .join('');
}

/**
 * Load units for selected category
 */
function loadUnits() {
  if (!elements.category || !elements.fromUnit || !elements.toUnit) return;
  
  const catName = elements.category.value;
  const units = Object.keys(categories[catName]);
  const options = units.map(u => `<option value="${u}">${formatUnitName(u)}</option>`).join('');

  elements.fromUnit.innerHTML = options;
  elements.toUnit.innerHTML = options;

  if (units.length > 1) {
    elements.toUnit.value = units[1];
  }

  convert();
}

/**
 * Format unit name for display
 */
function formatUnitName(unit) {
  const names = {
    m: 'Meter', km: 'Kilometer', cm: 'Centimeter', mm: 'Millimeter',
    μm: 'Micrometer', nm: 'Nanometer', mi: 'Mile', ft: 'Foot',
    in: 'Inch', yd: 'Yard', nautical_mile: 'Nautical Mile',
    light_year: 'Light Year', parsec: 'Parsec',
    kg: 'Kilogram', g: 'Gram', mg: 'Milligram', μg: 'Microgram',
    t: 'Metric Ton', lb: 'Pound', oz: 'Ounce', stone: 'Stone',
    carat: 'Carat', grain: 'Grain',
    l: 'Liter', ml: 'Milliliter', m3: 'Cubic Meter', cm3: 'Cubic cm',
    gal: 'Gallon', qt: 'Quart', pt: 'Pint', cup: 'Cup',
    fl_oz: 'Fluid Ounce', tbsp: 'Tablespoon', tsp: 'Teaspoon',
    m2: 'Square Meter', km2: 'Square km', ha: 'Hectare',
    acre: 'Acre', ft2: 'Square Foot', in2: 'Square Inch',
    mps: 'Meter/sec', kmh: 'km/h', mph: 'mph', knot: 'Knot',
    fps: 'ft/sec', mach: 'Mach', c: 'Light Speed',
    C: 'Celsius', F: 'Fahrenheit', K: 'Kelvin',
    s: 'Second', ms: 'Millisecond', μs: 'Microsecond',
    min: 'Minute', h: 'Hour', d: 'Day', week: 'Week',
    month: 'Month', year: 'Year', decade: 'Decade', century: 'Century',
    J: 'Joule', kJ: 'Kilojoule', cal: 'Calorie', kcal: 'Kilocalorie',
    Wh: 'Watt-hour', kWh: 'kWh', eV: 'Electronvolt', BTU: 'BTU',
    W: 'Watt', kW: 'Kilowatt', MW: 'Megawatt', hp: 'Horsepower',
    BTU_h: 'BTU/hour', dBm: 'dBm',
    Pa: 'Pascal', kPa: 'kPa', MPa: 'MPa', bar: 'Bar',
    psi: 'psi', atm: 'Atmosphere', torr: 'Torr',
    B: 'Byte', KB: 'Kilobyte', MB: 'Megabyte', GB: 'Gigabyte',
    TB: 'Terabyte', b: 'Bit', Kb: 'Kilobit', Mb: 'Megabit',
    deg: 'Degree', rad: 'Radian', grad: 'Gradian',
    arcmin: 'Arcminute', arcsec: 'Arcsecond',
    Hz: 'Hertz', kHz: 'kHz', MHz: 'MHz', GHz: 'GHz',
    rpm: 'RPM',
    kg_m3: 'kg/m³', g_cm3: 'g/cm³', lb_ft3: 'lb/ft³', lb_gal: 'lb/gal',
    N: 'Newton', kN: 'kN', lbf: 'lbf', dyn: 'Dyne', kgf: 'kgf',
    V: 'Volt', kV: 'kV', mV: 'mV', A: 'Ampere', mA: 'mA',
    Ω: 'Ohm', kΩ: 'kΩ', MΩ: 'MΩ', F: 'Farad', μF: 'μF',
    kmL: 'km/L', L100km: 'L/100km', mpg: 'MPG (US)', mpg_imp: 'MPG (UK)',
    cup: 'Cup', tbsp: 'Tablespoon', tsp: 'Teaspoon',
    pinch: 'Pinch', dash: 'Dash', drop: 'Drop',
    USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound',
    JPY: 'Japanese Yen', CNY: 'Chinese Yuan', INR: 'Indian Rupee',
    CAD: 'Canadian Dollar', AUD: 'Australian Dollar', CHF: 'Swiss Franc',
    dec: 'Decimal', bin: 'Binary', hex: 'Hexadecimal', oct: 'Octal'
  };
  return names[unit] || unit;
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return '0';
  
  if (!settings.useThousandsSeparator) return num.toString();
  
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * Handle temperature conversion
 */
function convertTemperature(value, fromUnit, toUnit) {
  if (isNaN(value)) return NaN;
  
  let celsius;
  if (fromUnit === 'C') celsius = value;
  else if (fromUnit === 'F') celsius = (value - 32) * 5/9;
  else if (fromUnit === 'K') celsius = value - 273.15;
  else return NaN;
  
  if (toUnit === 'C') return celsius;
  if (toUnit === 'F') return celsius * 9/5 + 32;
  if (toUnit === 'K') return celsius + 273.15;
  return NaN;
}

/**
 * Handle number base conversion
 */
function convertNumber(value, fromBase, toBase) {
  try {
    const bases = { dec: 10, bin: 2, hex: 16, oct: 8 };
    const fromB = bases[fromBase];
    const toB = bases[toBase];
    
    let decimal;
    if (fromBase === 'hex' && typeof value === 'string' && value.startsWith('0x')) {
      decimal = parseInt(value, 16);
    } else {
      decimal = parseInt(value, fromB);
    }
    
    if (isNaN(decimal)) return 'Invalid';
    
    return decimal.toString(toB).toUpperCase();
  } catch {
    return 'Error';
  }
}

/**
 * Convert units
 */
function convert() {
  if (!elements.input || !elements.output || !elements.category || !elements.fromUnit || !elements.toUnit) return;
  
  const val = elements.input.value.trim();
  const catName = elements.category.value;
  const fromUnit = elements.fromUnit.value;
  const toUnit = elements.toUnit.value;
  
  if (val === '') {
    elements.output.value = '';
    return;
  }
  
  let result;
  
  try {
    if (catName === 'Temperature') {
      result = convertTemperature(parseFloat(val), fromUnit, toUnit);
      if (isNaN(result)) {
        elements.output.value = 'Invalid Input';
        return;
      }
    } else if (catName === 'Number') {
      result = convertNumber(val, fromUnit, toUnit);
      elements.output.value = result;
      return;
    } else {
      const numVal = parseFloat(val);
      if (isNaN(numVal)) {
        elements.output.value = 'Invalid Input';
        return;
      }
      
      const baseValue = numVal * categories[catName][fromUnit];
      result = baseValue / categories[catName][toUnit];
      
      // Round to precision
      const factor = Math.pow(10, settings.precision);
      result = Math.round(result * factor) / factor;
    }
    
    const formattedResult = formatNumber(result);
    elements.output.value = formattedResult;
    
    // Save to recent
    if (val && !isNaN(result)) {
      saveRecent({
        from: fromUnit,
        to: toUnit,
        fromUnit: formatUnitName(fromUnit),
        toUnit: formatUnitName(toUnit),
        value: val,
        result: formattedResult,
        category: catName
      });
    }
    
    // Auto-copy if enabled
    if (settings.autoCopy && formattedResult) {
      copyToClipboard(formattedResult, false);
    }
  } catch (error) {
    console.error('Conversion error:', error);
    elements.output.value = 'Error';
  }
}

/**
 * Swap units
 */
function swapUnits() {
  if (!elements.fromUnit || !elements.toUnit) return;
  
  const temp = elements.fromUnit.value;
  elements.fromUnit.value = elements.toUnit.value;
  elements.toUnit.value = temp;
  convert();
}

/**
 * Copy to clipboard
 */
async function copyToClipboard(text = elements.output.value, showFeedback = true) {
  if (!text) return;
  
  try {
    await navigator.clipboard.writeText(text);
    if (showFeedback && elements.copyBtn) {
      const originalText = elements.copyBtn.innerHTML;
      elements.copyBtn.innerHTML = '<span>✓</span> Copied!';
      setTimeout(() => {
        elements.copyBtn.innerHTML = originalText;
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}

/**
 * Toggle mode
 */
function toggleMode(mode) {
  console.log('Toggling mode:', mode);
  
  if (!elements.modeConverter || !elements.modeCalculator || 
      !elements.converterSection || !elements.calculatorSection) {
    console.error('Mode elements not found');
    return;
  }
  
  if (mode === 'converter') {
    elements.modeConverter.classList.add('active');
    elements.modeCalculator.classList.remove('active');
    elements.converterSection.classList.remove('hidden');
    elements.calculatorSection.classList.add('hidden');
  } else {
    elements.modeConverter.classList.remove('active');
    elements.modeCalculator.classList.add('active');
    elements.converterSection.classList.add('hidden');
    elements.calculatorSection.classList.remove('hidden');
    // Reset calculator when switching to it
    setupCalculator();
  }
}

/**
 * Toggle settings modal
 */
function toggleSettings() {
  if (elements.settingsModal) {
    elements.settingsModal.classList.toggle('hidden');
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Category and unit changes
  if (elements.category) {
    elements.category.addEventListener('change', loadUnits);
  }
  
  if (elements.fromUnit) {
    elements.fromUnit.addEventListener('change', convert);
  }
  
  if (elements.toUnit) {
    elements.toUnit.addEventListener('change', convert);
  }
  
  // Input changes
  if (elements.input) {
    elements.input.addEventListener('input', convert);
  }
  
  // Button events
  if (elements.copyBtn) {
    elements.copyBtn.addEventListener('click', () => copyToClipboard());
  }
  
  if (elements.swapBtn) {
    elements.swapBtn.addEventListener('click', swapUnits);
  }
  
  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', toggleSettings);
  }
  
  if (elements.closeSettings) {
    elements.closeSettings.addEventListener('click', toggleSettings);
  }
  
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Mode toggles
  if (elements.modeConverter) {
    elements.modeConverter.addEventListener('click', () => {
      console.log('Converter mode clicked');
      toggleMode('converter');
    });
  }
  
  if (elements.modeCalculator) {
    elements.modeCalculator.addEventListener('click', () => {
      console.log('Calculator mode clicked');
      toggleMode('calculator');
    });
  }
  
  // Settings changes
  if (elements.precisionSlider) {
    elements.precisionSlider.addEventListener('input', (e) => {
      if (elements.precisionValue) {
        elements.precisionValue.textContent = e.target.value;
      }
      saveSettings();
    });
  }
  
  if (elements.thousandsSeparator) {
    elements.thousandsSeparator.addEventListener('change', saveSettings);
  }
  
  if (elements.autoCopy) {
    elements.autoCopy.addEventListener('change', saveSettings);
  }
  
  // Close modal on outside click
  if (elements.settingsModal) {
    elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === elements.settingsModal) {
        toggleSettings();
      }
    });
  }
  
  // Add keyboard support for calculator
  document.addEventListener('keydown', (e) => {
    // Only handle if calculator is visible
    if (elements.calculatorSection && !elements.calculatorSection.classList.contains('hidden')) {
      const key = e.key;
      
      if (key >= '0' && key <= '9') {
        handleNumberInput(key);
      } else if (key === '.') {
        handleNumberInput('.');
      } else if (key === '+') {
        e.preventDefault();
        handleOperator('add');
      } else if (key === '-') {
        e.preventDefault();
        handleOperator('subtract');
      } else if (key === '*') {
        e.preventDefault();
        handleOperator('multiply');
      } else if (key === '/') {
        e.preventDefault();
        handleOperator('divide');
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculate();
        operation = null;
        shouldResetInput = true;
        updateCalculatorDisplay();
      } else if (key === 'Escape') {
        handleCalculatorAction('clear');
      } else if (key === 'Backspace') {
        e.preventDefault();
        handleCalculatorAction('backspace');
      }
    }
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);