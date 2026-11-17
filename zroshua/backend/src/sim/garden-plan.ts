/**
 * The virtual garden of the stand: the same layout as a real installation it was modelled on
 * (14 beds, two lawns, three drip circuits, a well pump and a barrel pump), so screenshots and
 * smoke tests exercise realistic names, counts and run lengths.
 */

export interface PlanZone {
  id: string;
  name: string;
  type: 'beds' | 'lawn' | 'drip' | 'shrubs' | 'tree' | 'sprinkler';
  minutes: number;
  flowLpm: number;
  source: 'well' | 'barrel';
  enabled: boolean;
}

export interface PlanGroup {
  id: string;
  name: string;
  mode: 'sequential' | 'parallel';
  zones: string[];
  /** HH:MM start times, every day; a [time, zone ids] pair waters only those zones */
  starts: (string | [string, string[]])[];
  enabled: boolean;
  /** skip the run when the rain probability is above this % */
  rainProbMax?: number;
}

const bed = (n: number, minutes = 7, enabled = true): PlanZone => ({
  id: `bed_${n}`,
  name: `Bed ${n}`,
  type: 'beds',
  minutes,
  flowLpm: 6,
  source: 'well',
  enabled,
});

export const PLAN_ZONES: PlanZone[] = [
  bed(1, 3),
  bed(2),
  bed(3),
  bed(4),
  bed(5, 4),
  bed(6, 7, false),
  bed(7),
  bed(8),
  bed(9),
  bed(10),
  bed(11),
  bed(12, 7, false),
  bed(13),
  { id: 'blueberry', name: 'Blueberry', type: 'drip', minutes: 10, flowLpm: 4, source: 'well', enabled: false },
  { id: 'lawn_garage', name: 'Lawn garage', type: 'lawn', minutes: 50, flowLpm: 24, source: 'well', enabled: true },
  { id: 'lawn_guest', name: 'Lawn guest house', type: 'lawn', minutes: 40, flowLpm: 24, source: 'well', enabled: false },
  { id: 'lawn_front', name: 'Lawn front', type: 'lawn', minutes: 50, flowLpm: 24, source: 'well', enabled: true },
  { id: 'lawn_rectangle', name: 'Lawn rectangle', type: 'lawn', minutes: 40, flowLpm: 24, source: 'well', enabled: true },
  { id: 'lawn_triangle', name: 'Lawn triangle', type: 'lawn', minutes: 70, flowLpm: 24, source: 'well', enabled: true },
  { id: 'backyard_lawn_1', name: 'Backyard Lawn zone 1', type: 'lawn', minutes: 45, flowLpm: 22, source: 'well', enabled: true },
  { id: 'backyard_lawn_2', name: 'Backyard Lawn zone 2', type: 'lawn', minutes: 45, flowLpm: 22, source: 'well', enabled: true },
  { id: 'backyard_lawn_3', name: 'Backyard Lawn zone 3', type: 'lawn', minutes: 45, flowLpm: 22, source: 'well', enabled: true },
  { id: 'front_beds', name: 'Front Garden beds', type: 'drip', minutes: 10, flowLpm: 8, source: 'well', enabled: true },
  { id: 'front_trees', name: 'Front Garden trees', type: 'tree', minutes: 10, flowLpm: 8, source: 'well', enabled: true },
  { id: 'front_shrubs', name: 'Front Garden shrubs', type: 'shrubs', minutes: 10, flowLpm: 8, source: 'well', enabled: false },
  { id: 'tree_avenue', name: 'Tree avenue', type: 'tree', minutes: 15, flowLpm: 10, source: 'barrel', enabled: false },
  { id: 'japan_garden', name: 'Japan garden', type: 'drip', minutes: 15, flowLpm: 10, source: 'barrel', enabled: false },
  { id: 'pool_garden', name: 'Pool garden', type: 'shrubs', minutes: 15, flowLpm: 10, source: 'barrel', enabled: false },
  { id: 'left_backyard', name: 'Left backyard', type: 'drip', minutes: 15, flowLpm: 10, source: 'barrel', enabled: false },
  { id: 'right_backyard', name: 'Right backyard', type: 'drip', minutes: 15, flowLpm: 10, source: 'barrel', enabled: false },
  { id: 'fruit_1', name: 'First fruit trees', type: 'tree', minutes: 10, flowLpm: 12, source: 'barrel', enabled: true },
  { id: 'fruit_2', name: 'Second fruit trees', type: 'tree', minutes: 10, flowLpm: 12, source: 'barrel', enabled: true },
];

