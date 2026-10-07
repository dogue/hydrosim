# Project: Interactive Hydraulic Circuit Simulator

## Mission

Build a complete, usable, browser-based hydraulic circuit simulator intended primarily as an educational visualization tool.

The user must be able to:

- drag hydraulic components onto a schematic canvas
- arrange components freely
- connect component ports with hydraulic lines
- operate adjustable or actuated components
- see pressure and flow values change in real time
- visually follow oil flow through the circuit
- observe simple actuator behavior
- inspect pressure and flow using pressure taps and inline flow meters
- change component labels and adjustable properties
- change simulation speed

The primary goal is to make hydraulic behavior understandable visually.

Prefer a clear, stable, educational approximation over an engineering-grade hydraulic solver.

Do not turn this into a CAD system, finite-element simulation, CFD package, or professional hydraulic design tool.

The finished application should feel like an interactive hydraulic training schematic.

---

# Product Priorities

In descending order:

1. The circuit must be interactive.
2. Oil flow must be visually understandable.
3. Pressure and flow values must react sensibly to user actions.
4. Components must use recognizable ISO fluid-power schematic symbols.
5. Building and editing circuits must feel straightforward.
6. The simulator must remain robust when circuits are incomplete or incorrectly connected.
7. Numerical accuracy only needs to be plausible enough for education.
8. Visual polish is desirable, but never at the expense of simulation behavior.

A simplified model that clearly demonstrates hydraulic relationships is preferable to a sophisticated model that is fragile or confusing.

---

# Technical Direction

Build a client-only single-page web application.

For a new/empty repository, use:

- TypeScript
- React
- Vite
- SVG for the schematic canvas, symbols, ports, lines, overlays, and animated flow visualization

Keep dependencies modest.

Do not add:

- a backend
- authentication
- accounts
- cloud storage
- databases
- server-side rendering
- external APIs
- telemetry
- paid services

The completed production build must be deployable as static files.

Use browser-local state only. Local persistence is optional and should only be implemented after the core simulator works.

Prefer straightforward code and explicit data structures over excessive abstraction.

Separate the hydraulic simulation model from rendering/UI state sufficiently that simulation behavior can be tested without the browser UI.

---

# Standards and Visual Language

## Hydraulic symbols

Base component symbols on ISO 1219-1 fluid-power graphical conventions.

Exact drafting-standard perfection is not required, but symbols should be immediately recognizable to someone accustomed to hydraulic schematics.

Use conventional port labels where applicable:

- P — pressure/supply
- T — tank/return
- A — work port
- B — work port
- X — external pilot
- Y — drain

Other labels may be used where conventional and useful.

Symbols should remain legible while zoomed.

Use crisp SVG geometry rather than bitmap representations.

## Connection conventions

Working lines should normally be solid.

Pilot and drain connections should be visually distinguishable using appropriate dashed/dotted conventions where relevant.

Crossing lines are not connected unless a junction is explicitly present.

Connected junctions should have a visible junction dot.

Do not infer a connection merely because two lines visually cross.

---

# Dynamic Hydraulic Color Coding

Color lines according to their current simulated function.

Use this instructional hydraulic color convention:

- Red — pressurized supply / working pressure
- Blue — return / exhaust flow toward reservoir
- Green — pump intake, suction, or drain flow
- Yellow — metered / restricted flow
- Orange — pilot or reduced-pressure flow
- Gray — inactive, unpressurized, disconnected, or no meaningful flow

If intensified pressure is ever implemented, use violet/purple.

These colors describe the current simulated state. A line may therefore change color while the circuit operates.

Do not rely on color alone. Flow direction and state should also be understandable through animation and/or directional indicators.

---

# Main Interface

Use a desktop-oriented engineering-tool layout.

Recommended structure:

- top toolbar
- component palette on the left
- large schematic workspace in the center
- selected-component inspector/control panel on the right

The workspace should consume most of the screen.

## Top toolbar

Include:

- Run / Pause
- Reset simulation
- Clear circuit
- simulation speed control
- zoom controls if useful
- Load Example / Demo Circuit if practical

Simulation speed should support approximately:

- 0.25×
- 0.5×
- 1×
- 2×
- 4×

