import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {

  private socket: Socket;

  constructor() {

    this.socket = io(`${environment.BASE_URL}`, {
      transports: ['websocket'],
      autoConnect: true
    });

  }

  onVehicleUpdate(callback: (data: any) => void) {

    // ⭐ REMOVE OLD LISTENER BEFORE ADDING NEW
    this.socket.off('vehicleLocation');

    this.socket.on('vehicleLocation', callback);
  }

}