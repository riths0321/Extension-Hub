document.addEventListener("DOMContentLoaded", () => {
  const heightInput = document.getElementById("height");
  const weightInput = document.getElementById("weight");
  const weightLbInput = document.getElementById("weight-lb");
  const feetInput = document.getElementById("feet");
  const inchesInput = document.getElementById("inches");
  const metricRows = document.querySelectorAll(".metric-only");
  const imperialRows = document.querySelectorAll(".imperial-only");
  const metricTab = document.getElementById("metric-tab");
  const imperialTab = document.getElementById("imperial-tab");
  const heightLabel = document.getElementById("height-label");
  const heightLabelImperial = document.getElementById("height-label-imperial");
  const weightLabel = document.getElementById("weight-label");
  const weightLabelImperial = document.getElementById("weight-label-imperial");
  const themeToggle = document.getElementById("theme-toggle");

  const calculateBtn = document.getElementById("calculate-btn");
  const errorMessage = document.getElementById("error-message");

  const results = document.getElementById("results");
  const bmiValue = document.getElementById("bmi-value");
  const bmiCategory = document.getElementById("bmi-category");
  const idealValue = document.getElementById("ideal-value");
  const barFill = document.getElementById("bar-fill");
  const insightText = document.getElementById("insight-text");

  let unitSystem = localStorage.getItem("bmiUnitSystem") || "metric";
  const savedTheme = localStorage.getItem("bmiTheme") || "light";
  setTheme(savedTheme);

  metricTab.addEventListener("click", () => setUnitSystem("metric"));
  imperialTab.addEventListener("click", () => setUnitSystem("imperial"));
  setUnitSystem(unitSystem);
  themeToggle.addEventListener("click", toggleTheme);

  calculateBtn.addEventListener("click", calculateBMI);

  function setUnitSystem(system) {
    unitSystem = system;
    const isMetric = system === "metric";

    metricRows.forEach((row) => row.classList.toggle("hidden", !isMetric));
    imperialRows.forEach((row) => row.classList.toggle("hidden", isMetric));

    metricTab.classList.toggle("active", isMetric);
    imperialTab.classList.toggle("active", !isMetric);
    metricTab.setAttribute("aria-selected", String(isMetric));
    imperialTab.setAttribute("aria-selected", String(!isMetric));
    localStorage.setItem("bmiUnitSystem", system);

    heightLabel.textContent = "Height (cm)";
    weightLabel.textContent = "Weight (kg)";
    heightLabelImperial.textContent = "Height (ft)";
    weightLabelImperial.textContent = "Weight (lbs)";

    if (isMetric) {
      feetInput.value = "";
      inchesInput.value = "";
      weightLbInput.value = "";
    } else {
      heightInput.value = "";
      weightInput.value = "";
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  }

  function setTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark", isDark);
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("bmiTheme", theme);
  }

  function calculateBMI() {
    let heightCm;
    let weightKg;

    if (unitSystem === "metric") {
      heightCm = parseFloat(heightInput.value);
      const weightRaw = parseFloat(weightInput.value);
      weightKg = weightRaw;
    } else {
      const feet = parseFloat(feetInput.value);
      const inches = parseFloat(inchesInput.value) || 0;
      heightCm = (feet * 12 + inches) * 2.54;
      const weightRaw = parseFloat(weightLbInput.value);
      weightKg = weightRaw * 0.453592;
    }

    errorMessage.classList.add("hidden");

    if (!heightCm || heightCm < 50 || heightCm > 250) {
      return showError("Height must be between 50 cm and 250 cm.");
    }

    if (!weightKg || weightKg < 3 || weightKg > 300) {
      return showError("Weight must be between 3 kg and 300 kg.");
    }

    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    const bmiRounded = bmi.toFixed(1);

    const category = getCategory(bmi);

    bmiValue.textContent = bmiRounded;
    bmiCategory.textContent = category;

    updateSlider(bmi);
    updateBadge(category);
    updateInsight(category);

    const minWeight = (18.5 * heightM * heightM).toFixed(1);
    const maxWeight = (24.9 * heightM * heightM).toFixed(1);
    idealValue.textContent = `${minWeight} Kg - ${maxWeight} Kg`;

    results.classList.remove("hidden");
  }

  function getCategory(bmi) {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
  }

  function updateSlider(bmi) {
    const min = 12;
    const max = 40;
    const clamped = Math.min(Math.max(bmi, min), max);
    const percent = ((clamped - min) / (max - min)) * 100;
    barFill.style.transition = "none";
    barFill.style.width = "0%";
    requestAnimationFrame(() => {
      barFill.style.transition = "width 0.6s ease";
      barFill.style.width = `${percent}%`;
    });
  }

  function updateBadge(category) {
    const map = {
      Underweight: "#0EA5E9",
      Normal: "#16A34A",
      Overweight: "#F59E0B",
      Obese: "#EA580C"
    };

    bmiCategory.style.background = map[category] || "#16A34A";
  }

  function updateInsight(category) {
    const insights = {
      Underweight: "Focus on nutrient-dense meals, add protein, and include gentle strength training.",
      Normal: "Maintain your routine with balanced meals, hydration, and regular activity.",
      Overweight: "Aim for consistent movement and mindful portions; small daily changes help most.",
      Obese: "Consider a guided plan with a healthcare professional for safe, steady progress."
    };

    insightText.textContent = insights[category] || "Continue monitoring your health with regular check-ups.";
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
  }
});
