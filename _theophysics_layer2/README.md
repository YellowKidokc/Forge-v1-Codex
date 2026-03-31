# Theophysics Engine — Layer 2 Files

Copy these files into your `theophysics-engine` repo:

```
_theophysics_layer2/client/src/App.tsx                          -> client/src/App.tsx
_theophysics_layer2/client/src/pages/CommandCenter.tsx           -> client/src/pages/CommandCenter.tsx
_theophysics_layer2/client/src/components/boxes/BoxLayout.tsx    -> client/src/components/boxes/BoxLayout.tsx
_theophysics_layer2/client/src/components/boxes/KnowledgeGraph.tsx -> client/src/components/boxes/KnowledgeGraph.tsx
_theophysics_layer2/client/src/components/boxes/SevenQDeep.tsx   -> client/src/components/boxes/SevenQDeep.tsx
_theophysics_layer2/client/src/components/boxes/SevenQRail.tsx   -> client/src/components/boxes/SevenQRail.tsx
_theophysics_layer2/server/routes.ts                            -> server/routes.ts
_theophysics_layer2/server/storage.ts                           -> server/storage.ts
```

Then:
```bash
cd theophysics-engine
git checkout -b layer-2-command-center
# copy files to correct locations
git add -A
git commit -m "Layer 2: CommandCenter workspace with live API, graph, and AI chat"
git push -u origin layer-2-command-center
```
