import { useEffect, useState } from 'react';
// Import the Warframe type from the Supabase definitions for typing
import { Warframe } from '../lib/supabase';
// Prefer the API and fall back to Supabase via dataSource
import { dataSource } from '../lib/dataSource';
import { Shield, Heart, Activity, Zap } from 'lucide-react';

interface WarframeSelectorProps {
  selectedWarframe: Warframe | null;
  onSelect: (warframe: Warframe) => void;
}

export function WarframeSelector({ selectedWarframe, onSelect }: WarframeSelectorProps) {
  const [warframes, setWarframes] = useState<Warframe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarframes();
  }, []);

  async function loadWarframes() {
    try {
      const res = await dataSource.warframes();
      setWarframes((res as any) || []);
    } catch (e) {
      console.error('Error loading warframes:', e);
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="text-center py-8">Chargement des Warframes...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Sélectionnez une Warframe</h2>

      {selectedWarframe && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
          <h3 className="text-xl font-semibold mb-3 text-blue-900">{selectedWarframe.name}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-red-600">
              <Heart className="w-5 h-5" />
              <span className="font-medium">Santé: {selectedWarframe.base_health}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-600">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Bouclier: {selectedWarframe.base_shield}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Activity className="w-5 h-5" />
              <span className="font-medium">Armure: {selectedWarframe.base_armor}</span>
            </div>
            <div className="flex items-center gap-2 text-cyan-600">
              <Zap className="w-5 h-5" />
              <span className="font-medium">Énergie: {selectedWarframe.base_energy}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {warframes.map((warframe) => (
          <button
            key={warframe.id}
            onClick={() => onSelect(warframe)}
            className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
              selectedWarframe?.id === warframe.id
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800">{warframe.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {warframe.base_health} | {warframe.base_shield}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
