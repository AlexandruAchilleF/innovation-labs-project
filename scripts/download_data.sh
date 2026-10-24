#!/usr/bin/env bash
# Download PVGIS hourly production (2020, 1 kWp) for each demo city into data/raw/.
# Run from a laptop with internet. Cities missing a file fall back to the bell profile.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p data/raw

declare -A CITIES=(
  [bucuresti]="44.375 26.120"
  [cluj]="46.770 23.590"
  [iasi]="47.160 27.590"
  [timisoara]="45.750 21.230"
  [constanta]="44.180 28.630"
)

for city in "${!CITIES[@]}"; do
  read -r lat lon <<< "${CITIES[$city]}"
  out="data/raw/pvgis_${city}.json"
  url="https://re.jrc.ec.europa.eu/api/v5_2/seriescalc?lat=${lat}&lon=${lon}&pvcalculation=1&peakpower=1&loss=14&angle=30&aspect=0&startyear=2020&endyear=2020&outputformat=json"
  echo "PVGIS ${city} -> ${out}"
  curl -fsS --retry 3 -o "${out}" "${url}" || echo "  failed: ${city} will use the bell profile"
done
