const strings = {
  en: {
    pageTitle: "Artemis II Mission Overview",
    pageDescription:
      "This page presents Artemis II mission data generated from Databricks.",
    loading: "Loading latest mission data…",
    loadError: "Unable to load the latest mission data right now.",
    summaryHeading: "Mission summary",
    metadataHeading: "Mission metadata",
    analyticsHeading: "Trajectory analytics",
    aboutHeading: "About this demo",
    aboutText:
      "This prototype shows how Databricks can be used in FSDH to ingest raw trajectory data, transform it into structured tables, and publish web-ready artifacts for GitHub Pages.",
    latestTimestamp: "Latest Orion timestamp",
    latestSpeed: "Latest speed (km/h)",
    stateVectors: "State vector count",
    missionDuration: "Mission duration (hours)",
    objectName: "Object name",
    objectId: "Object ID",
    centerName: "Center name",
    referenceFrame: "Reference frame",
    timeSystem: "Time system",
    startTime: "Start time",
    stopTime: "Stop time",
    speedDescription: "Orion speed over mission elapsed time.",
    distanceDescription: "Orion distance from origin over mission elapsed time.",
    speedAria: "Chart of Orion speed over mission elapsed time",
    distanceAria: "Chart of Orion distance from origin over mission elapsed time",
    siteGenerated: "Site generated",
    axisMissionElapsedHours: "Mission elapsed hours",
    axisSpeedKilometresPerHour: "Speed (km/h)",
    axisDistanceFromOriginKilometres: "Distance from origin (km)",
    seriesSpeed: "Speed",
    seriesDistance: "Distance"
  },
  fr: {
    pageTitle: "Aperçu de la mission Artemis II",
    pageDescription:
      "Cette page présente les données de mission Artemis II générées à partir de Databricks.",
    loading: "Chargement des données de mission les plus récentes…",
    loadError:
      "Impossible de charger les données de mission les plus récentes pour le moment.",
    summaryHeading: "Résumé de la mission",
    metadataHeading: "Métadonnées de la mission",
    analyticsHeading: "Analyses de trajectoire",
    aboutHeading: "À propos de cette démonstration",
    aboutText:
      "Ce prototype montre comment Databricks peut être utilisé dans le FSDH pour ingérer des données de trajectoire brutes, les transformer en tables structurées et publier des artefacts prêts pour le Web dans GitHub Pages.",
    latestTimestamp: "Horodatage Orion le plus récent",
    latestSpeed: "Vitesse la plus récente (km/h)",
    stateVectors: "Nombre de vecteurs d’état",
    missionDuration: "Durée de la mission (heures)",
    objectName: "Nom de l’objet",
    objectId: "ID de l’objet",
    centerName: "Nom du centre",
    referenceFrame: "Référentiel",
    timeSystem: "Système de temps",
    startTime: "Heure de début",
    stopTime: "Heure de fin",
    speedDescription:
      "Vitesse d’Orion selon le temps écoulé depuis le début de la mission.",
    distanceDescription:
      "Distance d’Orion depuis l’origine selon le temps écoulé depuis le début de la mission.",
    speedAria:
      "Graphique de la vitesse d’Orion selon le temps écoulé depuis le début de la mission",
    distanceAria:
      "Graphique de la distance d’Orion depuis l’origine selon le temps écoulé depuis le début de la mission",
    siteGenerated: "Site généré",
    axisMissionElapsedHours: "Heures écoulées depuis le début de la mission",
    axisSpeedKilometresPerHour: "Vitesse (km/h)",
    axisDistanceFromOriginKilometres: "Distance depuis l’origine (km)",
    seriesSpeed: "Vitesse",
    seriesDistance: "Distance"
  }
};

let speedChartInstance = null;
let distanceChartInstance = null;

