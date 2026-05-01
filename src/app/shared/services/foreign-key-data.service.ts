import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

/**
 * Generic service for managing foreign key dropdown data loads and lookups.
 * 
 * This service provides:
 * - Single point of caching for related entities (e.g., people, genres, crew roles)
 * - Lookup methods to convert IDs to display names (for form display, chips, etc.)
 * - Configurable service providers for any entity type
 * 
 * Usage in modal:
 * ```
 * constructor(private fkService: ForeignKeyDataService) {}
 * ngOnChanges() {
 *   if (this.isVisible) this.fkService.loadData('people', this.peopleService);
 * }
 * getName(id: string): string {
 *   return this.fkService.getNameById('people', id);
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ForeignKeyDataService {

  // Cache store: { entityType: { id: name, id: name ... } }
  private cache = new Map<string, Map<string, any>>();

  // Loading states for each entity type
  private loadingStates = new Map<string, BehaviorSubject<boolean>>();

  constructor() {}

  /**
   * Load dropdown data for a specific entity from a service.
   * Data is cached to avoid repeated API calls.
   * 
   * @param entityType - Unique identifier (e.g., 'people', 'genres', 'crewRoles')
   * @param serviceMethod - The service's getList() method (or similar)
   * @param dataExtractor - Optional: function to extract array from response (defaults to r.data || r.data[0][plural] || [])
   */
  loadData(
    entityType: string,
    serviceMethod: Observable<any>,
    dataExtractor?: (response: any) => any[]
  ): void {
    // Avoid re-fetching if already cached
    if (this.cache.has(entityType)) {
      return;
    }

    // Initialize loading state
    if (!this.loadingStates.has(entityType)) {
      this.loadingStates.set(entityType, new BehaviorSubject<boolean>(true));
    }
    const loadingState = this.loadingStates.get(entityType)!;
    loadingState.next(true);

    // Determine how to extract data if not provided
    const extractor = dataExtractor || ((r: any) => {
      if (Array.isArray(r.data)) return r.data;
      if (r.data && typeof r.data === 'object' && !Array.isArray(r.data)) {
        const values = Object.values(r.data);
        if (Array.isArray(values[0])) return values[0];
      }
      return [];
    });

    serviceMethod.subscribe({
      next: (response) => {
        const dataArray = extractor(response);
        this.cacheData(entityType, dataArray);
        loadingState.next(false);
      },
      error: () => {
        loadingState.next(false);
      }
    });
  }

  /**
   * Load multiple entity types in parallel (for modals needing several dropdowns).
   * 
   * @param configs - Array of { entityType, serviceMethod, dataExtractor? }
   */
  loadMultipleData(configs: Array<{
    entityType: string;
    serviceMethod: Observable<any>;
    dataExtractor?: (response: any) => any[];
  }>): void {
    configs.forEach(cfg => this.loadData(cfg.entityType, cfg.serviceMethod, cfg.dataExtractor));
  }

  /**
   * Get name/display value by ID.
   * 
   * @param entityType - Entity type (must match what was loaded)
   * @param id - The ID to lookup
   * @param displayField - Field name to display (default: 'name')
   * @returns The display value or empty string if not found
   */
  getNameById(entityType: string, id: string, displayField: string = 'name'): string {
    if (!id) return '';
    const entityMap = this.cache.get(entityType);
    if (!entityMap) return '';
    const entity = entityMap.get(id);
    return entity ? entity[displayField] || entity.title || entity.label || '' : '';
  }

  /**
   * Get full entity object by ID.
   * 
   * @param entityType - Entity type
   * @param id - The ID to lookup
   * @returns The full entity object or null
   */
  getById(entityType: string, id: string): any {
    if (!id) return null;
    const entityMap = this.cache.get(entityType);
    return entityMap ? entityMap.get(id) || null : null;
  }

  /**
   * Get all entities of a given type from cache.
   * 
   * @param entityType - Entity type
   * @returns Array of cached entities
   */
  getAll(entityType: string): any[] {
    const entityMap = this.cache.get(entityType);
    return entityMap ? Array.from(entityMap.values()) : [];
  }

  /**
   * Check if data is loaded for an entity type.
   * 
   * @param entityType - Entity type
   * @returns true if data is loaded and cached
   */
  isLoaded(entityType: string): boolean {
    return this.cache.has(entityType);
  }

  /**
   * Get loading state observable for an entity type.
   * 
   * @param entityType - Entity type
   * @returns BehaviorSubject<boolean> - true while loading
   */
  getLoadingState(entityType: string): BehaviorSubject<boolean> {
    if (!this.loadingStates.has(entityType)) {
      this.loadingStates.set(entityType, new BehaviorSubject<boolean>(false));
    }
    return this.loadingStates.get(entityType)!;
  }

  /**
   * Clear cache for an entity type or all caches.
   * 
   * @param entityType - Optional. If omitted, clears all caches.
   */
  clearCache(entityType?: string): void {
    if (entityType) {
      this.cache.delete(entityType);
      this.loadingStates.delete(entityType);
    } else {
      this.cache.clear();
      this.loadingStates.clear();
    }
  }

  // Private helpers

  /**
   * Store fetched data in cache with ID as key for O(1) lookups.
   */
  private cacheData(entityType: string, dataArray: any[]): void {
    const mapData = new Map<string, any>();
    dataArray.forEach(item => {
      const id = item._id || item.id;
      if (id) mapData.set(id, item);
    });
    this.cache.set(entityType, mapData);
  }
}
