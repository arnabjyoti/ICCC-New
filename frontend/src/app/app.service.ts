import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
// import {  Http, Headers, RequestOptions, Response } from '@angular/http';
import { ToastrService } from 'ngx-toastr';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppService {
  public headers: any;
  private sidebarCollapsedSubject = new BehaviorSubject<boolean>(false);
  public sidebarCollapsed$ = this.sidebarCollapsedSubject.asObservable();

  public toggleSidebar() {
    this.sidebarCollapsedSubject.next(!this.sidebarCollapsedSubject.value);
  }

  public setSidebarCollapsed(collapsed: boolean) {
    this.sidebarCollapsedSubject.next(collapsed);
  }

  public get isSidebarCollapsed(): boolean {
    return this.sidebarCollapsedSubject.value;
  }
  constructor(
	private toastr: ToastrService,  
	private http: HttpClient) {
    this.getHttpHeader((h: any) => {
      this.headers = h;
    });
   }

   getHttpHeader = (callback: any) => {
    let headers = new Headers();//new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
    headers.append('Content-Type', 'application/json');
    headers.append('X-Requested-With', 'Test key');
    headers.append('Access-Control-Allow-Origin', '*');
    return callback && callback(headers);
  }

  getData(req:any, callback:any) {
	const ENDPOINT = `${environment.BASE_URL}/api/department`;
	const requestOptions = {
		headers: this.headers,
		method: 'get'
	};
	this.http.get(ENDPOINT, requestOptions).subscribe(
		(response) => {
			console.log('Success');
			return callback && callback(response);
		},
		(error) => {
			return callback && callback(error);
		},
		() => {
			console.log('Observable is now completed.');
		}
	);
}

  //Start: Method to pull all the projects
	getProjectById(projectId: any, callback: any) {
		const ENDPOINT = `${environment.BASE_URL}/api/department`;
		const requestOptions = {
			headers: this.headers,
			method: 'get'
		};
		this.http.get(ENDPOINT, requestOptions).subscribe(
			(response) => {
				console.log('Success');
				return callback && callback(response);
			},
			(error) => {
				return callback && callback(error);
			},
			() => {
				console.log('Observable is now completed.');
			}
		);
  }

  getCurrentISTTime() {
    return this.http.get<any>(`${environment.BASE_URL}/api/current-ist-time`);
  }
}