function getLang() {
  const langParam = new URLSearchParams(window.location.search).get("lang");
  return langParam === "fr" ? "fr" : "en";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

function formatNumber(value, fractionDigits = 2, lang = "en") {
  return new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
}

function formatInteger(value, lang = "en") {
  return new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatDateForPage(value, lang = "en") {
  if (!value) {
    return "--";
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const dt = new Date(normalized);

  if (Number.isNaN(dt.getTime())) {
    return value;
  }

  return (
    new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "UTC"
    }).format(dt) + " UTC"
  );
}

async function loadMissionData() {
  const response = await fetch("./data/mission-data.json", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load mission-data.json: ${response.status}`);
  }

  return response.json();
}

function applyStaticText(lang) {
  const t = strings[lang];
  document.documentElement.lang = lang;

  setText("page-title", t.pageTitle);
  setText("page-description", t.pageDescription);
  setText("loading-state", t.loading);
  setText("summary-heading", t.summaryHeading);
  setText("metadata-heading", t.metadataHeading);
  setText("analytics-heading", t.analyticsHeading);
  setText("about-heading", t.aboutHeading);
  setText("about-text", t.aboutText);

  setText("label-latest-timestamp", t.latestTimestamp);
  setText("label-latest-speed", t.latestSpeed);
  setText("label-state-vectors", t.stateVectors);
  setText("label-mission-duration", t.missionDuration);

  setText("meta-object-name-label", t.objectName);
  setText("meta-object-id-label", t.objectId);
  setText("meta-center-name-label", t.centerName);
  setText("meta-reference-frame-label", t.referenceFrame);
  setText("meta-time-system-label", t.timeSystem);
  setText("meta-start-time-label", t.startTime);
  setText("meta-stop-time-label", t.stopTime);

  setText("speed-chart-description", t.speedDescription);
  setText("distance-chart-description", t.distanceDescription);

  const speedCanvas = document.getElementById("speed-chart");
  const distanceCanvas = document.getElementById("distance-chart");

  if (speedCanvas) {
    speedCanvas.setAttribute("aria-label", t.speedAria);
  }

  if (distanceCanvas) {
    distanceCanvas.setAttribute("aria-label", t.distanceAria);
  }
}

function buildAxisLabel(labelKey, lang) {
  const t = strings[lang];

  if (labelKey === "missionElapsedHours") {
    return t.axisMissionElapsedHours;
  }

  if (labelKey === "speedKilometresPerHour") {
    return t.axisSpeedKilometresPerHour;
  }

  if (labelKey === "distanceFromOriginKilometres") {
    return t.axisDistanceFromOriginKilometres;
  }

  return labelKey || "";
}

function destroyExistingCharts() {
  if (speedChartInstance) {
    speedChartInstance.destroy();
    speedChartInstance = null;
  }

  if (distanceChartInstance) {
    distanceChartInstance.destroy();
    distanceChartInstance = null;
  }
}

function createLineChart({
  canvasId,
  points,
  datasetLabel,
  xAxisLabel,
  yAxisLabel,
  lang
}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !Array.isArray(points) || points.length === 0) {
    return null;
  }

  const ctx = canvas.getContext("2d");

  return new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: datasetLabel,
          data: points.map((point) => ({
            x: point.x,
            y: point.y,
            epoch_utc: point.epoch_utc
          })),
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.25
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 700
      },
      interaction: {
        mode: "nearest",
        intersect: false
      },
      plugins: {
        legend: {
          display: true
        },
        tooltip: {
          callbacks: {
            title(items) {
              if (!items || items.length === 0) {
                return "";
              }

              const xValue = items[0].raw.x;
              return `${xAxisLabel}: ${formatNumber(xValue, 2, lang)}`;
            },
            label(context) {
              const point = context.raw;
              const lines = [
                `${datasetLabel}: ${formatNumber(point.y, 2, lang)}`
              ];

              if (point.epoch_utc) {
                lines.push(`${formatDateForPage(point.epoch_utc, lang)}`);
              }

              return lines;
            }
          }
        }
      },
      scales: {
        x: {
          type: "linear",
          title: {
            display: true,
            text: xAxisLabel
          },
          ticks: {
            callback(value) {
              return formatNumber(value, 0, lang);
            }
          }
        },
        y: {
          title: {
            display: true,
            text: yAxisLabel
          },
          ticks: {
            callback(value) {
              return formatNumber(value, 0, lang);
            }
          }
        }
      }
    }
  });
}

function renderCharts(data, lang) {
  destroyExistingCharts();

  const speedPoints = data?.charts?.speed?.points || [];
  const distancePoints = data?.charts?.distance?.points || [];

  speedChartInstance = createLineChart({
    canvasId: "speed-chart",
    points: speedPoints,
    datasetLabel: strings[lang].seriesSpeed,
    xAxisLabel: buildAxisLabel(data?.charts?.speed?.x_label_key, lang),
    yAxisLabel: buildAxisLabel(data?.charts?.speed?.y_label_key, lang),
    lang
  });

  distanceChartInstance = createLineChart({
    canvasId: "distance-chart",
    points: distancePoints,
    datasetLabel: strings[lang].seriesDistance,
    xAxisLabel: buildAxisLabel(data?.charts?.distance?.x_label_key, lang),
    yAxisLabel: buildAxisLabel(data?.charts?.distance?.y_label_key, lang),
    lang
  });
}

function applyDynamicData(data, lang) {
  setText(
    "metric-latest-timestamp",
    formatDateForPage(data.mission.latest_epoch_utc, lang)
  );
  setText(
    "metric-latest-speed",
    formatNumber(data.mission.latest_speed_km_h, 1, lang)
  );
  setText(
    "metric-state-vectors",
    formatInteger(data.mission.state_vector_count, lang)
  );
  setText(
    "metric-mission-duration",
    formatNumber(data.mission.mission_duration_hours, 2, lang)
  );

  setText("meta-object-name", data.metadata.object_name || "--");
  setText("meta-object-id", data.metadata.object_id || "--");
  setText("meta-center-name", data.metadata.center_name || "--");
  setText("meta-reference-frame", data.metadata.reference_frame || "--");
  setText("meta-time-system", data.metadata.time_system || "--");
  setText("meta-start-time", formatDateForPage(data.metadata.start_time, lang));
  setText("meta-stop-time", formatDateForPage(data.metadata.stop_time, lang));

  const generatedAt = formatDateForPage(data.generated_at_utc, lang);
  setText("site-generated-footer", `${strings[lang].siteGenerated}: ${generatedAt}`);

  const dateModified = document.getElementById("date-modified");
  if (dateModified) {
    const rawDate = data.generated_at_utc ? data.generated_at_utc.slice(0, 10) : "--";
    dateModified.setAttribute("modifier", rawDate);
    dateModified.textContent = rawDate;
  }

  renderCharts(data, lang);
}

async function main() {
  const lang = getLang();
  applyStaticText(lang);

  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");

  try {
    const data = await loadMissionData();
    applyDynamicData(data, lang);

    if (loadingState) {
      loadingState.style.display = "none";
    }
  } catch (error) {
    console.error(error);

    if (loadingState) {
      loadingState.style.display = "none";
    }

    if (errorState) {
      errorState.textContent = strings[lang].loadError;
      errorState.style.display = "block";
    }
  }
}

main();