A continuous slider is also acceptable.

Simulation speed affects time-dependent behavior such as actuator motion and animated flow.

It should not arbitrarily multiply displayed steady-state pressure or flow values.

---

# Schematic Workspace

The central workspace must support:

- drag/drop placement from component palette
- selecting components
- moving existing components
- deleting components
- connecting ports
- deleting connections
- automatic line updating when components move
- zooming
- panning
- reasonable grid snapping
- custom component labels

Prefer a subtle engineering-paper/grid appearance.

Keep visual clutter low.

A selected component should have an obvious but restrained selection indicator.

Ports should be easy to identify and connect without dominating the schematic.

When a component is being moved, connected lines must remain attached.

---

# Making Connections

Users should create a hydraulic connection by dragging from one component port to another.

During connection creation:

- highlight the source port
- show the proposed line
- highlight compatible target ports
- provide obvious feedback when a connection is valid

Prefer orthogonal or mostly orthogonal hydraulic lines.

Perfect automatic schematic routing is not required.

Do not spend excessive development effort on sophisticated routing.

Connections must remain readable and editable.

---

# Component Inspector

Selecting a component opens its inspector.

Every component inspector must show:

- component type
- editable custom label
- live values relevant to the component
- adjustable parameters relevant to the component
- operating controls where applicable

Controls must have visible text labels. Do not rely on unlabeled icon buttons.

Examples:

Pump:

- Label
- Displacement/flow setting
- maximum pressure if applicable
- running/stopped toggle

Relief valve:

- Label
- cracking/relief pressure

Flow control:

- Label
- flow setting or restriction

Directional valve:

- Label
- spool position
- momentary/manual actuator controls where appropriate

Cylinder:

- Label
- bore
- rod diameter
- stroke
- load
- live extension
- live speed
- chamber pressures

Hydraulic motor:

- Label
- displacement
- load
- live speed
- pressure differential
- live flow

Accumulator:

- Label
- precharge
- capacity
- current approximate charge state

Pressure tap:

- Label
- live pressure

Flow meter:

- Label
- live flow
- flow direction

---

# Required Component Library

The first complete version must provide enough components to construct meaningful basic hydraulic circuits.

## Sources and storage

Implement:

- reservoir / tank
- fixed-displacement pump
- adjustable or variable-flow pump
- accumulator

## Actuators

Implement:

- single-acting cylinder
- double-acting cylinder
- hydraulic motor

Cylinders should visibly animate their rod position during simulation.

The motor symbol should provide a simple visual indication of rotation when operating.

## Directional control valves

At minimum implement useful representatives of:

- 2/2 valve
- 3/2 valve
- 4/2 valve
- 4/3 valve

The 4/3 valve is particularly important.

Provide at least these useful center conditions where relevant:

- closed center
- open center
- tandem center
- float center

Do not attempt to implement every possible ISO spool configuration.

Valves should expose obvious user-operable controls.

Where appropriate, controls may behave as spring-return momentary controls.

The schematic symbol must visibly change or highlight according to the active spool position.

## Pressure control valves

Implement:

- pressure relief valve
- pressure reducing valve
- sequence valve if practical

The relief valve is required and must participate in simulation behavior.

## Flow control

Implement:

- fixed restriction / orifice
- adjustable flow control
- one-way flow control if practical

## Check valves

Implement:

- check valve
- pilot-operated check valve if practical

## Conditioning

Implement:

- filter

Additional conditioning components such as coolers may be included if inexpensive to implement, but they are not priorities.

## Instrumentation

Implement:

- pressure gauge / pressure tap
- inline flow meter

Instrumentation is required.

A pressure tap connected to a circuit must display current PSI.

An inline flow meter must display current GPM and, when meaningful, flow direction.

## Utility components

Implement:

- junction / tee
- capped or blocked port where useful

---

# Units and Numeric Display

Use US customary hydraulic units throughout the application.

Primary units:

- pressure: PSI
- flow: GPM
- dimensions: inches
- force/load: lbf
- cylinder velocity: in/s
- motor speed: RPM
- displacement where needed: in³/rev

All displayed pressure and flow values must be rounded to the nearest 0.1.

Examples:

