import { SolarRoof } from "@/components/sunproof/map/SolarRoof";
import { houseStatusAt, houseVoltageAt, slotLabel, solarFactor } from "@/lib/geo";
import { fmt } from "@/lib/format";
import { DERATING_START_V, LEGAL_LIMIT_V } from "@/lib/sim";
import type { FeederHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusRo = {
  night: "noapte",
  normal: "produce",
  derating: "derating",
  trip: "oprit",
} as const;

/**
 * 2D street elevation of the client's feeder: the client's roof and its nearest neighbours in distance order,
 * each with its PV array, inverter state and PCC voltage for the selected 15-minute slot.
 */
export function NeighborStrip({
  houses,
  clientId,
  slot,
}: {
  houses: FeederHouse[];
  clientId: string;
  slot: number;
}) {
  const client = houses.find((h) => (h.household_id ?? h.house_id) === clientId);
  if (!client)
    return (
      <p className="text-[12px] text-fog">
        Clientul nu apare pe schema acestui post de transformare.
      </p>
    );
  const key = client.feeder_id ?? client.feeder;
  const feeder = houses
    .filter((h) => (h.feeder_id ?? h.feeder) === key)
    .sort((a, b) => a.distance_m - b.distance_m);
  const i = feeder.indexOf(client);
  const start = Math.max(0, Math.min(i - 3, feeder.length - 7));
  const row = feeder.slice(start, start + 7);
  const sun = solarFactor(slot);
  const peers = row.filter((h) => h !== client);
  // inverters trip on their own terminal voltage (PCC + internal cable rise), so count states, not PCC volts
  const peersHit = peers.filter((h) =>
    ["trip", "derating"].includes(houseStatusAt(h, slot)),
  ).length;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-medium text-bone">Strada clientului</h2>
        <span
          className="num text-[11px] text-fog"
          title="Echipamente de pe stradă oprite sau în derating la ora selectată"
        >
          pe stradă, la {slotLabel(slot)}: {peersHit} din {peers.length} echipamente
        </span>
      </div>
      <div className="relative rounded-[8px] border border-border bg-obsidian px-2 pb-2 pt-3">
        <div
          className="relative grid gap-1"
          style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
        >
          {row.map((h) => {
            const v = houseVoltageAt(h, slot);
            const st = houseStatusAt(h, slot);
            const me = h === client;
            return (
              <div key={h.house_id} className="flex flex-col items-center gap-1">
                <SolarRoof
                  pvKw={h.pv_kw}
                  status={st}
                  sun={sun}
                  hasBattery={h.has_battery}
                  selected={me}
                  monitored={!!h.household_id}
                  size={50}
                  title={`${me ? "Client" : "Echipament"} · ${statusRo[st]} · ${fmt(v, 1)} V · ${h.distance_m} m de PT`}
                />
                <span
                  className={cn(
                    me ? "num text-[11px] text-voltage" : "num text-[11px]",
                    v >= LEGAL_LIMIT_V
                      ? "text-critical"
                      : v >= DERATING_START_V
                        ? "text-warning"
                        : "text-bone",
                  )}
                >
                  {fmt(v, 1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
