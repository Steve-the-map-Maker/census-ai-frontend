const DEFAULT_US_CENTER = [39.8283, -98.5795];

const STATE_CENTERS = {
  alabama: [32.3617, -86.2792],
  alaska: [64.0685, -152.2782],
  arizona: [34.2744, -111.2847],
  arkansas: [34.7519, -92.1313],
  california: [36.7783, -119.4179],
  colorado: [39.5501, -105.7821],
  connecticut: [41.6219, -72.7273],
  delaware: [38.9108, -75.5277],
  florida: [27.7663, -81.6868],
  georgia: [32.9866, -83.6487],
  hawaii: [21.1098, -157.5311],
  idaho: [44.2394, -114.5103],
  illinois: [40.3363, -89.0022],
  indiana: [39.8647, -86.2604],
  iowa: [42.0046, -93.2140],
  kansas: [38.5266, -96.7265],
  kentucky: [37.6690, -84.6701],
  louisiana: [31.1695, -91.8678],
  maine: [44.6939, -69.3819],
  maryland: [39.0639, -76.8021],
  massachusetts: [42.2373, -71.5314],
  michigan: [43.3266, -84.5361],
  minnesota: [45.7326, -93.9196],
  mississippi: [32.7673, -89.6812],
  missouri: [38.4623, -92.3020],
  montana: [47.0527, -110.2148],
  nebraska: [41.1289, -98.2883],
  nevada: [38.4199, -117.1219],
  "new hampshire": [43.4525, -71.5639],
  "new jersey": [40.3140, -74.5089],
  "new mexico": [34.8405, -106.2485],
  "new york": [42.9538, -75.5268],
  "north carolina": [35.6411, -79.8431],
  "north dakota": [47.5362, -99.7930],
  ohio: [40.3888, -82.7649],
  oklahoma: [35.5889, -96.9028],
  oregon: [44.5672, -122.1269],
  pennsylvania: [40.5773, -77.2640],
  "rhode island": [41.6762, -71.5562],
  "south carolina": [33.8191, -80.9066],
  "south dakota": [44.2853, -99.4632],
  tennessee: [35.7449, -86.7489],
  texas: [31.0545, -97.5635],
  utah: [40.1135, -111.8535],
  vermont: [44.0407, -72.7093],
  virginia: [37.7693, -78.2057],
  washington: [47.3826, -121.0152],
  "west virginia": [38.4680, -80.9696],
  wisconsin: [44.2619, -89.6179],
  wyoming: [42.7475, -107.2085]
};

const STATE_NAME_TO_FIPS = {
  alabama: "01",
  alaska: "02",
  arizona: "04",
  arkansas: "05",
  california: "06",
  colorado: "08",
  connecticut: "09",
  delaware: "10",
  florida: "12",
  georgia: "13",
  hawaii: "15",
  idaho: "16",
  illinois: "17",
  indiana: "18",
  iowa: "19",
  kansas: "20",
  kentucky: "21",
  louisiana: "22",
  maine: "23",
  maryland: "24",
  massachusetts: "25",
  michigan: "26",
  minnesota: "27",
  mississippi: "28",
  missouri: "29",
  montana: "30",
  nebraska: "31",
  nevada: "32",
  "new hampshire": "33",
  "new jersey": "34",
  "new mexico": "35",
  "new york": "36",
  "north carolina": "37",
  "north dakota": "38",
  ohio: "39",
  oklahoma: "40",
  oregon: "41",
  pennsylvania: "42",
  "rhode island": "44",
  "south carolina": "45",
  "south dakota": "46",
  tennessee: "47",
  texas: "48",
  utah: "49",
  vermont: "50",
  virginia: "51",
  washington: "53",
  "west virginia": "54",
  wisconsin: "55",
  wyoming: "56",
  "district of columbia": "11",
  "puerto rico": "72"
};

const STATE_FIPS_TO_CENTER = Object.entries(STATE_NAME_TO_FIPS).reduce((acc, [name, fips]) => {
  const center = STATE_CENTERS[name];
  if (center) {
    acc[fips] = center;
  }
  return acc;
}, {});

function normalizeStateKey(stateName) {
  if (!stateName) {
    return null;
  }
  return stateName.trim().toLowerCase();
}

export function getStateCenter(stateName) {
  const key = normalizeStateKey(stateName);
  if (key && STATE_CENTERS[key]) {
    return STATE_CENTERS[key];
  }
  return DEFAULT_US_CENTER;
}

export function getStateCenterByFips(stateFips) {
  if (!stateFips) {
    return null;
  }
  const normalized = String(stateFips).padStart(2, '0');
  return STATE_FIPS_TO_CENTER[normalized] || null;
}

export function getStateFipsFromName(stateName) {
  const key = normalizeStateKey(stateName);
  if (key && STATE_NAME_TO_FIPS[key]) {
    return STATE_NAME_TO_FIPS[key];
  }
  return null;
}

export { DEFAULT_US_CENTER, STATE_CENTERS, STATE_NAME_TO_FIPS, STATE_FIPS_TO_CENTER };
