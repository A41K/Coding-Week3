const background = document.getElementById("background");
const timeEl = document.getElementById("time");
const weatherEl = document.getElementById("weather");
const locationEl = document.getElementById("location");
const weatherConditionEl = document.getElementById("weatherCondition");
const weatherUpdatedEl = document.getElementById("weatherUpdated");
const dateLabelEl = document.getElementById("dateLabel");
const apodTitleEl = document.getElementById("apodTitle");
const apodDescriptionEl = document.getElementById("apodDescription");
const quote1El = document.getElementById("quote1");
const quote2El = document.getElementById("quote2");
const quote3El = document.getElementById("quote3");
const spotifyInputEl = document.getElementById("spotifyInput");
const spotifyLoadBtnEl = document.getElementById("spotifyLoadBtn");
const spotifyStatusEl = document.getElementById("spotifyStatus");
const spotifyEmbedEl = document.getElementById("spotifyEmbed");
let clockIntervalId = null;

const SPOTIFY_STORAGE_KEY = "spotifyEmbedPath";
const SPOTIFY_ALLOWED_TYPES = new Set([
  "track",
  "album",
  "playlist",
  "artist",
  "episode",
  "show"
]);

async function fetchJsonWithTimeout(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getApodData() {
  const url =
    "https://api.nasa.gov/planetary/apod?api_key=qF2xtffJ6XiUgz0UcWsXzjLHo1UZQSK41EWMegeQ";

  return fetchJsonWithTimeout(url, 7000);
}

async function getTimeData() {
  return fetchJsonWithTimeout("https://worldtimeapi.org/api/ip", 5000);
}

function formatLongDate(date) {
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function renderClock(date) {
  if (dateLabelEl) {
    dateLabelEl.textContent = formatLongDate(date);
  }

  if (!timeEl) {
    return;
  }

  timeEl.textContent = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function startClock(initialDate) {
  if (clockIntervalId) {
    clearInterval(clockIntervalId);
  }

  let current = new Date(initialDate.getTime());

  renderClock(current);

  clockIntervalId = setInterval(() => {
    current = new Date(current.getTime() + 1000);
    renderClock(current);
  }, 1000);
}

async function initTime() {
  startClock(new Date());

  try {
    const data = await getTimeData();
    const date = new Date(data.datetime);
    if (!Number.isNaN(date.getTime())) {
      startClock(date);
    }
  } catch (error) {
    console.log(error.message);
  }
}

async function getWeatherData(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day&temperature_unit=fahrenheit&wind_speed_unit=mph`;
  return fetchJsonWithTimeout(url, 7000);
}

function getWeatherLabelFromCode(code) {
  const labels = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm"
  };

  return labels[code] || "Conditions unavailable";
}

async function getReverseGeocode(latitude, longitude) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
  return fetchJsonWithTimeout(url, 7000);
}

async function getQuoteData() {
  return fetchJsonWithTimeout("https://dummyjson.com/quotes/random", 7000);
}

async function getLatestLaunchData() {
  return fetchJsonWithTimeout("https://api.spacexdata.com/v5/launches/latest", 7000);
}

function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => reject(error),
      {
        maximumAge: 60_000,
        timeout: 8000,
        enableHighAccuracy: false
      }
    );
  });
}

async function initApodBackground() {
  if (!background || !apodTitleEl || !apodDescriptionEl) {
    return;
  }

  try {
    const apod = await getApodData();

    apodTitleEl.textContent = apod.title || "Astronomy Picture of the Day";
    apodDescriptionEl.textContent = apod.explanation || "No description available.";

    if (apod.media_type === "image" && apod.url) {
      background.style.backgroundImage = `url('${apod.url}')`;
    }
  } catch (error) {
    console.log(error.message);
    apodTitleEl.textContent = "NASA feed unavailable";
    apodDescriptionEl.textContent = "Could not fetch APOD details right now.";
  }
}

async function initWeather() {
  if (!weatherEl || !locationEl || !weatherConditionEl || !weatherUpdatedEl) {
    return;
  }

  try {
    let coords;

    try {
      coords = await getBrowserLocation();
    } catch {
      coords = { latitude: 40.7128, longitude: -74.006 };
    }

    const weather = await getWeatherData(coords.latitude, coords.longitude);
    const current = weather.current;

    if (!current) {
      throw new Error("Weather API returned no current weather data.");
    }

    const humidity = Math.round(current.relative_humidity_2m);
    const temperatureF = Math.round(current.temperature_2m);
    const temperatureC = Math.round(((temperatureF - 32) * 5) / 9);
    const feelsLikeF = Math.round(current.apparent_temperature);
    const feelsLikeC = Math.round(((feelsLikeF - 32) * 5) / 9);
    const wind = Math.round(current.wind_speed_10m);
    const conditionText = getWeatherLabelFromCode(current.weather_code);
    const dayText = current.is_day === 1 ? "Day" : "Night";
    const updatedTime = current.time
      ? new Date(current.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      : "Unknown";

    weatherEl.textContent = `${temperatureF}°F / ${temperatureC}°C | ${humidity}% humidity | ${wind} mph wind`;
    weatherConditionEl.textContent = `${conditionText} | Feels like ${feelsLikeF}°F / ${feelsLikeC}°C`;
    weatherUpdatedEl.textContent = `${dayText} | Updated ${updatedTime}`;

    try {
      const place = await getReverseGeocode(coords.latitude, coords.longitude);
      const city =
        place.city ||
        place.locality ||
        place.principalSubdivision ||
        "Unknown city";
      const country = place.countryName || "Unknown country";
      locationEl.textContent = `${city}, ${country}`;
    } catch {
      locationEl.textContent = `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`;
    }
  } catch (error) {
    console.log(error.message);
    weatherEl.textContent = "Weather unavailable";
    locationEl.textContent = "Location unavailable";
    weatherConditionEl.textContent = "Conditions unavailable";
    weatherUpdatedEl.textContent = "Update unavailable";
  }
}

async function initQuote() {
  const quoteEls = [quote1El, quote2El, quote3El].filter(Boolean);

  if (quoteEls.length === 0) {
    return;
  }

  try {
    const quotes = await Promise.all([getQuoteData(), getQuoteData(), getQuoteData()]);

    quotes.forEach((quote, index) => {
      if (quoteEls[index]) {
        quoteEls[index].textContent = `"${quote.quote}" - ${quote.author}`;
      }
    });
  } catch (error) {
    console.log(error.message);
    quoteEls.forEach((el) => {
      el.textContent = "Quote feed unavailable";
    });
  }
}

function parseSpotifyPath(input) {
  const value = input.trim();
  if (!value) {
    return null;
  }

  const uriMatch = value.match(/^spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]+)$/i);
  if (uriMatch) {
    return `${uriMatch[1].toLowerCase()}/${uriMatch[2]}`;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (!url.hostname.includes("spotify.com")) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "embed") {
    parts.shift();
  }

  const type = parts[0]?.toLowerCase();
  const id = parts[1];

  if (!type || !id || !SPOTIFY_ALLOWED_TYPES.has(type)) {
    return null;
  }

  return `${type}/${id}`;
}

function setSpotifyEmbedByPath(path) {
  if (!spotifyEmbedEl) {
    return;
  }

  spotifyEmbedEl.src = `https://open.spotify.com/embed/${path}`;
  localStorage.setItem(SPOTIFY_STORAGE_KEY, path);
}

function initSpotify() {
  if (!spotifyEmbedEl || !spotifyStatusEl || !spotifyInputEl || !spotifyLoadBtnEl) {
    return;
  }

  const savedPath = localStorage.getItem(SPOTIFY_STORAGE_KEY);
  if (savedPath) {
    setSpotifyEmbedByPath(savedPath);
    spotifyStatusEl.textContent = "Loaded your last Spotify selection.";
  }

  const loadSpotifyFromInput = () => {
    const path = parseSpotifyPath(spotifyInputEl.value);

    if (!path) {
      spotifyStatusEl.textContent = "Invalid Spotify link. Try a track, album, playlist, artist, show, or episode.";
      return;
    }

    setSpotifyEmbedByPath(path);
    spotifyStatusEl.textContent = "Spotify embed updated.";
    spotifyInputEl.value = "";
  };

  spotifyLoadBtnEl.addEventListener("click", loadSpotifyFromInput);
  spotifyInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      loadSpotifyFromInput();
    }
  });
}

window.onload = function () {
  initTime();
  initWeather();
  initApodBackground();
  initQuote();
  initSpotify();
};