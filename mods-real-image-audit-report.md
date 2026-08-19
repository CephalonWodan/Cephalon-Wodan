# Audit des vrais visuels de mods

## Conclusion opérationnelle

La première vérification comptait une URL ou une icône de secours comme une image valide. Cette méthode ne permettait pas de distinguer une véritable carte de mod de l’icône générique affichée dans la capture utilisateur. Un nouvel audit a donc testé les fichiers média réels.

**36 mods ont été corrigés** : neuf visibles dans la capture et vingt-sept dont l’ancienne URL Wiki répondait réellement en 404. Les nouveaux liens utilisent les noms de fichiers renvoyés par l’API WarframeStat et le CDN WFCD, ou la vraie image Wiki lorsqu’elle n’existe pas dans le CDN. Les **36 URLs corrigées répondent maintenant en HTTP 200 avec un type `image/*`**.

Les délais observés sur certaines requêtes Wiki ne sont pas comptés comme des 404 : ils indiquent une lenteur réseau du serveur Wiki, et le résolveur conserve le CDN/API comme source prioritaire lorsque cette source est disponible.

## Mods corrigés

| Mod | Fichier officiel utilisé | Source |
|---|---|---|
| Calm & Frenzy | `YinYangTargetAugmentCard.jpg` | CDN WarframeStat |
| Carnis Carapace | `AshenCarapace.jpg` | CDN WarframeStat |
| Cataclysmic Continuum | `LimboCataclysmAugment.jpg` | CDN WarframeStat |
| Cataclysmic Gate | `WispSunAugmentCard.jpg` | CDN WarframeStat |
| Catalyzer Link | `StatusChanceWhileAimingMods.jpg` | CDN WarframeStat |
| Calculated Victory | `RestoreShieldOnKillPistolMod.jpg` | CDN WarframeStat |
| Carnis Stinger | `AshenStinger.jpg` | CDN WarframeStat |
| Carnis Mandible | `AshenMandible.jpg` | CDN WarframeStat |
| Carving Mantis | `DualSwordCmbThree.jpg` | CDN WarframeStat |
| Catalyzing Shields | `FixedShieldAndShieldGatingDuration.jpg` | CDN WarframeStat |
| Cathode Current | `GyreEnergizedAugment.jpg` | CDN WarframeStat |
| Champion’s Blessing | `TrinityBlessingAugment.jpg` | CDN WarframeStat |
| Chaos Sphere | `NyxChaosAugment.jpg` | CDN WarframeStat |
| Diamond Skin | `AvatarDamageResistanceLaser.jpg` | CDN WarframeStat |
| Lightning Rod | `AvatarDamageResistanceElectricity.jpg` | CDN WarframeStat |
| Master Thief | `AvatarChanceToLootMod.jpg` | CDN WarframeStat |
| Primed Fast Deflection | `ShieldRechargeRate.jpg` | CDN WarframeStat |
| Primed Redirection | `ShieldMaxMod.jpg` | CDN WarframeStat |
| Push & Pull | `EquinoxSwitchAugment.jpg` | CDN WarframeStat |
| Pyroclastic Flow | `NezhaFirewalkerAugment.jpg` | CDN WarframeStat |
| Quick Charge | `PowerShields.jpg` | CDN WarframeStat |
| Quick Thinking | `AvatarQuickThinkingMod.jpg` | CDN WarframeStat |
| Radiant Finish | `ExcaliburRadialBlindAugment.jpg` | CDN WarframeStat |
| Razor Mortar | `SentientWhirlwindAugmentCard.jpg` | CDN WarframeStat |
| Razorwing Blitz | `TitaniaFlightAugment.jpg` | CDN WarframeStat |
| Recharge Barrier | `VoltShieldPvPAugment.jpg` | CDN WarframeStat |
| Resilient Focus | `ArmourMod.jpg` | CDN WarframeStat |
| Scan Aquatic Lifeforms | `ScanAquaticLifeformsMod.png` | Wiki Warframe |
| Shock Absorbers | `ShockAbsorbersMod.jpg` | CDN WarframeStat |
| Vampiric Grasp | `XakuGraspAugment.jpg` | CDN WarframeStat |
| Warm Coat | `AvatarMissionSpecificResistanceIce.jpg` | CDN WarframeStat |
| Cautious Shot | `WeaponResistSelfDamageMod.jpg` | CDN WarframeStat |
| Charged Chamber | `RifleChargedChamberMod.jpg` | CDN WarframeStat |
| Sniper Ammo Mutation | `SniperAmmoMutatorMod.jpg` | CDN WarframeStat |
| Reflex Coil | `MeleeChargeRateMod.jpg` | CDN WarframeStat |
| Radon Claws | `KubrowRadiationEventMeleeMod.jpg` | CDN WarframeStat |

## État après correction

Les neuf cartes visibles dans la capture — notamment **Calm & Frenzy**, **Carnis Carapace**, **Carnis Stinger**, **Carnis Mandible**, **Cataclysmic Continuum**, **Cataclysmic Gate**, **Catalyzer Link**, **Carving Mantis** et **Calculated Victory** — utilisent maintenant de vraies cartes officielles. Le cas **Scan Aquatic Lifeforms** a été vérifié directement sur sa page Wiki officielle, qui expose bien `ScanAquaticLifeformsMod.png`.

Les contrôles `pnpm check` et `pnpm build` sont réussis. Le rapport de validation machine est conservé dans `mods-corrected-image-audit.json`.

## Références

[1]: https://api.warframestat.us/ "WarframeStat.us Items API"
[2]: https://cdn.warframestat.us/img/ "CDN WarframeStat / WFCD"
[3]: https://wiki.warframe.com/w/Scan_Aquatic_Lifeforms "Page officielle Wiki de Scan Aquatic Lifeforms"
