import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppService } from 'src/app/app.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RouteReplayService {
  public accessKeyword: any = null;
  public headers: any;

  constructor(
    private toastr: ToastrService,
    private appService: AppService,
    private http: HttpClient,
  ) { 
    let token = JSON.parse(JSON.stringify(localStorage.getItem('token')));
    if (token) {
      token = JSON.parse(token);
      this.accessKeyword = token?.usr?.accessKeyword;
    }
  }

  // Fetch travel history using callback pattern
  getTravelHistory(boxId: string, date: string, callback: any) {
    const ENDPOINT = `${environment.BASE_URL}/api/getTravelHistory`;

    const params = new HttpParams()
      .set('box_id', boxId)
      .set('date', date);

    this.http.get(ENDPOINT, { headers: this.headers, params: params }).subscribe(
      (response: any) => {
        return callback && callback(null, response);
      },
      (error) => {
        this.toastr.error('Failed to fetch route history', 'Error');
        return callback && callback(error, null);
      }
    );
  }
}