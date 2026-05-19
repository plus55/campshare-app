export const NZ_REGIONS = [
  "Northland",
  "Auckland",
  "Waikato",
  "Bay of Plenty",
  "Gisborne",
  "Hawke's Bay",
  "Taranaki",
  "Manawatū-Whanganui",
  "Wellington",
  "Tasman",
  "Nelson",
  "Marlborough",
  "West Coast",
  "Canterbury",
  "Otago",
  "Southland",
] as const;

export const NORTH_ISLAND_REGIONS: ReadonlySet<string> = new Set([
  "Northland",
  "Auckland",
  "Waikato",
  "Bay of Plenty",
  "Gisborne",
  "Hawke's Bay",
  "Taranaki",
  "Manawatū-Whanganui",
  "Wellington",
]);

export const VAN_TYPES = [
  { value: "self-contained", label: "Self-contained" },
  { value: "non-self-contained", label: "Non self-contained" },
  { value: "campervan", label: "Campervan" },
  { value: "motorhome", label: "Motorhome" },
  { value: "bus", label: "Bus conversion" },
] as const;

export const MINIMUM_NIGHTS = [1, 2, 3, 5, 7] as const;

export const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  "Northland":           { lat: -35.73, lng: 174.32 },
  "Auckland":            { lat: -36.86, lng: 174.76 },
  "Waikato":             { lat: -37.78, lng: 175.28 },
  "Bay of Plenty":       { lat: -37.93, lng: 176.63 },
  "Gisborne":            { lat: -38.66, lng: 178.02 },
  "Hawke's Bay":         { lat: -39.49, lng: 176.91 },
  "Taranaki":            { lat: -39.06, lng: 174.08 },
  "Manawatū-Whanganui":  { lat: -40.35, lng: 175.61 },
  "Wellington":          { lat: -41.29, lng: 174.78 },
  "Tasman":              { lat: -41.27, lng: 172.79 },
  "Nelson":              { lat: -41.27, lng: 173.28 },
  "Marlborough":         { lat: -41.51, lng: 173.96 },
  "West Coast":          { lat: -42.45, lng: 171.21 },
  "Canterbury":          { lat: -43.53, lng: 172.64 },
  "Otago":               { lat: -45.03, lng: 168.66 },
  "Southland":           { lat: -46.10, lng: 168.36 },
};

export const VAN_FEATURES = [
  "Solar panels",
  "Diesel heater",
  "Off-grid capable",
  "Hot water",
  "Indoor shower",
  "Awning",
  "Bike rack",
  "Roof rack",
  "Linen included",
  "Cooking gear included",
  "Outdoor shower",
  "Wi-Fi / 4G",
  "Fridge / freezer",
  "Gas cooker",
  "Inverter / 240V",
  "Reversing camera",
] as const;
