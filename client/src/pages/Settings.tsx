import Layout from "@/components/Layout";
import { Settings as SettingsIcon, Globe, Palette, Shield, Cpu } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <Layout title={t("PARAMÈTRES // PRÉFÉRENCES", "SETTINGS // PREFERENCES")}>
      <div className="max-w-xl space-y-6">
        <div className="wf-panel rounded-sm p-6" style={{ backgroundColor: "var(--wf-bg-panel)", border: "1px solid var(--wf-border)" }}>
          <div className="flex items-center gap-3 mb-6 pb-3 border-b" style={{ borderColor: "var(--wf-border)" }}>
            <SettingsIcon size={20} style={{ color: "var(--wf-cyan)" }} />
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wf-text)" }}>
              {t("Préférences de l'application", "Application Preferences")}
            </h2>
          </div>
          <div className="space-y-5">
            {/* Language Setting */}
            <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--wf-border)" }}>
              <div className="flex items-center gap-2">
                <Globe size={16} style={{ color: "var(--wf-cyan)" }} />
                <div>
                  <div className="text-sm font-bold" style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>{t("Langue de l'interface", "Interface Language")}</div>
                  <div className="text-xs text-gray-400">{t("Basculer instantanément entre Français et Anglais", "Switch instantly between French and English")}</div>
                </div>
              </div>
              <div className="flex gap-1 bg-black/40 p-1 rounded-sm border" style={{ borderColor: "var(--wf-border)" }}>
                <button
                  onClick={() => { setLanguage("fr"); toast.success("Langue définie sur Français"); }}
                  className={`px-3 py-1 text-xs font-bold rounded-sm uppercase ${language === "fr" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400" : "text-gray-400 hover:text-white"}`}
                >
                  FR
                </button>
                <button
                  onClick={() => { setLanguage("en"); toast.success("Language set to English"); }}
                  className={`px-3 py-1 text-xs font-bold rounded-sm uppercase ${language === "en" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400" : "text-gray-400 hover:text-white"}`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Theme Setting */}
            <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--wf-border)" }}>
              <div className="flex items-center gap-2">
                <Palette size={16} style={{ color: "var(--wf-cyan)" }} />
                <div>
                  <div className="text-sm font-bold" style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>{t("Thème HUD", "HUD Theme")}</div>
                  <div className="text-xs text-gray-400">{t("Style visuel Tenno Codex", "Tenno Codex visual style")}</div>
                </div>
              </div>
              <button
                onClick={() => toast.info(t("Thème Tenno Codex actif par défaut", "Tenno Codex theme active by default"))}
                className="px-3 py-1.5 rounded-sm text-xs font-mono bg-cyan-500/10 border border-cyan-400/40 text-cyan-300"
              >
                Tenno Codex (Dark)
              </button>
            </div>

            {/* Platform & Mastery Info */}
            <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--wf-border)" }}>
              <div className="flex items-center gap-2">
                <Shield size={16} style={{ color: "var(--wf-cyan)" }} />
                <div>
                  <div className="text-sm font-bold" style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>{t("Plateforme de jeu", "Gaming Platform")}</div>
                  <div className="text-xs text-gray-400">{t("Profil de synchronisation cross-save", "Cross-save sync profile")}</div>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-1 bg-black/40 border border-white/10 text-cyan-400">PC / Cross-Save</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Cpu size={16} style={{ color: "var(--wf-cyan)" }} />
                <div>
                  <div className="text-sm font-bold" style={{ color: "var(--wf-text)", fontFamily: "var(--font-display)" }}>{t("Moteur de calcul", "Calculation Engine")}</div>
                  <div className="text-xs text-gray-400">{t("Conforme aux règles officielles du Wiki Warframe", "Compliant with official Warframe Wiki rules")}</div>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-1 bg-black/40 border border-white/10 text-emerald-400">v1.0.0 Online</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
