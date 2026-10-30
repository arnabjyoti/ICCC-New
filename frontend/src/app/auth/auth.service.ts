import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor() {}

  public isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  public getUser(): any {
    try {
      const raw = localStorage.getItem('token');
      if (!raw) return null;
      let parsed = JSON.parse(raw);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      return parsed && parsed.usr ? parsed.usr : null;
    } catch (e) {
      return null;
    }
  }

  public isFuelManager(): boolean {
    const user = this.getUser();
    if (!user || !user.role) return false;
    const role = user.role.toString().toLowerCase().trim();
    return role === 'fuel manager' || role === 'fuel_manager';
  }
}