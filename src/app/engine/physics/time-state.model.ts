// src/app/engine/physics/time-state.model.ts
export interface TimeState {
  worldTime: number;           // Current time (0-24 hours)
  normalizedTime: number;      // Time as 0-1 factor
  dayFactor: number;           // Day intensity (0-1)
  nightFactor: number;         // Night intensity (0-1)
  dawnFactor: number;          // Dawn intensity (0-1)
  duskFactor: number;          // Dusk intensity (0-1)
  starVisibility: number;      // Star visibility (0-1)
  sunVisibility: number;       // Sun visibility (0-1)
  moonOpacity: number;         // Moon opacity (0-1)
  sunHeight: number;           // Sun height relative to horizon (-1 to 1)
  moonHeight: number;          // Moon height relative to horizon (-1 to 1)
  sunIntensity: number;        // Sun light intensity
  moonIntensity: number;       // Moon light intensity
  continuousRotation: number;  // Star rotation angle
  keyTimes: {                  // Key time points
    midnight: number; 
    dawnStart: number;
    sunrise: number;
    dawnEnd: number;
    noon: number;
    duskStart: number;
    sunset: number;
    duskEnd: number;
  };
}