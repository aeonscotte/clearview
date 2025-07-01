# Clearview

Clearview is a modern web application framework for building high-performance, interactive 3D experiences in the browser. Built with Angular, TypeScript, and js, it provides a modular engine architecture for rendering, lighting, sky simulation, and atmospheric effects, making it easy to develop immersive 3D web applications that run smoothly across devices.

## Core Principles

1. **Minimalism** - Focused APIs that solve specific problems without bloat
2. **Realism** - Physically-based rendering and scientific accuracy where possible
3. **Performance** - Optimized for smooth frame rates on both high and low-end devices
4. **Modularity** - Well-isolated components that can be used independently
5. **Scalability** - Designed to support growth from simple to complex scenes
6. **Clean Code** - Consistent patterns that are maintainable and testable

## Architectural Design

Clearview follows a service-oriented architecture using Angular's standalone components and dependency injection system, providing testability, reusability, and maintainability through clear separation of concerns.

Key architectural decisions:
- **Single Source of Truth**: Unified time state model to prevent redundant calculations
- **Efficient Resource Management**: Optimized memory usage and shader compilation
- **Angular Standalone Components**: Full compatibility with modern Angular patterns
- **Scene Lifecycle Management**: Standard init/update/dispose pattern for all scenes

### Memory Management Approach

Clearview implements a strict, consistent memory management strategy to maximize performance and minimize garbage collection. This is a core architectural requirement, not simply a best practice.

#### Key Requirements

1. **Pre-allocation Principle**: All objects used in update loops MUST be pre-allocated as class properties
   - Pre-allocate vectors, colors, matrices, and other mathematical objects
   - Name pre-allocated objects with leading underscore (e.g., `_tempVector`)
   - Group all pre-allocated objects at the top of the class after constants

2. **Zero Allocation Update Loops**: Methods that run every frame MUST NOT allocate new objects
   - Always use `*ToRef` methods instead of methods that create new objects
   - For methods without `*ToRef` versions, use the `MemoryUtilsService`
   - Reuse pre-allocated objects for calculations

3. **Reference Parameters**: Methods should accept optional result parameters
   - Methods should allow the caller to provide objects to store results
   - Public methods must clearly document if they mutate passed objects

4. **Collection Reuse**: Array operations should avoid creating new arrays
   - Use fixed-length arrays, object pools, or reuse existing collections
   - Clear and repopulate existing arrays rather than creating new ones

#### Implementation Examples

```typescript
// ❌ PROHIBITED - creates garbage each frame
update(): void {
  const direction = new Vector3(0, 1, 0);
  const color = new Color3(1, 0, 0);
  const result = Vector3.Cross(entity.forward, direction);
  entity.position.addInPlace(result.scale(0.1));
  material.diffuseColor = Color3.Lerp(material.diffuseColor, color, 0.1);
}

// ✅ REQUIRED - zero allocation pattern
private _tempDirection = new Vector3(0, 1, 0);
private _tempColor = new Color3(1, 0, 0);
private _tempResult = new Vector3();

update(): void {
  // Reuse pre-allocated vectors
  this._tempDirection.set(0, 1, 0);
  this._tempColor.set(1, 0, 0);
  
  // Use *ToRef methods that don't create new objects
  Vector3.CrossToRef(entity.forward, this._tempDirection, this._tempResult);
  this._tempResult.scaleInPlace(0.1);
  entity.position.addInPlace(this._tempResult);
  
  // Use *ToRef for color operations
  Color3.LerpToRef(material.diffuseColor, this._tempColor, 0.1, material.diffuseColor);
}
```

#### Method Return Strategies

```typescript
// ❌ AVOID - Creates a new Vector3 on each call
calculateDirection(start: Vector3, end: Vector3): Vector3 {
  return end.subtract(start).normalize();
}

// ✅ PREFERRED - Allows caller to provide result object
calculateDirection(start: Vector3, end: Vector3, result?: Vector3): Vector3 {
  result = result || new Vector3();
  end.subtractToRef(start, result);
  result.normalize();
  return result;
}
```

#### Memory Profiling Protocol

To ensure compliance with memory management requirements:

1. Run Chrome DevTools performance profiling after any significant changes
2. Watch for garbage collection events during continuous rendering
3. Identify and fix any services creating objects within update loops

#### MemoryUtilsService

Clearview provides a centralized `MemoryUtilsService` with pre-allocated objects and helper methods for common operations. Services should inject and use this utility rather than implementing their own temporary objects when possible.

```typescript
// Example usage of MemoryUtilsService
constructor(private memoryUtils: MemoryUtilsService) {}

update(): void {
  // Borrow a pre-allocated Vector3
  const tempVec = this.memoryUtils.getTempVector3();
  
  // Use helper methods that don't create garbage
  const lerpedColor = this.memoryUtils.lerpColors(color1, color2, 0.5);
}
```

