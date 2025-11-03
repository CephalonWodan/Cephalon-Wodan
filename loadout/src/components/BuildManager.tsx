import { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { supabase, Build } from '../lib/supabase';

interface BuildManagerProps {
  build: Build;
  onSaved: () => void;
}

export function BuildManager({ build, onSaved }: BuildManagerProps) {
  const [buildName, setBuildName] = useState(build.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const saveBuild = async () => {
    if (!buildName.trim()) {
      setError('Veuillez entrer un nom pour votre build');
      return;
    }

    if (!build.warframe_id) {
      setError('Veuillez sélectionner une Warframe');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Vous devez être connecté pour sauvegarder un build');
        setSaving(false);
        return;
      }

      const buildData = {
        ...build,
        name: buildName,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      if (build.id) {
        const { error: updateError } = await supabase
          .from('builds')
          .update(buildData)
          .eq('id', build.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('builds')
          .insert([buildData]);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSaved();
    } catch (err) {
      console.error('Error saving build:', err);
      setError('Erreur lors de la sauvegarde. Vérifiez que vous êtes connecté.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Sauvegarder le Build</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom du Build
          </label>
          <input
            type="text"
            value={buildName}
            onChange={(e) => setBuildName(e.target.value)}
            placeholder="Mon build Excalibur"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Build sauvegardé avec succès!
          </div>
        )}

        <button
          onClick={saveBuild}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder le Build'}
        </button>

        <div className="text-xs text-gray-500 text-center">
          Note: Vous devez être connecté pour sauvegarder vos builds
        </div>
      </div>
    </div>
  );
}
