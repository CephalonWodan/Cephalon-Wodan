import { useEffect, useState } from 'react';
// Use the Weapon type for typing only
import { Weapon } from '../lib/supabase';
import { dataSource } from '../lib/dataSource';
import { Sword, Crosshair, Swords } from 'lucide-react';

interface WeaponSelectorProps {
  type: 'primary' | 'secondary' | 'melee';
  selectedWeapon: Weapon | null;
  onSelect: (weapon: Weapon) => void;
}

export function WeaponSelector({ type, selectedWeapon, onSelect }: WeaponSelectorProps) {
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeapons();
  }, [type]);

  async function loadWeapons() {
    try {
      const res = await dataSource.weapons();
      // Filter the weapons by type since the API returns all categories
      const list = (res as any as Weapon[]).filter((w) => w.type === type);
      setWeapons(list);
    } catch (e) {
      console.error('Error loading weapons:', e);
      setWeapons([]);
    }
    setLoading(false);
  }

  const getIcon = () => {
    switch (type) {
      case 'primary':
        return <Crosshair className="w-5 h-5" />;
      case 'secondary':
        return <Sword className="w-5 h-5" />;
      case 'melee':
        return <Swords className="w-5 h-5" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'primary':
        return 'Arme Primaire';
      case 'secondary':
        return 'Arme Secondaire';
      case 'melee':
        return 'Arme de Mêlée';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Chargement...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center gap-2 mb-4">
        {getIcon()}
        <h3 className="text-lg font-bold text-gray-800">{getTitle()}</h3>
      </div>

      {selectedWeapon && (
        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded border border-green-200">
          <div className="font-semibold text-green-900">{selectedWeapon.name}</div>
          <div className="text-sm text-green-700">Dégâts: {selectedWeapon.base_damage}</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
        {weapons.map((weapon) => (
          <button
            key={weapon.id}
            onClick={() => onSelect(weapon)}
            className={`p-3 rounded border-2 transition-all text-left ${
              selectedWeapon?.id === weapon.id
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-green-300'
            }`}
          >
            <div className="font-medium text-gray-800">{weapon.name}</div>
            <div className="text-xs text-gray-500">Dégâts: {weapon.base_damage}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