- 2,435.7 PSI
- 12.4 GPM
- 0.0 GPM

Do not display long floating-point tails.

Internal calculations may use greater precision.

---

# Simulation Philosophy

This simulator is educational rather than engineering-certified.

The simulation should capture relationships such as:

- pumps produce flow
- loads create pressure demand
- restrictions produce pressure drop
- flow controls reduce actuator speed
- relief valves limit system pressure
- blocked flow causes pressure to rise
- open paths to tank generally produce low pressure
- directional valves redirect flow
- cylinders move according to incoming flow
- cylinder force depends on pressure and effective piston area
- rod-side and cap-side cylinder areas differ
- motors rotate when sufficient flow reaches them
- return oil travels back toward tank
- multiple branches share available pump flow
- an actuator at its mechanical limit effectively becomes a blocked load
- a check valve allows flow in one direction and blocks it in the other

These relationships matter more than high-fidelity fluid dynamics.

---

# Simulation Model

Implement the hydraulic circuit as a graph.

Conceptually:

- component ports are graph terminals
- hoses/lines connect terminals
- each component defines which internal ports are connected in its current state
- valves change those internal connections
- restrictions affect available flow
- sources introduce flow
- reservoirs provide the return reference
- loads create pressure demand

Keep the solver deterministic.

The simulator must tolerate:

- disconnected ports
- incomplete circuits
- dead-headed pumps
- multiple tanks
- loops
- isolated circuit sections
- components being removed during simulation

No user action should produce NaN, Infinity, runaway animation, or application crashes.

---

# Simplified Hydraulic Behavior

Use a quasi-steady-state hydraulic model updated repeatedly during simulation.

Do not implement compressible-fluid CFD.

Do not simulate hose elasticity, fluid temperature, detailed leakage, Reynolds number, or transient pressure-wave behavior unless trivial.

## Reservoir

Treat reservoir pressure as approximately:

0 PSI gauge.

Lines connected to the reservoir should generally represent low-pressure return or suction paths depending on flow direction.

## Pump

A pump should primarily be modeled as a flow source.

Its configured flow represents available GPM.

Pressure should rise only as necessary to overcome:

- actuator loads
- component restrictions
- closed paths
- pressure-control valve settings

Pressure is not simply "created" because a pump exists.

A dead-headed pump should cause system pressure to rise until limited by a relief valve or configured maximum pressure.

## Relief valve

The relief valve must open when upstream pressure exceeds its setting.

When open:

- it provides a path toward tank
- system pressure should remain approximately near the relief setting
- excess pump flow should pass through the relief path
- the relief path should visibly show active flow

This behavior should be obvious in the demonstration circuit.

## Restrictions

Restrictions and flow-control valves should create an approximate pressure differential when flowing.

Exact orifice equations are not required.

The relationship should be monotonic and intuitive:

- more restriction → less flow
- more restriction at the same flow → greater pressure drop

Avoid unstable numerical behavior.

## Branching circuits

When flow encounters multiple available branches, distribute available pump flow according to their relative demand/restriction.

The exact engineering solution is not important.

The result should behave sensibly:

- a nearly unrestricted branch tends to take more flow
- a restricted branch tends to take less
- explicit flow controls should strongly influence their branch
- total branch flow should not exceed available source flow

## Cylinder force and load

Use conventional piston-area relationships.

Approximate available cylinder force from:

pressure × effective area.

For extension, use cap-end piston area.

For retraction, use annular area after subtracting rod area.

A cylinder should not move if available hydraulic force is insufficient to overcome its configured load.

Once enough pressure exists, incoming flow determines cylinder speed.

Use the normal hydraulic conversion between GPM and cubic inches per second so cylinder speed remains intuitive.

When a cylinder reaches full extension or full retraction:

- stop motion
- treat further commanded flow as blocked
- allow upstream pressure to rise
- allow the relief valve to open if appropriate

## Hydraulic motor

Approximate motor speed primarily from:

flow / displacement.

Use pressure differential and configured load to determine whether the motor can rotate.

High fidelity motor efficiency calculations are unnecessary.

## Accumulator

Use a deliberately simplified accumulator model.

It should be able to:

- accept flow while system pressure rises
- store an approximate charge state
- return some flow when upstream supply falls below accumulator pressure

