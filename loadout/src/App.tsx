import { useState } from 'react';
import { Wrench } from 'lucide-react';
import WorldstateWidget from './components/WorldstateWidget';
import { Warframe, Weapon, ModSlot, ArcaneSlot, ShardSlot, Build } from './lib/supabase';
import { WarframeSelector } from './components/WarframeSelector';
import { WeaponSelector } from './components/WeaponSelector';
import { ModSelector } from './components/ModSelector';
import { ArcaneSelector } from './components/ArcaneSelector';
import { ArchonShardSelector } from './components/ArchonShardSelector';
import { BuildManager } from './components/BuildManager';

function App() {
  const [selectedWarframe, setSelectedWarframe] = useState<Warframe | null>(null);
  const [primaryWeapon, setPrimaryWeapon] = useState<Weapon | null>(null);
  const [secondaryWeapon, setSecondaryWeapon] = useState<Weapon | null>(null);
  const [meleeWeapon, setMeleeWeapon] = useState<Weapon | null>(null);

  const [warframeMods, setWarframeMods] = useState<ModSlot[]>([]);
  const [warframeArcanes, setWarframeArcanes] = useState<ArcaneSlot[]>([]);
  const [archonShards, setArchonShards] = useState<ShardSlot[]>([]);

  const [primaryMods, setPrimaryMods] = useState<ModSlot[]>([]);
  const [primaryArcane, setPrimaryArcane] = useState<ArcaneSlot[]>([]);

  const [secondaryMods, setSecondaryMods] = useState<ModSlot[]>([]);
  const [secondaryArcane, setSecondaryArcane] = useState<ArcaneSlot[]>([]);

  const [meleeMods, setMeleeMods] = useState<ModSlot[]>([]);
  const [meleeArcane, setMeleeArcane] = useState<ArcaneSlot[]>([]);

  const currentBuild: Build = {
    name: '',
    warframe_id: selectedWarframe?.id || null,
    warframe_mods: warframeMods,
    warframe_arcanes: warframeArcanes,
    archon_shards: archonShards,
    primary_weapon_id: primaryWeapon?.id || null,
    primary_mods: primaryMods,
    primary_arcane: primaryArcane,
    secondary_weapon_id: secondaryWeapon?.id || null,
    secondary_mods: secondaryMods,
    secondary_arcane: secondaryArcane,
    melee_weapon_id: meleeWeapon?.id || null,
    melee_mods: meleeMods,
    melee_arcane: meleeArcane,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Wrench className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Warframe Build Planner</h1>
          </div>
          <p className="text-blue-200">Créez et personnalisez vos builds Warframe</p>
        {/* Widget worldstate pour afficher des informations en temps réel (fissures) */}
        <div className="mt-4">
          <WorldstateWidget />
        </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <WarframeSelector selectedWarframe={selectedWarframe} onSelect={setSelectedWarframe} />
        </div>

        {selectedWarframe && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-800">Configuration Warframe</h3>
              <ModSelector type="warframe" mods={warframeMods} onModsChange={setWarframeMods} />
              <ArcaneSelector
                type="warframe"
                arcanes={warframeArcanes}
                onArcanesChange={setWarframeArcanes}
              />
              <ArchonShardSelector shards={archonShards} onShardsChange={setArchonShards} />
            </div>

            <div className="space-y-6">
              <WeaponSelector type="primary" selectedWeapon={primaryWeapon} onSelect={setPrimaryWeapon} />
              {primaryWeapon && (
                <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
                  <ModSelector type="weapon" mods={primaryMods} onModsChange={setPrimaryMods} />
                  <ArcaneSelector
                    type="weapon"
                    arcanes={primaryArcane}
                    onArcanesChange={setPrimaryArcane}
                    maxSlots={1}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {selectedWarframe && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="space-y-6">
              <WeaponSelector
                type="secondary"
                selectedWeapon={secondaryWeapon}
                onSelect={setSecondaryWeapon}
              />
              {secondaryWeapon && (
                <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
                  <ModSelector type="weapon" mods={secondaryMods} onModsChange={setSecondaryMods} />
                  <ArcaneSelector
                    type="weapon"
                    arcanes={secondaryArcane}
                    onArcanesChange={setSecondaryArcane}
                    maxSlots={1}
                  />
                </div>
              )}
            </div>

            <div className="space-y-6">
              <WeaponSelector type="melee" selectedWeapon={meleeWeapon} onSelect={setMeleeWeapon} />
              {meleeWeapon && (
                <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
                  <ModSelector type="weapon" mods={meleeMods} onModsChange={setMeleeMods} />
                  <ArcaneSelector
                    type="weapon"
                    arcanes={meleeArcane}
                    onArcanesChange={setMeleeArcane}
                    maxSlots={1}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {selectedWarframe && (
          <div className="max-w-2xl mx-auto">
            <BuildManager build={currentBuild} onSaved={() => console.log('Build saved!')} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
