/* css/mods_catalog.css */

/* Cartes plus “premium” avec halo doux au hover */
.mod-card {
  border: 1px solid rgba(255,255,255,.08);
  background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
  border-radius: 16px;
  transition: box-shadow .2s ease, transform .2s ease;
}
.mod-card:hover {
  box-shadow: 0 6px 28px rgba(212,175,55,.12);
  transform: translateY(-1px);
}

/* Image holder */
.mod-thumb {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 10px;
}

/* Clamp description sur 2 lignes */
.clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Badges */
.badge {
  display:inline-flex; align-items:center; gap:.375rem;
  border:1px solid rgba(255,255,255,.12);
  padding:.2rem .5rem; border-radius:999px; font-size:.75rem;
}
.badge.gold {
  border-color:#D4AF37; color:#D4AF37; background:rgba(212,175,55,.06);
}

/* Tableau : cellules */
table th, table td { border-bottom: 1px solid rgba(255,255,255,.06); }

/* Bouton actif */
.btn-tab.active { border-color:#D4AF37; color:#D4AF37; }
