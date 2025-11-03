import { useEffect, useState } from 'react';
import { ArchonShard, ShardSlot } from '../lib/supabase';
import { dataSource } from '../lib/dataSource';
import { Plus, X, Hexagon } from 'lucide-react';

interface ArchonShardSelectorProps {
  shards: ShardSlot[];
  onShardsChange: (shards: ShardSlot[]) => void;
  maxSlots?: number;
}

export function ArchonShardSelector({ shards, onShardsChange, maxSlots = 5 }: ArchonShardSelectorProps) {
  const [availableShards, setAvailableShards] = useState<ArchonShard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShardPicker, setShowShardPicker] = useState(false);

  useEffect(() => {
    loadShards();
  }, []);

  async function loadShards() {
    try {
      const res = await dataSource.shards();
      // The API returns a map colour → { upgrades: string[] }.
      // Convert it into an array of ArchonShard-like objects.
      const list: ArchonShard[] = Object.entries(res).map(([color, obj]) => {
        const upg = obj.upgrades || [];
        return {
          id: color,
          name: color.charAt(0).toUpperCase() + color.slice(1),
          color: color,
          description: upg.join(', '),
        } as ArchonShard;
      });
      setAvailableShards(list);
    } catch (e) {
      console.error('Error loading shards:', e);
      setAvailableShards([]);
    }
    setLoading(false);
  }

  const addShard = (shard: ArchonShard) => {
    if (shards.length < maxSlots) {
      onShardsChange([...shards, { shard_id: shard.id }]);
      setShowShardPicker(false);
    }
  };

  const removeShard = (index: number) => {
    onShardsChange(shards.filter((_, i) => i !== index));
  };

  const getShardData = (shardId: string) => {
    return availableShards.find((s) => s.id === shardId);
  };

  const getColorClass = (color: string) => {
    switch (color.toLowerCase()) {
      case 'red':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'blue':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'yellow':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'purple':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Chargement des éclats...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-700 flex items-center gap-2">
          <Hexagon className="w-5 h-5" />
          Éclats d'Archontes ({shards.length}/{maxSlots})
        </h4>
        {shards.length < maxSlots && (
          <button
            onClick={() => setShowShardPicker(!showShardPicker)}
            className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        )}
      </div>

      {showShardPicker && (
        <div className="border-2 border-orange-200 rounded-lg p-3 bg-orange-50 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-1 gap-2">
            {availableShards.map((shard) => (
              <button
                key={shard.id}
                onClick={() => addShard(shard)}
                className={`p-2 rounded border-2 hover:shadow-md transition-all text-left ${getColorClass(
                  shard.color
                )}`}
              >
                <div className="font-medium text-sm flex items-center gap-2">
                  <Hexagon className="w-4 h-4" />
                  {shard.name}
                </div>
                <div className="text-xs mt-1">{shard.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {shards.map((shardSlot, index) => {
          const shardData = getShardData(shardSlot.shard_id);
          if (!shardData) return null;

          return (
            <div
              key={index}
              className={`flex items-center gap-2 p-2 rounded border-2 ${getColorClass(
                shardData.color
              )}`}
            >
              <Hexagon className="w-5 h-5" />
              <div className="flex-1">
                <div className="font-medium text-sm">{shardData.name}</div>
                <div className="text-xs">{shardData.description}</div>
              </div>

              <button
                onClick={() => removeShard(index)}
                className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
