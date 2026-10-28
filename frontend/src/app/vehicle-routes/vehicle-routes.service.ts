import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VehicleRoutesService {

  api = `${environment.BASE_URL}/api`;

  constructor(private http: HttpClient) {}

  getVehicleRoutes() {
    return this.http.get(this.api + "/getVehicleRoutes");
  }

  saveRoute(data:any) {
    return this.http.post(this.api + "/saveRoute", data);
  }

  updateRoute(data:any) {
    return this.http.post(this.api + "/updateRoute", data);
  }

  deleteRoute(data:any) {
    return this.http.post(this.api + "/deleteRoute", data);
  }

}