# PHYS 137T interactive demos

This directory is the source for the shared public demo collection:

- Hub: <https://mgrau.github.io/phys137t-demos/>
- Interference: <https://mgrau.github.io/phys137t-demos/interference/>
- Quantum jumps: <https://mgrau.github.io/phys137t-demos/quantum_jumps/>

Each demo remains an independent Svelte app. The root build compiles them into
separate static subfolders and adds the responsive selector at the site root.

```sh
npm run check
npm run build
npm run dev
./publish.sh
```

Add future demos as sibling folders and include their build output in
`scripts/build.sh` and their metadata in `hub/app.js` and `hub/index.html`.
