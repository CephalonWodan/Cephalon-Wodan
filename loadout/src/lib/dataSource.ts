// Data source wrapper: prefer the API and fall back to Supabase if the
// API call fails. This allows the client to operate offline or when the
// custom API is unreachable. The fallback only kicks in if Supabase is
// properly configured via environment variables.

import { api, ApiWarframe, ApiWeapon, ApiMod, ApiArcane, ApiArchonShardMap } from './api';
import { supabase } from './supabase';

export const dataSource = {
  async warframes(): Promise<ApiWarframe[]> {
    try {
      return await api.warframes();
    } catch (err) {
      // fallback to Supabase
      const { data } = await supabase
        .from('warframes')
        .select('*')
        .order('name');
      return (data ?? []) as any;
    }
  },
  async weapons(): Promise<ApiWeapon[]> {
    try {
      return await api.weapons();
    } catch (err) {
      const { data } = await supabase
        .from('weapons')
        .select('*')
        .order('name');
      return (data ?? []) as any;
    }
  },
  async mods(): Promise<ApiMod[]> {
    try {
      return await api.mods();
    } catch (err) {
      const { data } = await supabase
        .from('mods')
        .select('*')
        .order('name');
      return (data ?? []) as any;
    }
  },
  async arcanes(): Promise<ApiArcane[]> {
    try {
      return await api.arcanes();
    } catch (err) {
      const { data } = await supabase
        .from('arcanes')
        .select('*')
        .order('name');
      return (data ?? []) as any;
    }
  },
  async shards(): Promise<ApiArchonShardMap> {
    try {
      return await api.shards();
    } catch (err) {
      const { data } = await supabase.from('archonshards').select('*');
      // convert the array of rows into a color → upgrades map if needed
      const out: ApiArchonShardMap = {};
      (data ?? []).forEach((row: any) => {
        const color = row.color || row.value;
        if (!color) return;
        const upgrades: string[] = Array.isArray(row.upgrades)
          ? row.upgrades
          : row.upgradeTypes
          ? Object.values(row.upgradeTypes).map((u: any) => u.value)
          : [];
        out[color] = { upgrades };
      });
      return out;
    }
  },
};