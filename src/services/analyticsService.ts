// Shim: Re-export all analytics types and service from the new feature module
// This maintains backward compatibility for existing consumers while moving
// the implementation to the feature-based architecture.

export * from '../features/analytics';
