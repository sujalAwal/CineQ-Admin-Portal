import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  ModuleRequestDTO, 
  ModuleResponseDTO, 
  ApiResponse, 
  PaginationResponse, 
  ModulePageRequest, 
  BulkModuleStatusUpdateRequest 
} from '../interfaces/module.interface';

@Injectable({
  providedIn: 'root'
})
export class ModuleService {
  private readonly baseUrl = `${environment.api.baseUrl}/modules`;

  constructor(private http: HttpClient) {}

  // Get all modules with pagination
  getAllModules(params?: ModulePageRequest): Observable<PaginationResponse<ModuleResponseDTO>> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
      if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
      if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
      if (params.search) httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<PaginationResponse<ModuleResponseDTO>>(this.baseUrl, { params: httpParams });
  }

  // Get module by ID
  getModuleById(id: string): Observable<ApiResponse<ModuleResponseDTO>> {
    return this.http.get<ApiResponse<ModuleResponseDTO>>(`${this.baseUrl}/${id}`);
  }

  // Create new module
  createModule(moduleData: ModuleRequestDTO): Observable<ApiResponse<ModuleResponseDTO>> {
    return this.http.post<ApiResponse<ModuleResponseDTO>>(this.baseUrl, moduleData);
  }

  // Update module
  updateModule(id: string, moduleData: ModuleRequestDTO): Observable<ApiResponse<ModuleResponseDTO>> {
    return this.http.put<ApiResponse<ModuleResponseDTO>>(`${this.baseUrl}/${id}`, moduleData);
  }

  // Delete module (soft delete)
  deleteModule(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }

  // Bulk enable modules
  bulkEnableModules(ids: string[]): Observable<ApiResponse<null>> {
    const requestBody: BulkModuleStatusUpdateRequest = { ids };
    return this.http.post<ApiResponse<null>>(`${this.baseUrl}/bulk-enable`, requestBody);
  }

  // Bulk disable modules
  bulkDisableModules(ids: string[]): Observable<ApiResponse<null>> {
    const requestBody: BulkModuleStatusUpdateRequest = { ids };
    return this.http.post<ApiResponse<null>>(`${this.baseUrl}/bulk-disable`, requestBody);
  }

  // Get parent modules only
  getParentModules(): Observable<ApiResponse<ModuleResponseDTO[]>> {
    return this.http.get<ApiResponse<ModuleResponseDTO[]>>(`${this.baseUrl}/parents`);
  }
}