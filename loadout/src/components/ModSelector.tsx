import { useEffect, useState } from 'react';
// Import types from Supabase definitions; we still use the same ModSlot type
import { Mod, ModSlot } from '../lib/supabase';
import { dataSource } from '../lib/dataSource';
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

interface ModSelectorProps {
  type: 'warframe' | 'weapon';
  mods: ModSlot[];
  onModsChange: (mods: ModSlot[]) => void;
  maxSlots?: number;
}

export function ModSelector({ type, mods, onModsChange, maxSlots = 8 }: ModSelectorProps) {
  const [availableMods, setAvailableMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModPicker, setShowModPicker] = useState(false);

  useEffect(() => {
    loadMods();
  }, [type]);

  async function loadMods() {
    try {
      const res = await dataSource.mods();
      // Filter the mods by type or universal since API returns all
      const list = (res as any as Mod[]).filter(
        (m) => m.type === type || m.type === 'universal'
      );
      setAvailableMods(list);
    } catch (e) {
      console.error('Error loading mods:', e);
      setAvailableMods([]);
    }
    setLoading(false);
  }

  const addMod = (mod: Mod) => {
    if (mods.length < maxSlots) {
      onModsChange([...mods, { mod_id: mod.id, rank: 0 }]);
      setShowModPicker(false);
    }
  };

  const removeMod = (index: number) => {
    onModsChange(mods.filter((_, i) => i !== index));
  };

  const updateRank = (index: number, delta: number) => {
    const newMods = [...mods];
    const modData = availableMods.find((m) => m.id === newMods[index].mod_id);
    if (modData) {
      const newRank = Math.max(0, Math.min(modData.max_rank, newMods[index].rank + delta));
      newMods[index].rank = newRank;
      onModsChange(newMods);
    }
  };

  const getModData = (modId: string) => {
    return availableMods.find((m) => m.id === modId);
  };

  if (loading) {
    return <div className="text-center py-4">Chargement des mods...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-700">
          Mods ({mods.length}/{maxSlots})
        </h4>
        {mods.length < maxSlots && (
          <button
            onClick={() => setShowModPicker(!showModPicker)}
            className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        )}
      </div>

      {showModPicker && (
        <div className="border-2 border-blue-200 rounded-lg p-3 bg-blue-50 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-1 gap-2">
            {availableMods.map((mod) => (
              <button
                key={mod.id}
                onClick={() => addMod(mod)}
                className="p-2 bg-white rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="font-medium text-sm">{mod.name}</div>
                <div className="text-xs text-gray-500">{mod.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {mods.map((modSlot, index) => {
          const modData = getModData(modSlot.mod_id);
          if (!modData) return null;

          return (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{modData.name}</div>
                <div className="text-xs text-gray-500">
                  Rang {modSlot.rank}/{modData.max_rank} • Coût: {modData.drain + modSlot.rank}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateRank(index, -1)}
                  disabled={modSlot.rank === 0}
                  className="p-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateRank(index, 1)}
                  disabled={modSlot.rank === modData.max_rank}
                  className="p-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeMod(index)}
                  className="p-1 bg-red-500 text-white rounded hover:bg-red-600 ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
