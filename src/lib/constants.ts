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
