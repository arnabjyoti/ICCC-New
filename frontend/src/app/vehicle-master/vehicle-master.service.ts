import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Vehicle } from '../models/vehicle.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VehicleMasterService {

  constructor(private http: HttpClient) {}

  
  // Live GPS API
  // getVehicles(): Observable<Vehicle[]> {
  //   return this.http.get<Vehicle[]>(
  //     'http://htp2.hitecpoint.in/api/Pgm/live/?apiKey=995FC323-CCEA-46F9-843A-819AA089C479'
  //   );
  // }

  // Database vehicles
  getVehicleMaster(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.BASE_URL}/api/getVehicleMaster`);
  }

  saveVehicle(data:any){
    return this.http.post(`${environment.BASE_URL}/api/saveVehicle`,data);
  }

  updateVehicle(data:any){
    return this.http.post(`${environment.BASE_URL}/api/updateVehicle`,data);
  }

  getOperators(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.BASE_URL}/api/getOperator`);
  }

  getDrivers(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.BASE_URL}/api/getDriver`);
  }

  getRoutes(){
  return this.http.get<any[]>(`${environment.BASE_URL}/api/getVehicleRoutes`);
}

}