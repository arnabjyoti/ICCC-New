import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FuelManagementService {
  private baseUrl = environment.BASE_URL;

  constructor(private http: HttpClient) {}

  getFuelSummary(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/getFuelSummary`);
  }

  getFuelLogs(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(`${this.baseUrl}/api/getFuelLogs`, { params: httpParams });
  }

  saveFuelLog(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/saveFuelLog`, formData);
  }

  deleteFuelLog(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/deleteFuelLog`, { id });
  }

  getFuelAlerts(status: string = 'OPEN', vehicle_id?: any): Observable<any> {
    let httpParams = new HttpParams().set('status', status);
    if (vehicle_id) {
      httpParams = httpParams.set('vehicle_id', vehicle_id);
    }
    return this.http.get(`${this.baseUrl}/api/getFuelAlerts`, { params: httpParams });
  }

  resolveFuelAlert(payload: { id: number; status: string; resolved_by?: string; resolution_notes?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/resolveFuelAlert`, payload);
  }

  getVehicles(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/getVehicleMaster`);
  }

  getLastRefuelInfo(vehicleId: number | string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/getLastRefuelInfo`, {
      params: new HttpParams().set('vehicle_id', vehicleId.toString())
    });
  }

  getDrivers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/getDriver`);
  }

  updateVehicleFuelProfile(payload: { vehicle_id?: number | string; id?: number | string; vehicle_no?: string; fuel_type?: string; tank_capacity?: number; expected_mileage?: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/updateVehicleFuelProfile`, payload);
  }
}
