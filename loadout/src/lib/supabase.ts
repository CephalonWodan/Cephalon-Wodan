import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Warframe {
  id: string;
  name: string;
  image_url: string;
  base_health: number;
  base_shield: number;
  base_armor: number;
  base_energy: number;
}

export interface Weapon {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'melee';
  image_url: string;
  base_damage: number;
}

export interface Mod {
  id: string;
  name: string;
  type: 'warframe' | 'weapon' | 'universal';
  polarity: string;
  max_rank: number;
  drain: number;
  description: string;
}

export interface Arcane {
  id: string;
  name: string;
  type: 'warframe' | 'weapon';
  max_rank: number;
  description: string;
}

export interface ArchonShard {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface Build {
  id?: string;
  user_id?: string;
  name: string;
  warframe_id: string | null;
  warframe_mods: ModSlot[];
  warframe_arcanes: ArcaneSlot[];
  archon_shards: ShardSlot[];
  primary_weapon_id: string | null;
  primary_mods: ModSlot[];
  primary_arcane: ArcaneSlot[];
  secondary_weapon_id: string | null;
  secondary_mods: ModSlot[];
  secondary_arcane: ArcaneSlot[];
  melee_weapon_id: string | null;
  melee_mods: ModSlot[];
  melee_arcane: ArcaneSlot[];
}

export interface ModSlot {
  mod_id: string;
  rank: number;
}

export interface ArcaneSlot {
  arcane_id: string;
  rank: number;
}

export interface ShardSlot {
  shard_id: string;
}
