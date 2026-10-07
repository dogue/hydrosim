# HydroSim

A client-only hydraulic training schematic built with React, TypeScript, Vite, and SVG. The demo loads immediately; press **Run**, then **Extend** or **Retract** below DCV1. Select FC1 to adjust flow, CYL1 to adjust load, and RV1 to adjust relief pressure.

## Run

Use Node.js 22.18 or later.

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
```

The production application is in `dist/`. Host that directory on any static web server. No backend, accounts, external APIs, telemetry, or cloud services are used. Application state exists only in browser memory.

## Editing and operation

- Drag a library component onto the canvas, or click its library entry to place it.
- Drag from a port circle to another port to connect. Green target outlines indicate available hydraulic terminals.
- Drag a component to move it; its hoses follow. Click a hose or component to inspect it.
- Change labels and parameters in the inspector. Valve controls are available on the schematic and in the inspector. Pump start/stop is independent of simulation Run/Pause.
- Delete/Backspace removes the selected component or hose; Escape cancels a connection or drag. Click empty canvas to deselect.
- Drag empty canvas to pan, scroll to zoom, or use Fit circuit.
- Simulation speed changes actuator time and flow animation, without scaling steady pressure or flow.
- Moving white dots follow calculated flow direction. A colored hose without moving dots is pressurized static oil.

The library includes reservoirs, fixed and variable pumps, accumulators, single- and double-acting cylinders, motors, 2/2, 3/2, 4/2 and 4/3 valves, relief and reducing valves, restrictions, adjustable flow controls, check valves, filters, pressure taps, inline flow meters, junctions, and blocked ports. Four 4/3 center conditions are supported.

## Educational hydraulic model

`src/model.ts` is independent of React and the DOM. Ports are graph terminals, hoses are directed pairs of graph edges, and spool positions change internal passages. A deterministic, bounded traversal finds source-to-return paths. Pump pressure is balanced against path resistance, load thresholds, metering limits, relief settings, and source maximum pressure. Available flow is shared between paths; shared flow-control capacities are enforced across routes.

Cylinder thresholds use load divided by piston or annular area; motion uses the normal 231 in³/gallon conversion. Return flow changes with the chamber-area ratio. Stops block further motion and cause upstream pressure to rise and excess flow to pass through a relief path. Motor torque demand uses the ideal displacement relationship, and RPM follows flow/displacement. Single-acting cylinders have a simple load-driven return. Accumulators store a finite approximate oil volume and provide limited discharge when supply falls.

Pressure taps, flow meters, line colors, and component readings derive from this common simulation state. Hoses never connect merely because their drawings cross.

## Deliberate limits

This is a quasi-steady teaching model, not an engineering design or safety-analysis tool. Resistance is linearized, flow controls act as ideal approximate flow limits, and accumulator pressure rises linearly with charge. There are no fluid transients, temperature effects, elasticity, leakage, or efficiency maps. Highly interconnected or multiple-pump networks have approximate pressure sharing; traversal is capped to keep incomplete and cyclic circuits responsive. Routing uses orthogonal port stubs rather than obstacle avoidance. Symbols follow recognizable ISO fluid-power conventions without claiming exact drafting-standard compliance.

There is no persistence, undo/redo, circuit import/export, or mobile-first editing. Optional sequence valves, pilot-operated checks, and one-way flow controls are outside this first version.

## Validation

`npm test` runs pure simulation tests and React/DOM interaction tests. The latter operates the demo through its actual controls, exercises labels, component movement, port dragging, deletion, and palette drops, and writes `artifacts/demo-schematic.svg` and `artifacts/ui-snapshot.html` for inspection.

The acceptance sequence covers neutral, extend, reduced flow, end-of-stroke relief, retract, pump start/stop, and pause. Additional tests cover center configurations, branch conservation, checks, instrumentation, pressure reduction, accumulator storage/discharge, motor torque, single-acting return, malformed networks, speed scaling, and display formatting.

`npm run test:production` builds with the installed project dependencies and repeats the React/DOM interaction checks against the actual minified assets in `dist/`. This checks both demonstration circuits and the editor. Chromium startup is blocked by this environment's sandbox socket restrictions, so a full Chromium layout smoke test remains unverified.

The Vite configuration disables Rollup tree-shaking because Rollup 4.64 stalls analyzing this React 19 bundle. Production assets remain minified and self-contained; the measured bundle increase is approximately 0.5 KB (0.25 KB gzip). No alternate Vite installation or build command is required.

## Symbol conventions

The pressure-reducing valve has a normally open passage with a dashed control line sampled from downstream B. The relief valve has a normally closed passage, upstream A sensing, and an adjustable solid-line spring. The reducing model remains a simplified two-way valve without a separately simulated drain.

Directional valves show all switching positions; the selected box moves beneath the fixed port leads. Closed ports use termination bars, crossed work paths have no junction dots, and the four 4/3 centers have separate drawings matching their model connections. Manual levers match the retained-position operating controls. The 2/2 valve uses vertically arranged A/B ports; existing hoses follow those terminals automatically.

Motors use inward-pointing filled triangles for reversible hydraulic operation, pumps use outward-pointing triangles, and the gas accumulator is marked N₂ rather than a mechanical spring. Cylinder rods protrude through the rod-end seal at every position.

`npm run test:symbols` checks the pressure-sensing takeoffs, normal passages, spool alignment, blocked-port geometry, and actuator symbols. It exports `artifacts/symbol-review.svg` with every component and the directional-valve variants.

References: [HAWE pressure-reducing valve](https://www.hawe.com/en-us/fluid-lexicon/detail/pressure-reducing-valve-pressure-control-valve/) and [Festo hydraulic-symbol training material](https://media.festo.com/media/156205_documentation.pdf). The application uses ISO-style educational drawings, rather than claiming drafting-standard certification.

Variable pumps provide an X pilot input. With X connected, stroke follows a linear pressure command from zero at **Pilot start pressure** to full stroke at **Full stroke pilot pressure** (defaults: 0–500 PSI). Minimum stroke (default 10%, adjustable 0–100%) provides a lower bound so the pump can build pressure for its own pilot circuit. Setting it to zero requires an external pilot supply to start from rest. Available flow is the full-stroke flow. Unconnected X retains manual full-stroke operation. Pilot lines are dashed orange when pressurized. This is an ideal pressure command with negligible pilot consumption, rather than a detailed swashplate servo or automatic pressure compensator; control pressure is solved before actuator time advances.

Advanced valves are in **Compensation & load sensing**:

- **Shuttle:** A/B inlets, C outlet. Selects the higher pressure and blocks cross-feed; ties select A. Shuttle signal chains connected to X use orange dashed lines.
- **Two-way pressure compensator:** A → B flow, X load reference. Caps B at X plus the adjustable margin. Place it before a metering orifice and sense pressure after the orifice. An optional reverse check permits actuator return flow.
- **Compensated flow control:** a combined metering/compensator approximation. Holds the selected GPM when sufficient pressure and pump flow exist; output falls when pressure or flow is insufficient.
- **Load-sensing bypass regulator:** P → T bypass, X load reference. Diverts excess flow at approximately X plus the margin. This supports fixed-pump load sensing; it is not a variable-pump servo controller. Fit a separate safety relief.

**Load LS demo** loads a closed-center cylinder circuit with a shuttle sensing both chambers, a 200 PSI bypass margin, an upstream compensator, and a 3 GPM metering orifice. Run and extend, then change cylinder load: supply pressure follows the load while extension flow remains approximately 3 GPM. Changing OR1 nominal flow changes extension speed. At end stroke the safety relief opens. Retraction uses the compensator's reverse check; return oil passes through OR1, so this example compensates extension and has return backpressure during retraction.

Fixed orifices now use nominal GPM at an adjustable nominal pressure drop rather than an absolute flow cap. The educational model uses a linear pressure/flow curve. Compensation and pilot selection are bounded quasi-steady calculations, without spool inertia, leakage, pilot consumption, or detailed saturation/flow-sharing dynamics.

The advanced valve behavior follows the functional descriptions in HAWE's [individual pressure compensator](https://www.hawe.com/fluid-lexicon/detail/individual-pressure-compensator/) and [load-sensing system](https://www.hawe.com/fi-fi/fluid-lexicon/load-sensing-system/) references.