Do not let accumulator mathematics dominate the project.

---

# Pressure and Flow Propagation

Every connected hydraulic line should have live values for:

- approximate pressure
- approximate flow magnitude
- flow direction
- functional/color classification

Update these as the simulation runs.

Pressure taps and flow meters should read these same calculated values rather than maintaining independent fake values.

Component inspector readings and line visualization must derive from the common simulation state.

---

# Flow Visualization

Flow should be understandable without reading numbers.

Active connections should display subtle moving directional markers, dashes, dots, or arrows.

Animation direction must match simulated fluid direction.

Animation speed may loosely correspond to flow magnitude.

Do not create distracting particle effects.

At zero or negligible flow:

- movement should stop
- the line may remain colored if pressurized
- the distinction between "pressurized but static" and "actively flowing" should be visually apparent

This distinction is important.

A blocked red pressure line must not look identical to a red line carrying significant flow.

---

# Component State Visualization

Interactive component symbols should communicate their current operating state.

Examples:

- directional valve shows current spool position
- relief valve indicates when relieving
- flow control indicates current setting
- check valve indicates whether flow is passing or blocked
- cylinder rod physically moves
- motor indicates rotation
- pump indicates running/stopped
- accumulator indicates approximate charge

Keep symbols recognizably schematic rather than turning them into pictorial machine components.

---

# Labels

Every placed component must support a custom text label.

Provide a sensible generated default such as:

- P1
- T1
- RV1
- FC1
- DCV1
- CYL1
- M1
- PT1
- FM1

The user may replace the generated label with arbitrary text.

Display labels near components without obscuring their symbols or ports.

---

# Editing Behavior

Support common editing operations.

At minimum:

- click to select
- drag to move
- Delete/Backspace to remove selected item
- Escape to cancel an in-progress connection or interaction
- click empty canvas to deselect

Undo/redo is desirable if inexpensive but is secondary to simulation functionality.

Do not sacrifice required simulation behavior to implement a complex command-history system.

---

# Example Circuit

Include a one-click demonstration circuit.

The example should contain approximately:

- reservoir
- pump
- pressure relief valve
- 4/3 directional control valve
- double-acting cylinder
- adjustable flow control
- pressure tap
- inline flow meter

It should demonstrate the simulator immediately without requiring the user to construct a circuit first.

The example must allow the user to:

1. start the pump
2. shift the directional valve
3. extend the cylinder
4. return oil to tank
5. reverse the valve
6. retract the cylinder
7. adjust the flow control and see cylinder speed change
8. watch the flow-meter value change
9. watch pressure values change with load
10. dead-head the actuator at end of stroke and observe the relief valve open

This circuit is an important acceptance test.

---

# Visual Design

Aim for the appearance of a modern technical training instrument.

Use:

- neutral background
- subtle grid
- high-contrast schematic symbols
- restrained interface chrome
- readable typography
- strong hydraulic state colors

Avoid:

- gradients for decoration
- glassmorphism
- oversized cards
- excessive rounded UI
- cartoon machinery
- decorative animations
- dashboard-style KPI tiles
- unnecessarily large headings

The hydraulic schematic should be the visual focus.

Desktop usability is the priority.

The application should still avoid completely breaking on smaller screens.

---

# Tooltips and Educational Information

Where useful, provide concise tooltips or small explanatory text.

Examples:

- component name
- port meaning
- current PSI
- current GPM
- current valve state

Do not turn the application into a textbook.

The schematic itself should teach primarily through interaction and visualization.

---

# Error Handling

Incomplete or invalid circuits are normal during editing.

Do not interrupt the user with modal error dialogs simply because:

- a port is disconnected
- a pump has no outlet path
- a cylinder has only one side connected
- an isolated line exists

Instead:

- simulate whatever can be simulated
- leave undefined/inactive sections visually inactive
- optionally show unobtrusive warnings

A malformed circuit must not crash the simulation.

---

# Performance

Typical educational circuits may contain dozens of components and connections.

Keep interaction smooth.

Do not prematurely optimize for enormous industrial drawings.

SVG is expected to be adequate for the intended circuit size.

