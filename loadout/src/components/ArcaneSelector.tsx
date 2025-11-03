import { useEffect, useState } from 'react';
import { Arcane, ArcaneSlot } from '../lib/supabase';
import { dataSource } from '../lib/dataSource';
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

interface ArcaneSelectorProps {
  type: 'warframe' | 'weapon';
  arcanes: ArcaneSlot[];
  onArcanesChange: (arcanes: ArcaneSlot[]) => void;
  maxSlots?: number;
}

export function ArcaneSelector({ type, arcanes, onArcanesChange, maxSlots = 2 }: ArcaneSelectorProps) {
  const [availableArcanes, setAvailableArcanes] = useState<Arcane[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArcanePicker, setShowArcanePicker] = useState(false);

  useEffect(() => {
    loadArcanes();
  }, [type]);

  async function loadArcanes() {
    try {
      const res = await dataSource.arcanes();
      const list = (res as any as Arcane[]).filter((a) => a.type === type);
      setAvailableArcanes(list);
    } catch (e) {
      console.error('Error loading arcanes:', e);
      setAvailableArcanes([]);
    }
    setLoading(false);
  }

  const addArcane = (arcane: Arcane) => {
    if (arcanes.length < maxSlots) {
      onArcanesChange([...arcanes, { arcane_id: arcane.id, rank: 0 }]);
      setShowArcanePicker(false);
    }
  };

  const removeArcane = (index: number) => {
    onArcanesChange(arcanes.filter((_, i) => i !== index));
  };

  const updateRank = (index: number, delta: number) => {
    const newArcanes = [...arcanes];
    const arcaneData = availableArcanes.find((a) => a.id === newArcanes[index].arcane_id);
    if (arcaneData) {
      const newRank = Math.max(0, Math.min(arcaneData.max_rank, newArcanes[index].rank + delta));
      newArcanes[index].rank = newRank;
      onArcanesChange(newArcanes);
    }
  };

  const getArcaneData = (arcaneId: string) => {
    return availableArcanes.find((a) => a.id === arcaneId);
  };

  if (loading) {
    return <div className="text-center py-4">Chargement des arcanes...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-700">
          Arcanes ({arcanes.length}/{maxSlots})
        </h4>
        {arcanes.length < maxSlots && (
          <button
            onClick={() => setShowArcanePicker(!showArcanePicker)}
            className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        )}
      </div>

      {showArcanePicker && (
        <div className="border-2 border-purple-200 rounded-lg p-3 bg-purple-50 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-1 gap-2">
            {availableArcanes.map((arcane) => (
              <button
                key={arcane.id}
                onClick={() => addArcane(arcane)}
                className="p-2 bg-white rounded border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-colors text-left"
              >
                <div className="font-medium text-sm">{arcane.name}</div>
                <div className="text-xs text-gray-500">{arcane.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {arcanes.map((arcaneSlot, index) => {
          const arcaneData = getArcaneData(arcaneSlot.arcane_id);
          if (!arcaneData) return null;

          return (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-200"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{arcaneData.name}</div>
                <div className="text-xs text-gray-600">
                  Rang {arcaneSlot.rank}/{arcaneData.max_rank}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateRank(index, -1)}
                  disabled={arcaneSlot.rank === 0}
                  className="p-1 bg-purple-200 rounded hover:bg-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateRank(index, 1)}
                  disabled={arcaneSlot.rank === arcaneData.max_rank}
                  className="p-1 bg-purple-200 rounded hover:bg-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeArcane(index)}
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