export const PLAN_GROUPS: PlanGroup[] = [
  {
    id: 'beds',
    name: 'Beds',
    mode: 'parallel',
    zones: PLAN_ZONES.filter((z) => z.type === 'beds' || z.id === 'blueberry').map((z) => z.id),
    starts: ['06:00', ['12:00', ['bed_7', 'bed_9']], '18:00'],
    enabled: true,
  },
  {
    id: 'front_lawn',
    name: 'Front Garden Lawn',
    mode: 'sequential',
    zones: ['lawn_garage', 'lawn_guest', 'lawn_front', 'lawn_rectangle', 'lawn_triangle'],
    starts: ['03:30'],
    enabled: true,
  },
  {
    id: 'backyard_lawn',
    name: 'Backyard Garden Lawn',
    mode: 'sequential',
    zones: ['backyard_lawn_1', 'backyard_lawn_2', 'backyard_lawn_3'],
    starts: ['21:00'],
    enabled: true,
    rainProbMax: 60,
  },
  { id: 'front_drip', name: 'Front Drip', mode: 'parallel', zones: ['front_beds', 'front_trees', 'front_shrubs'], starts: ['05:30'], enabled: true },
  {
    id: 'backyard_drip',
    name: 'Backyard Drip',
    mode: 'parallel',
    zones: ['tree_avenue', 'japan_garden', 'pool_garden', 'left_backyard', 'right_backyard'],
    starts: [],
    enabled: true,
  },
  { id: 'fruit_drip', name: 'Fruit Drip', mode: 'parallel', zones: ['fruit_1', 'fruit_2'], starts: ['05:30', '17:00'], enabled: true },
];

/** Soil and plant sensors: what each device measures and which zone it sits in. */
export interface PlanSensor {
  slug: string;
  name: string;
  zone: string;
  readings: ('moisture' | 'temperature' | 'illuminance' | 'conductivity' | 'battery')[];
  moisture: number;
  battery: number;
  conductivity?: number;
  /** waters below / blocks above (soil triggers of the seeded settings) */
  startBelow: number;
  blockAbove: number;
  target: { kind: 'zone' | 'group'; id: string; minutes: number };
}

export const PLAN_SENSORS: PlanSensor[] = [
  {
    slug: 'apricot',
    name: 'Apricot',
    zone: 'fruit_1',
    readings: ['moisture', 'temperature', 'illuminance', 'conductivity', 'battery'],
    moisture: 34,
    battery: 78,
    conductivity: 820,
    startBelow: 25,
    blockAbove: 55,
    target: { kind: 'zone', id: 'fruit_1', minutes: 10 },
  },
  {
    slug: 'cherry',
    name: 'Cherry',
    zone: 'fruit_2',
    readings: ['moisture', 'temperature', 'battery'],
    moisture: 23,
    battery: 64,
    startBelow: 25,
    blockAbove: 55,
    target: { kind: 'zone', id: 'fruit_2', minutes: 10 },
  },
  {
    slug: 'beds_soil',
    name: 'Beds soil',
    zone: 'bed_3',
    readings: ['moisture', 'battery'],
    moisture: 47,
    battery: 91,
    startBelow: 30,
    blockAbove: 60,
    target: { kind: 'group', id: 'beds', minutes: 7 },
  },
  {
    slug: 'front_lawn_soil',
    name: 'Front lawn soil',
    zone: 'lawn_front',
    readings: ['moisture', 'temperature', 'conductivity', 'battery'],
    moisture: 62,
    battery: 12,
    conductivity: 410,
    startBelow: 20,
    blockAbove: 55,
    target: { kind: 'zone', id: 'lawn_front', minutes: 20 },
  },
];

export const valveEntity = (zoneId: string) => `switch.valve_${zoneId}`;