Simulation updates and animations should stop or substantially reduce when the simulation is paused.

---

# Testing

At minimum, test the pure simulation behavior for:

- pump connected directly to tank
- dead-headed pump
- relief valve opening
- open versus closed directional valve path
- cylinder extension
- cylinder retraction
- cylinder reaching end of stroke
- insufficient pressure to move a loaded cylinder
- flow restriction reducing actuator speed
- check valve forward flow
- check valve reverse blocking
- pressure tap reading connected pressure
- flow meter reading connected flow
- disconnected network stability
- branch-flow conservation within the simplified model

Also verify:

- pressure and flow display with exactly one decimal place
- moving a component does not break its connections
- deleting components removes or safely invalidates associated connections
- changing valve state immediately updates the flow network
- simulation speed affects time-dependent motion
- pause stops actuator movement

Run the production build before considering the work complete.

If browser automation is already available or inexpensive to add, perform a smoke test of the demonstration circuit.

---

# Definition of Done

Do not stop after building static UI.

The project is complete only when all of the following are true:

- the application loads successfully
- a user can drag components onto the schematic
- components use recognizable fluid-power symbols
- components can be moved after placement
- ports can be connected interactively
- connections remain attached while components move
- components can be deleted
- custom component labels work
- the component inspector exposes relevant controls
- the pump can be started and stopped
- directional valves can be operated
- flow-control settings can be changed
- cylinders visibly move
- hydraulic motors can visibly operate
- pressure taps display live PSI
- inline flow meters display live GPM
- pressure and flow are rounded to 0.1
- line colors change according to simulated hydraulic state
- active flow direction is visible
- pressurized static oil is distinguishable from flowing oil
- a relief valve visibly responds to excessive pressure
- changing a restriction changes flow and actuator speed
- simulation speed is adjustable
- pause/resume works
- the example circuit demonstrates the core behavior
- malformed or incomplete circuits do not crash the app
- the production build succeeds

---

# Scope Discipline

Do not expand the project into:

- professional CAD
- hydraulic engineering certification software
- component-manufacturer selection software
- electrical control simulation
- PLC ladder logic
- pneumatic simulation
- hose sizing software
- thermal analysis
- fluid contamination analysis
- component databases
- collaborative editing
- cloud accounts
- multiplayer
- 3D visualization

Those are outside the goal.

If choosing between an additional feature and making the core hydraulic visualization clearer, improve the core visualization.

---

# Implementation Approach

Before editing:

1. inspect the repository
2. identify whether a usable application scaffold already exists
3. preserve existing repository conventions where sensible
4. formulate a concise implementation plan internally
5. then implement the application completely

Do not stop merely because the feature is large.

Do not leave major required systems represented by placeholder UI.

Do not replace simulation with hard-coded demonstration values.

Build the smallest coherent system that actually satisfies the product requirements.

When requirements are ambiguous, choose the behavior that makes the hydraulic relationship easiest for a learner to understand.

---

# Final Validation Scenario

Before declaring completion, load or construct this circuit:

Reservoir → Pump → 4/3 Directional Valve → Double-Acting Cylinder → Return to Reservoir

with:

- pressure relief valve from pressure supply to tank
- pressure tap on the pump pressure line
- inline flow meter in the supply path
- adjustable flow control in one actuator path

Verify all of the following:

### Neutral

- pump is running
- valve is centered
- line state reflects the selected center configuration
- pressure behaves appropriately
- cylinder remains stationary

### Extend

- valve shifts
- supply flow reaches the correct cylinder chamber
- supply path becomes pressure-colored
- return path is correctly identified
- flow direction is visible
- cylinder extends
- pressure tap displays sensible PSI
- flow meter displays sensible GPM

### Flow restriction

- reducing the flow-control setting reduces measured flow
- cylinder extension speed decreases
- appropriate metered-flow visualization appears

### End of stroke

- cylinder stops
- upstream pressure rises
- relief valve opens near its configured setting
- relief flow visibly returns toward tank
- cylinder remains stationary

### Retract

- reversing the directional valve reverses work-port flow
- cylinder retracts
- pressure/return visualization swaps appropriately
- displayed values respond accordingly

If this scenario does not work convincingly, the application is not finished.
