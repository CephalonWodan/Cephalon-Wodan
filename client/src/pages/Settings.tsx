import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <Layout title="PARAMÈTRES">
      <div className="max-w-lg">
        <div className="wf-panel rounded-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon size={20} style={{ color: "var(--wf-cyan)" }} />
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>
              Préférences de l'application
            </h2>
          </div>
          <div className="space-y-4">
            {[
              { label: "Langue", value: "Français" },
              { label: "Thème", value: "Tenno Codex (Sombre)" },
              { label: "Rang de Maîtrise", value: "Non défini" },
              { label: "Plateforme", value: "PC" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--wf-border)" }}>
                <span className="text-sm" style={{ color: "var(--wf-text-dim)" }}>{label}</span>
                <button onClick={() => toast.info("Paramètre bientôt modifiable !")}
                  className="text-sm font-semibold" style={{ color: "var(--wf-cyan)", fontFamily: "var(--font-display)" }}>
                  {value}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

