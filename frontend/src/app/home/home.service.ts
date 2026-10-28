import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { AppService } from 'src/app/app.service';
import { environment } from 'src/environments/environment';

export interface VehicleHeadingCache {
  lat: number;
  lng: number;
  angle: number;
}

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  public accessKeyword: any = null;
  public headers: any;

  // Persistent fleet cache across route navigation
  public lastFleetData: any[] = [];
  public vehicleHeadingCache: Record<string, VehicleHeadingCache> = {};

  constructor(
    private toastr: ToastrService,
    private appService: AppService,
    private http: HttpClient,
  ) { 
    try {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        const parsedToken = typeof storedToken === 'string' ? JSON.parse(storedToken) : storedToken;
        this.accessKeyword = parsedToken?.usr?.accessKeyword || null;
      }
    } catch (e) {
      console.warn('Failed to parse auth token from localStorage', e);
    }
  }

  // Dashboard count summary API
  getDashboardCounts(callback: any) {
    const ENDPOINT = `${environment.BASE_URL}/api/getDashboardCounts`;

    this.http.get(ENDPOINT, { headers: this.headers }).subscribe(
      (response: any) => {
        return callback && callback(null, response);
      },
      (error) => {
        return callback && callback(error, null);
      }
    );
  }

  // Save vehicle heading angle and coordinate cache
  setVehicleCache(id: string, lat: number, lng: number, angle: number): void {
    this.vehicleHeadingCache[id] = { lat, lng, angle };
  }

  // Retrieve vehicle heading angle and coordinate cache
  getVehicleCache(id: string): VehicleHeadingCache | undefined {
    return this.vehicleHeadingCache[id];
  }
}