### Shader Management System

- **Centralized Registration**: Shaders are registered once at application startup
- **Preventing Duplicate Compilation**: Registry tracks registered shaders to avoid redundancy
- **Error Handling**: Robust error handling for shader compilation failures

### State Management Approach

- **Unidirectional Data Flow**: State changes propagate in a single direction
- **Observable State**: RxJS Observables for subscribing to state changes
- **Localized State**: State is managed by the service responsible for it

## Stylistic Decisions

### Naming Conventions

- **Files**: kebab-case (e.g., `light.service.ts`, `enhanced-sky.vertex.ts`)
- **Classes**: PascalCase (e.g., `LightService`, `SkyMaterial`)
- **Interfaces**: PascalCase with no prefix (e.g., `TimeState`, not `ITimeState`)
- **Methods**:
  - Public methods: camelCase with verb-first naming (e.g., `createLight()`)
  - Boolean methods: prefixed with "is", "has", or "should" (e.g., `isVisible()`)
  - Getters/Setters: prefixed with "get"/"set" (e.g., `getWorldTime()`)
- **Properties**:
  - Public properties: camelCase (e.g., `worldTime`)
  - Private properties: camelCase with underscore prefix (e.g., `_currentTime`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_LIGHTS`)

### Code Organization

- **Single Responsibility**: Each file has a single responsibility
- **Class Structure**:
  ```typescript
  @Injectable({ providedIn: 'root' })
  export class ExampleService {
    // Constants
    private readonly CONSTANT_VALUE = 1.0;
    
    // Properties
    private _property: Type;
    
    // Temporary objects for calculations
    private _tempObject = new SomeObject();
    
    // Constructor with dependency injection
    constructor(
      private dependencyOne: ServiceOne,
      private dependencyTwo: ServiceTwo
    ) {}
    
    // Public methods (alphabetical order)
    
    // Private methods (alphabetical order)
  }
  ```

## Project Structure

```
├── public/
└── src/
    ├── app/
    │   ├── app.component.*                # Root component
    │   ├── app.config.ts                  # Application configuration
    │   ├── app.routes.ts                  # Routing configuration
    │   ├── engine/                        # 3D engine core
    │   │   ├── base/
    │   │   │   └── scene.ts               # Abstract base scene 
    │   │   ├── core/                      # Core engine services
    │   │   │   ├── engine.service.ts      # BabylonJS wrapper
    │   │   │   └── scene-manager.service.ts # Scene management
    │   │   ├── material/
    │   │   │   └── material.service.ts    # Material creation
    │   │   ├── physics/
    │   │   │   ├── time.service.ts        # Time simulation
    │   │   │   └── time-state.model.ts    # Time state model
    │   │   ├── player/
    │   │   │   └── camera.service.ts      # Camera controls
    │   │   ├── scenes/
    │   │   │   └── scene001.scene.ts      # Example scene
    │   │   ├── shaders/
    │   │   │   ├── enhancedSky.fragment.ts # Sky shader
    │   │   │   ├── enhancedSky.vertex.ts   # Sky shader
    │   │   │   └── shader-registry.service.ts # Shader management
    │   │   ├── utils/
    │   │   │   └── memory-utils.service.ts # Memory management utilities
    │   │   └── world/
    │   │       ├── atmosphere.service.ts  # Atmospheric effects
    │   │       ├── celestial.service.ts   # Sun/moon positioning
    │   │       ├── light.service.ts       # Lighting system
    │   │       ├── sky.service.ts         # Sky rendering
    │   │       └── terrain.service.ts     # Terrain generation
    │   ├── pages/                         # Application pages
    │   └── components/                    # Application components
```

## Service Responsibilities

### Core Services

- **EngineService**: Wraps the js engine, handling WebGL context and canvas
- **SceneManagerService**: Orchestrates scene loading, transitions, and render loop
- **ShaderRegistryService**: Manages shader registration and compilation

### World Simulation

- **TimeService**: Simulates the passage of time, supporting day/night cycles
- **CelestialService**: Calculates sun/moon positions and lighting conditions
- **AtmosphereService**: Manages fog and atmospheric effects
- **LightService**: Controls dynamic lighting based on celestial positions
- **SkyService**: Manages the sky dome and shader for realistic sky rendering

### Asset & Scene Management

- **MaterialService**: Creates and applies materials and textures
- **TerrainService**: Generates terrain meshes
- **CameraService**: Creates and manages camera types with intuitive controls

### Utility Services

- **MemoryUtilsService**: Provides pre-allocated objects and memory-efficient operations
- **MathUtils**: Common mathematical operations optimized for performance

## Engine Workflow

1. **Initialization**:  
   - The application initializes and registers all shaders
   - SceneManagerService orchestrates scene creation through Angular's DI

2. **Render Loop**:  
   - Managed by SceneManagerService with this update order:
     1. **TimeService**: Advances world time
     2. **CelestialService**: Updates the unified time state
     3. **LightService**: Updates light properties
     4. **SkyService**: Updates sky shader
     5. **AtmosphereService**: Updates fog properties

3. **Resource Management**:
   - Services implement proper dispose methods
   - Memory-efficient patterns minimize garbage collection

## Performance Optimizations

1. **Memory Management**:
   ```typescript
   // ❌ Prohibited - creates new objects every frame
   update(): void {
     const color = new Color3(0.5, 0.5, 0.5); // Creates garbage
     const direction = target.position.subtract(source.position); // Creates garbage
     this.material.diffuse = color;
     this.move(direction.normalize().scale(speed)); // Creates more garbage
   }

   // ✅ Required - reuses existing objects
   private _tempColor = new Color3(0, 0, 0);
   private _tempDirection = new Vector3(0, 0, 0);

   update(): void {
     this._tempColor.set(0.5, 0.5, 0.5); // Zero allocations
     
     // Calculate direction without creating new vectors
     target.position.subtractToRef(source.position, this._tempDirection);
     this._tempDirection.normalizeToRef(this._tempDirection);
     this._tempDirection.scaleInPlace(speed);
     
     this.material.diffuse.copyFrom(this._tempColor);
     this.move(this._tempDirection);
   }
   ```

2. **Shader Optimization**:
   ```typescript
   // ❌ Bad practice - registers shaders multiple times
   createSky(): void {
     Effect.ShadersStore["skyVertexShader"] = vertexShader; // May recompile
   }

   // ✅ Good practice - uses registry service
   constructor(private shaderRegistry: ShaderRegistryService) {
     this.shaderRegistry.registerShader('sky', vertexShader, fragmentShader);
   }
   ```

3. **Time-Based Calculations**:
   ```typescript
   // ❌ Bad practice - duplicates calculations
   update(): void {
     const time = this.timeService.getWorldTime();
     const sunFactor = this.calculateSunFactor(time); // Duplicates work
   }

   // ✅ Good practice - uses unified time state
   update(): void {
     const timeState = this.celestialService.getTimeState();
     const sunFactor = timeState.dayFactor; // Pre-calculated
   }
   ```

## Quick Start Guide

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
     // Pre-allocate frequently used objects
     private _tempColor = new Color3(0, 0, 0);
     
     constructor(
       private engineService: EngineService,
       private timeService: TimeService,
       private celestialService: CelestialService,
       private memoryUtils: MemoryUtilsService
     ) {
       super(engineService);
     }

     async init(canvas: HTMLCanvasElement): Promise<Scene> {
       this.scene = new Scene(this.engineService.getEngine());
       // Setup your scene...
       return this.scene;
     }

     update(deltaTime: number): void {
       const timeState = this.celestialService.getTimeState();
       // Update using timeState...
     }

     dispose(): void {
       // Clean up resources
       this.scene.dispose();
     }
   }
   ```

4. **Register your scene in app.config.ts**:
   ```typescript
   export const appConfig: ApplicationConfig = {
     providers: [
       provideZoneChangeDetection({ eventCoalescing: true }),
       provideRouter(routes),
       MyNewScene, // Register your scene
       // Pre-register shaders
       {
         provide: APP_INITIALIZER,
         useFactory: (registry: ShaderRegistryService) => () => {
           registry.registerShader('myShader', vertexShader, fragmentShader);
           return Promise.resolve();
         },
         deps: [ShaderRegistryService],
         multi: true
       }
     ]
   };
   ```

## Version Compatibility

- **Angular**: 16.0.0+
- **js**: 5.0.0+
- **TypeScript**: 4.8.0+
- **RxJS**: 7.0.0+

## Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+
- **Mobile**: iOS Safari 14+, Chrome for Android 90+

## Roadmap

1. **GUI Service**: User interface framework optimized for 3D environments
2. **Basic Input System**: Unified input handling for keyboard and mouse
3. **Audio System**: Spatial audio with dynamic mixing
4. **Particle System**: Memory-efficient particle system for environmental effects
5. **Quality Settings System**: Adaptive quality based on device performance
6. **Asset Management System**: Improved asset loading with caching and streaming
7. **Post-Processing Pipeline**: Efficient multi-pass rendering
8. **Physics Integration**: Optional physics system
9. **Level Editor**: Visual editor for scenes
10. **Documentation Portal**: Comprehensive documentation

---

Clearview is an ongoing project focused on creating beautiful, performant 3D web experiences.