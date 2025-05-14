# Clearview

Clearview is a modern web application framework for building high-performance, interactive 3D experiences in the browser. Built with Angular, TypeScript, and Babylon.js, it provides a modular engine architecture for rendering, lighting, sky simulation, and atmospheric effects, making it easy to develop immersive 3D web applications that run smoothly across devices.

## Core Principles

Clearview is built on six key principles:

1. **Minimalism** - Focused APIs that solve specific problems without bloat
2. **Realism** - Physically-based rendering and scientific accuracy where possible
3. **Performance** - Optimized for smooth frame rates on both high and low-end devices
4. **Modularity** - Well-isolated components that can be used independently
5. **Scalability** - Designed to support growth from simple to complex scenes
6. **Clean Code** - Consistent patterns that are maintainable and testable

## Architectural Design

Clearview follows a service-oriented architecture using Angular's dependency injection system. This provides several advantages:

- **Testability**: Services can be easily mocked and tested in isolation
- **Reusability**: Services can be composed and reused across different scenes
- **Maintainability**: Clear separation of concerns makes the codebase easier to understand

The engine is designed around these key architectural decisions:

- **Angular DI for Services**: All services use `@Injectable()` and constructor injection
- **Standard Naming Conventions**: Consistent method naming patterns (`get...`, `is...`, verb-first actions)
- **Information Hiding Pattern**: Private fields with public API methods for better encapsulation
- **Scene Lifecycle Management**: Standard init/update/dispose pattern for all scenes
- **Separation of Concerns**: Clear boundaries between world simulation, rendering, and user interaction

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
│   │   │   └── scene.ts              # Abstract base scene class with lifecycle methods
│   │   ├── core/
│   │   │   ├── engine.service.ts     # BabylonJS engine wrapper
│   │   │   └── scene-manager.service.ts  # Scene loading and lifecycle management
│   │   ├── material/
│   │   │   └── material.service.ts   # Material creation and management
│   │   ├── physics/
│   │   │   └── time.service.ts       # World time simulation
│   │   ├── player/
│   │   │   └── camera.service.ts     # Camera creation and control
│   │   ├── scenes/
│   │   │   └── scene001.scene.ts     # Example scene implementation
│   │   ├── shaders/
│   │   │   ├── enhancedSky.fragment.ts  # Sky fragment shader
│   │   │   └── enhancedSky.vertex.ts    # Sky vertex shader
│   │   └── world/
│   │       ├── atmosphere.service.ts   # Fog and atmospheric effects
│   │       ├── celestial.service.ts    # Sun/moon positioning and calculations
│   │       ├── light.service.ts        # Dynamic lighting system
│   │       ├── sky.service.ts          # Sky dome and shader management
│   │       └── terrain.service.ts      # Terrain generation and management
│   └── pages/
│       ├── about/
│       ├── demo/
│       │   └── clearview/
│       └── home/
```

## Service Responsibilities

### Core Services

- **EngineService**: Wraps the Babylon.js engine, handling WebGL context creation
- **SceneManagerService**: Orchestrates scene loading, transitions, and the render loop

### World Simulation

- **TimeService**: Simulates the passage of time, supporting day/night cycles
- **CelestialService**: Calculates sun/moon positions and lighting conditions based on time
- **AtmosphereService**: Manages fog and atmospheric effects that change with time of day
- **LightService**: Controls dynamic lighting based on celestial positions and time
- **SkyService**: Manages the sky dome and shader for realistic sky rendering

### Asset & Scene Management

- **MaterialService**: Creates and applies materials and textures to scene objects
- **TerrainService**: Generates terrain meshes from heightmaps or procedural algorithms
- **CameraService**: Creates and manages various camera types with intuitive controls

## Engine Workflow

1. **Initialization**:  
   - The `ViewportComponent` injects the required services and loads the main scene
   - `SceneManagerService` orchestrates scene creation through Angular's DI
   - Each scene injects its required services via constructor injection

2. **Render Loop**:  
   - Managed by `SceneManagerService` with this update order:
     1. **TimeService**: Advances world time
     2. **CelestialService**: Updates sun/moon positions
     3. **LightService**: Updates light properties and sky colors
     4. **SkyService**: Updates sky shader uniforms
     5. **AtmosphereService**: Updates fog properties

3. **Resource Management**:
   - Services implement proper disposal methods to prevent memory leaks
   - Resources are created lazily and cached for performance

## Development Guidelines

When extending Clearview, follow these guidelines:

1. **Services**:
   - All services should be decorated with `@Injectable({ providedIn: 'root' })`
   - Services should use constructor injection for dependencies
   - Public method naming follows specific patterns:
     - Getters start with `get...` (e.g., `getWorldTime()`)
     - Boolean queries start with `is...` (e.g., `isDay()`)
     - Actions use verb-first naming (e.g., `createSky()`, `updateLights()`)

2. **Scene Creation**:
   - Extend `BaseScene` and implement the required lifecycle methods
   - Use constructor injection to get required services
   - Follow the init/update/dispose pattern

3. **Shader Development**:
   - Store shaders in separate files (.vertex.ts and .fragment.ts)
   - Include error handling for shader compilation
   - Provide fallbacks for failed shader compilation

4. **Performance Optimization**:
   - Use appropriate mesh complexity (e.g., fewer segments for background elements)
   - Implement quality scaling based on device capability
   - Keep shader complexity in check for mobile compatibility

## Getting Started

1. **Installation**:
   ```bash
   npm install
   ```

2. **Development Server**:
   ```bash
   ng serve
   ```

3. **Creating a New Scene**:
   ```typescript
   @Injectable()
   export class MyNewScene extends BaseScene {
     constructor(
       private engineService: EngineService,
       private timeService: TimeService,
       private cameraService: CameraService,
       // other required services...
     ) {
       super(engineService);
     }

     async init(canvas: HTMLCanvasElement): Promise<Scene> {
       this.scene = new Scene(this.engineService.getEngine());
       // Setup your scene...
       return this.scene;
     }

     update(deltaTime: number): void {
       // Update your scene...
     }

     dispose(): void {
       // Clean up resources...
       this.scene.dispose();
     }
   }
   ```

4. **Register your scene in app.config.ts**:
   ```typescript
   export const appConfig: ApplicationConfig = {
     providers: [
       // other providers...
       MyNewScene,
       provideRouter(routes)
     ]
   };
   ```

## Performance Considerations

Clearview is designed for performance across a range of devices:

- **Memory Management**: All services implement proper disposal methods
- **Adaptive Quality**: Scene elements can scale detail based on device capability
- **Shader Optimization**: Shaders are designed with fallbacks for lower-end devices
- **Asset Loading**: Assets are loaded asynchronously with proper error handling

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Follow the architectural patterns and naming conventions
2. Include tests for new functionality
3. Ensure performance is maintained across devices
4. Document new features and APIs

---

Clearview is an ongoing project focused on creating beautiful, performant 3D web experiences. We welcome collaboration and feedback from the community.