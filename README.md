# Clearview

Clearview is a modern web application framework for performant, interactive 3D experiences in the browser. Built with Angular, TypeScript, and Babylon.js, it provides a modular engine for rendering, lighting, sky, and atmospheric effects, making it easy to develop immersive 3D web apps.

---

## Project Structure

```
src/
├── index.html
├── main.ts
├── styles.less
├── app/
│   ├── app.component.*
│   ├── app.config.ts
│   ├── app.routes.ts
│   ├── components/
│   │   └── clearview/
│   │       └── viewport/
│   ├── engine/
│   │   ├── base/
│   │   │   └── scene.ts
│   │   ├── core/
│   │   │   ├── engine.service.ts
│   │   │   └── scene-manager.service.ts
│   │   ├── material/
│   │   │   └── material.service.ts
│   │   ├── physics/
│   │   │   └── time.service.ts
│   │   ├── player/
│   │   │   └── camera.service.ts
│   │   ├── scenes/
│   │   │   └── scene001.scene.ts
│   │   ├── shaders/
│   │   │   ├── enhancedSky.fragment.ts
│   │   │   └── enhancedSky.vertex.ts
│   │   └── world/
│   │       ├── atmosphere.service.ts
│   │       ├── celestial.service.ts
│   │       ├── light.service.ts
│   │       ├── sky.service.ts
│   │       └── terrain.service.ts
│   └── pages/
│       ├── about/
│       ├── demo/
│       │   └── clearview/
│       └── home/
```

---

## Key Files and Folders in `src`

### Root Files

- **index.html**: Main HTML entry point for the Angular app.
- **main.ts**: Bootstraps the Angular application.
- **styles.less**: Global styles and theme variables.

---

### `app/` — Main Application Code

#### Core Angular

- **app.component.ts / .html / .less**: Root Angular component and styles.
- **app.config.ts**: Application-wide configuration.
- **app.routes.ts**: Angular route definitions.

#### Components

- **components/clearview/viewport/**: Contains the `ViewportComponent`, which initializes the Babylon.js engine and loads the main 3D scene into a canvas.

#### Pages

- **pages/home/**: Home page with project introduction and navigation.
- **pages/about/**: About page describing project goals and technology.
- **pages/demo/clearview/**: Demo page embedding the 3D viewport.

---

### `engine/` — The 3D Engine

The `engine` folder contains all logic for rendering, simulation, and scene management. It is organized into several submodules:

#### `base/`

- **scene.ts**: Defines the abstract `BaseScene` class. All scenes inherit from this, implementing `init`, `update`, and `dispose` methods for lifecycle management.

#### `core/`

- **engine.service.ts**: Wraps Babylon.js's `Engine` object, handling WebGL context creation and access.
- **scene-manager.service.ts**: Loads, initializes, and manages scenes. Handles the render loop and scene switching.

#### `material/`

- **material.service.ts**: Utilities for creating and applying Babylon.js PBR and standard materials, including texture loading and tiling.

#### `physics/`

- Time and later physics belong here.

#### `scenes/`

- **scene001.scene.ts**: Example scene implementation. Sets up camera, lighting, terrain, sky, and atmosphere. Calls update methods for all engine subsystems each frame.

#### `shaders/`

- Custom GLSL fragment and vertex shaders for rendering a physically-based sky dome, including sun, moon, stars, and atmospheric scattering.

#### `world/`

- **atmosphere.service.ts**: Calculates and applies fog color/density based on time of day and sky conditions.
- **celestial.service.ts**: Computes sun/moon positions, intensities, and visibility for the current world time.
- **light.service.ts**: Manages Babylon.js lights (sun, moon, ambient), updates their properties, and computes sky colors for smooth day/night transitions.
- **sky.service.ts**: Creates and updates the sky dome mesh and material, passing celestial data and time to the sky shader.

---

## Engine Workflow

1. **Initialization**:  
   - The `ViewportComponent` creates the Babylon.js engine and loads the main scene (`Scene001`).
   - `Scene001` sets up camera, lighting, terrain, sky, and atmosphere.

2. **Render Loop**:  
   - The `SceneManagerService` runs the render loop.
   - Each frame, the following update order is used:
     1. **TimeService**: Advances world time.
     2. **CelestialService**: Updates sun/moon positions and visibility.
     3. **LightService**: Updates light directions, intensities, and sky color transitions.
     4. **SkyService**: Updates the sky dome shader uniforms.
     5. **AtmosphereService**: Updates fog color/density for the scene.

3. **Sky & Lighting**:  
   - The sky dome is rendered with a custom shader, blending colors and effects based on time of day and celestial positions.
   - Lighting and fog are smoothly transitioned for realism.

---

## Extending the Engine

- **Add new scenes**: Inherit from `BaseScene` and implement the required methods.
- **Add new materials**: Use `MaterialService` to define and apply new PBR or standard materials.
- **Customize sky/atmosphere**: Modify the shaders or the services in `world/` for different visual effects.

---

## Summary

Clearview's `src/app/engine` folder is the heart of the project, providing a modular, extensible 3D engine built on Babylon.js. Its architecture separates scene management, rendering, materials, sky, lighting, and atmospheric effects, making it easy to build and extend high-performance 3D web applications.

---