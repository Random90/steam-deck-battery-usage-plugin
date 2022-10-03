# Steam Deck Battery Usage Crankshaft Plugin

Better battery stats for Steam Deck.
Monitors battery usage since last charging. 
Might be useful for benchmarking battery usage of specific games.
Additionally, it shows some battery stats like capacity or energy rate. 


Work in progress, it shows time since last charging with 30 sec - few minutes accuracy during current discharge session or exact time until after plugging in the deck. Works only in crankshaft plugin menu. 
It doesn't include suspend time for the moment, but I'm close to working that out. 
Works only globally for now. 

## Instalation

Clone, install node.js, `npm run build` in the root, copy files from dist into new folder inside /plugins in crankshaft. 

## FUTURE TODOS
- local per game statistics
- usage graph
- database of avarage anonymous game statistics, so the plugin could show you predictable game time for each title. 
