# Lumière magique ✨

Une petite application web (PWA) toute simple pour un tout-petit : on touche
l'écran et une lumière colorée s'allume ; on glisse le doigt et une traînée
lumineuse et joyeuse suit le mouvement, avec un petit son doux.

- **Multi-doigts** : chaque doigt a sa propre couleur.
- **Plein écran**, fond sombre pour que les couleurs éclatent.
- **Son doux** (gamme pentatonique, tout sonne juste) sans aucun fichier externe.
- **Hors-ligne** : fonctionne sans connexion une fois chargée (service worker).
- **Installable** sur l'écran d'accueil du téléphone (manifest PWA).

## Essayer en local

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000 dans un navigateur.

## Installer sur le téléphone

Ouvre l'URL GitHub Pages dans Safari (iPhone) ou Chrome (Android), puis
« Ajouter à l'écran d'accueil ». L'app s'ouvre alors en plein écran comme une
vraie application.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Page et styles |
| `app.js` | Logique : glow, traînée, son, tactile |
| `manifest.json` | Métadonnées PWA |
| `sw.js` | Service worker (mode hors-ligne) |
| `icons/` | Icônes de l'application |

## Idées pour plus tard

- Bulles ou éléments à faire éclater en les touchant.
- Choix de thèmes de couleurs.
- Formes / animaux qui apparaissent.

---

Fait avec [Claude Code](https://claude.com/claude-code).
