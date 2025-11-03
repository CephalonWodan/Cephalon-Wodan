import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// Widget to display a summary of the current worldstate. It shows the
// active fissures (first few) with their tier, mission type/node and ETA.
export default function WorldstateWidget() {
  const [ws, setWs] = useState<any | null>(null);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await api.worldstate('pc');
        if (!cancel) setWs(data);
      } catch (e: any) {
        if (!cancel)
          setErr(e?.message || 'Erreur lors du chargement du worldstate');
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (err) {
    return (
      <div className="text-red-500 text-sm p-4">
        Worldstate indisponible&nbsp;: {err}
      </div>
    );
  }
  if (!ws) {
    return (
      <div className="text-gray-500 text-sm p-4">Chargement du worldstate…</div>
    );
  }
  const fissures = ws?.fissures || ws?.Fissures || [];
  return (
    <div className="rounded-lg border border-gray-200 p-4 mt-4">
      <div className="font-semibold mb-2 text-lg">Fissures actuelles</div>
      {fissures.length === 0 ? (
        <div>Aucune fissure en cours</div>
      ) : (
        <ul className="space-y-1">
          {fissures.slice(0, 6).map((f: any, i: number) => (
            <li
              key={i}
              className="flex items-center text-sm justify-between border-b border-gray-100 py-1"
            >
              <span className="font-mono px-2 py-0.5 rounded bg-gray-100">
                {f.tier || f.tierNum || '?'}
              </span>
              <span className="flex-1 ml-2">
                {f.node || f.missionType || ''}
              </span>
              <span className="opacity-60 ml-2">
                {f.eta || f.expiry || ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}