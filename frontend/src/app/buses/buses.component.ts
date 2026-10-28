import { Component } from '@angular/core';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as _ from 'underscore';
import { AppService } from 'src/app/app.service';
import { environment } from 'src/environments/environment';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-buses',
  templateUrl: './buses.component.html',
  styleUrls: ['./buses.component.css'],
})
export class BusesComponent {
  isLoading: boolean = false;

  constructor(
    private appService: AppService,
    private http: HttpClient,
    private toastr: ToastrService,
    private router: Router
  ) { }

  form: any = {
    busName: '',
    busNo: '',
    driverName: '',
    driverContactNo: '',
    conductorName: '',
    conductorContactNo: '',
    baseDepot: '',
    allotedRouteNo: '',
  };

  busList: any;
  driverList: any;
  conductorList: any;
  routeList: any;


  // current date in formate yyyy-mm-dd
  dataForDate: any = new Date().toISOString().split('T')[0];

  ngOnInit(): void {
    this.getBuses();
    // this.getDriver();
    // this.getConductor();
    // this.getBusRoutes();
  }

  saveData = () => {

  // 🔴 Basic validation
  if (!this.form.busNo || this.form.busNo.trim() === '') {
    this.toastr.warning('Bus No is required', 'Validation');
    return;
  }

  if (!this.form.driverName) {
    this.toastr.warning('Please select a Driver', 'Validation');
    return;
  }

  if (!this.form.conductorName) {
    this.toastr.warning('Please select a Conductor', 'Validation');
    return;
  }

  if (!this.form.allotedRouteNo) {
    this.toastr.warning('Please select a Route', 'Validation');
    return;
  }

  // ✅ continue only if validation passed
  const ENDPOINT = `${environment.BASE_URL}/api/createBus`;

  let selectedDriverDetails = this.driverList.find(
    (ele: any) => ele.id === parseInt(this.form.driverName)
  );

  let selectedConductorDetails = this.conductorList.find(
    (ele: any) => ele.id === parseInt(this.form.conductorName)
  );

  if (!selectedDriverDetails || !selectedConductorDetails) {
    this.toastr.error('Invalid Driver or Conductor selected', 'Error');
    return;
  }

  this.form.driverId = selectedDriverDetails.id;
  this.form.driverName = selectedDriverDetails.driver_name;
  this.form.conductorId = selectedConductorDetails.id;
  this.form.conductorName = selectedConductorDetails.conductor_name;

  const requestOptions = {
    requestObject: this.form,
  };

  this.http.post(ENDPOINT, requestOptions).subscribe(
    (response) => {
      this.getBuses();
      this.getDriver();
      this.getConductor();
      this.toastr.success('Added Successfully', 'Success');
      let ele: any = document.getElementById('modalClose');
      ele.click();
    },
    (error) => {
      this.toastr.error('Something went wrong!', 'Warning');
    }
  );
};


  updateData = () => {

  // 🔴 Basic validation (no driver/conductor validation)
  if (!this.form.busNo || this.form.busNo.trim() === '') {
    this.toastr.warning('Bus No is required', 'Validation');
    return;
  }

  if (!this.form.allotedRouteNo) {
    this.toastr.warning('Please select a Route', 'Validation');
    return;
  }

  // 👉 DRIVER LOGIC
  if (this.form.driverName === 'REMOVE') {
    this.form.driverId = null;
    this.form.driverName = null;
  } 
  else if (this.form.driverName) {
    const driver = this.driverList.find(
      (d: any) => d.id === parseInt(this.form.driverName)
    );

    if (driver) {
      this.form.driverId = driver.id;
      this.form.driverName = driver.driver_name;
    }
  }
  // else → keep existing values (do nothing)

  // 👉 CONDUCTOR LOGIC
  if (this.form.conductorName === 'REMOVE') {
    this.form.conductorId = null;
    this.form.conductorName = null;
  } 
  else if (this.form.conductorName) {
    const conductor = this.conductorList.find(
      (c: any) => c.id === parseInt(this.form.conductorName)
    );

    if (conductor) {
      this.form.conductorId = conductor.id;
      this.form.conductorName = conductor.conductor_name;
    }
  }

  const ENDPOINT = `${environment.BASE_URL}/api/updateBus`;

  const requestOptions = {
    requestObject: this.form,
  };

  this.http.post(ENDPOINT, requestOptions).subscribe(
    () => {
      this.getBuses();
      this.getDriver();
      this.getConductor();
      this.toastr.success('Updated Successfully', 'Success');
    },
    () => {
      this.toastr.error('Something went wrong!', 'Warning');
    }
  );
  let ele: any = document.getElementById('modalClose');
    ele.click();
};


  getBuses = () => {
    const ENDPOINT = `${environment.BASE_URL}/api/getBusList?date=${this.dataForDate}`;

    this.isLoading = true;

    this.http.get(ENDPOINT).subscribe(
      (response) => {
        console.log('busList response ', response);
        this.busList = response;
        this.isLoading = false;
      },
      (error) => {
        console.log('error here ', error);
        this.toastr.error('Something went wrong !', 'Warning');
      },
      () => {
        console.log('Observable is now completed.');
      }
    );
  };

  getDriver = () => {
    const ENDPOINT = `${environment.BASE_URL}/api/getDriver`;

    this.http.get(ENDPOINT).subscribe(
      (response) => {
        console.log('driver response ', response);
        this.driverList = response;
      },
      (error) => {
        console.log('error here ', error);
        this.toastr.error('Something went wrong !', 'Warning');
      },
      () => {
        console.log('Observable is now completed.');
      }
    );
  };


  getConductor = () => {
    const ENDPOINT = `${environment.BASE_URL}/api/getConductorWithAllotment`;

    this.http.get(ENDPOINT).subscribe(
      (response) => {
        console.log('response ', response);
        this.conductorList = response;
      },
      (error) => {
        console.log('error here ', error);
        this.toastr.error('Something went wrong !', 'Warning');
      },
      () => {
        console.log('Observable is now completed.');
      }
    );
  };

  getBusRoutes = () => {
    const ENDPOINT = `${environment.BASE_URL}/api/getBusRoutes`;

    this.http.get(ENDPOINT).subscribe(
      (response) => {
        console.log('response ', response);
        this.routeList = response;
      },
      (error) => {
        console.log('error here ', error);
        this.toastr.error('Something went wrong !', 'Warning');
      },
      () => {
        console.log('Observable is now completed.');
      }
    );
  };

  selectedConductorId: any;
  manageDrive = () => {
    const selectEl = document.querySelector(
      '[name="driverName"]'
    ) as HTMLSelectElement;

    const selectedDriverId = parseInt(selectEl.value);

    // If no driver selected
    if (!selectedDriverId) {
      this.form.driverContactNo = '';
      return;
    }

    const selectedDriverDetails = this.driverList.find(
      (driver: any) => driver.id === selectedDriverId
    );

    if (!selectedDriverDetails) {
      return;
    }

    // 🚫 If driver already allotted
    if (selectedDriverDetails.allotmentStatus === 'Allotted') {
      this.toastr.warning('This driver is already allotted');
      selectEl.value = '';               // reset dropdown
      this.form.driverContactNo = '';
      return;
    }

    // ✅ Valid free driver
    this.form.driverContactNo = selectedDriverDetails.contact_no;
  };

  manageConductor = () => {
    const selectEl = document.querySelector(
      '[name="conductorName"]'
    ) as HTMLSelectElement;

    const selectedConductorId = parseInt(selectEl.value);

    // If nothing selected
    if (!selectedConductorId) {
      this.form.conductorContactNo = '';
      return;
    }

    const selectedDetails = this.conductorList.find(
      (conductor: any) => conductor.id === selectedConductorId
    );

    if (!selectedDetails) {
      return;
    }

    // 🚫 Block already allotted conductor
    if (selectedDetails.allotmentStatus === 'Allotted') {
      this.toastr.warning('This conductor is already allotted');
      selectEl.value = '';
      this.form.conductorContactNo = '';
      return;
    }

    // ✅ Free conductor
    this.form.conductorContactNo = selectedDetails.contact_no;
  };


  selectedData: any = {};
  viewData = (id: any) => {
    this.selectedData = this.busList[id];
    console.log(this.busList[id]);
    this.newRoundTrip = parseInt(this.selectedData.noOfTrip) + 1;
  };

  amountToBeDeposited: any = 0;
  getRemainingAmountForConductor = (id: any) => {
    this.selectedData = this.busList[id];
    console.log(this.busList[id]);


    const ENDPOINT = `${environment.BASE_URL}/api/getAmountToBePaidByConductor?id=${this.selectedData.conductor_actual_id}`;

    this.http.get(ENDPOINT).subscribe(
      (response: any) => {
        console.log('response ', response.data.amountToBeDeposited);
        this.amountToBeDeposited = response.data.amountToBeDeposited

      },
      (error) => {
        console.log('error here ', error);
        this.toastr.error('Something went wrong !', 'Warning');
      },
      () => {
        console.log('Observable is now completed.');
      }
    );


  };

  toBeDeletedRecord: any = {};
  openConfirmationDialog = (data: any) => {
    this.toBeDeletedRecord = data;
  };

  handleDeleteBus = () => {
    if (this.toBeDeletedRecord.id != '') {
      const ENDPOINT = `${environment.BASE_URL}/api/deleteBus`;
      const requestOptions = {
        requestObject: this.toBeDeletedRecord,
      };
      this.http.post(ENDPOINT, requestOptions).subscribe(
        (response) => {
          this.getBuses();
          this.toastr.success('Bus deleted successfully', 'Success Message');
        },
        (error) => {
          console.log('error here ', error);
          this.toastr.error('Something went wrong !', 'Warning');
        },
        () => {
          console.log('Observable is now completed.');
        }
      );
    } else {
      this.toastr.warning(
        'Please enter data properly before proceed',
        'Warning Message'
      );
    }
  };

  isEdit: boolean = false;
  openNewDialog = () => {
    this.isEdit = false;
    this.form = {
      id: '',
      busName: '',
      busNo: '',
      driverName: '',
      driverContactNo: '',
      conductorName: '',
      conductorContactNo: '',
      baseDepot: '',
      allotedRouteNo: '',
    };
  };

  openEditDialog = (data: any) => {
    console.log("data: ", data);
    
    this.isEdit = true;
    let selectedDriverDetails = this.driverList.find(
      (ele: any) => ele.driver_name === data?.driverName
    );
    let selectedConductorDetails = this.conductorList.find(
      (ele: any) => ele.conductor_name === data?.conductorName
    );
    this.form = {
      id: data?.id,
      busName: data?.busName,
      busNo: data?.busNo,
      driverName: selectedDriverDetails?.id,
      driverContactNo: data?.driverContactNo,
      conductorName: selectedConductorDetails?.id,
      conductorContactNo: data?.conductorContactNo,
      baseDepot: data?.baseDepot,
      allotedRouteNo: data?.routeId,
      isFixed: data?.isFixed,
    };
  };

  selectedDate: any;
  redirectToAddForm() {
    const dateInput = document.querySelector(
      'input[name="date"]'
    ) as HTMLInputElement;
    if (dateInput) {
      this.selectedDate = dateInput.value;
    }

    if (!this.selectedDate) {
      this.toastr.warning('Please select a date before proceeding.', 'Date Required');
      return;
    }

    this.router.navigate(['/daily-update'], {
      queryParams: {
        date: this.selectedDate,
        busId: this.selectedData.id,
        currentStatus: 'running',
        noOfTrip: 0,
      },
    });
  }

  redirectToUpdateForm(data: any) {
    const dateInput = document.querySelector(
      'input[name="date"]'
    ) as HTMLInputElement;
    console.log('data ==> ', data);

    if (!data.id) {
      this.toastr.error('Vehicle log ID was not found.', 'Error');
      return;
    }

    this.router.navigate(['/daily-update'], {
      queryParams: {
        busId: data.id,
        triptId: data.dailyUpdateId,
        currentStatus: 'finished',
        type: 'update',
      },
    });
  }

  // newRoundTrip:any = this.selectedData || 0;
  newRoundTrip: any;

  updateTrip() {
    if (this.newRoundTrip) {
      const ENDPOINT = `${environment.BASE_URL}/api/updateDailyUpdates`;
      const requestOptions = {
        requestObject: { noOfTrip: this.newRoundTrip },
        id: this.selectedData.dailyUpdateId,
      };
      this.http.post(ENDPOINT, requestOptions).subscribe(
        (response) => {
          this.getBuses();
          this.toastr.success('Trip updated successfully', 'Success Message');
        },
        (error) => {
          console.log('error here ', error);
          this.toastr.error('Something went wrong !', 'Warning');
        },
        () => {
          console.log('Observable is now completed.');
        }
      );
    }
  }

  toggleFixed(data: any, event: any) {
    console.log('data', event.target.checked);
    

    // return;
    const ENDPOINT = `${environment.BASE_URL}/api/updateBus`;
    const requestOptions = {
      requestObject: { 
        isFixed: event.target.checked ? 'yes' : 'no', 
        id: data.id, 
      },
      
    };
    this.http.post(ENDPOINT, requestOptions).subscribe(
      (response) => {
        this.getBuses();
        this.toastr.success('Bus updated successfully', 'Success Message');
      },
      (error) => {
        console.log('error here ', error);
        this.toastr.error('Something went wrong !', 'Warning');
      },
      () => {
        console.log('Observable is now completed.');
      }
    );
  }

  generatePDF(): void {
    if (!this.busList || this.busList.length === 0) {
      this.toastr.warning('No logsheet records to generate report', 'Warning');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');

    const headers = [[
      '#',
      'Vehicle No',
      'Driver Name',
      'Operator Name',
      'Operator Contact',
      'Depot',
      'Route',
      'Current Status'
    ]];

    const rows = this.busList.map((item: any, index: number) => [
      index + 1,
      item.vehicle_no || '-',
      item.driver_name || '-',
      item.operator_name || '-',
      item.operator_contact_no || '-',
      item.depot || '-',
      item.routeNo || '-',
      (item.currentStatus || 'idle').toUpperCase() + (item.currentStatus === 'running' && item.noOfTrip ? ` (${item.noOfTrip} Trips)` : '')
    ]);

    doc.setFontSize(16);
    doc.text('GMC - Vehicle Shift Logsheet Report', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Log Date: ${this.dataForDate || new Date().toISOString().split('T')[0]}  |  Total Entries: ${this.busList.length}  |  Generated: ${new Date().toLocaleString()}`, 14, 22);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 26,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    doc.save(`GMC_Vehicle_Logsheet_${this.dataForDate || 'report'}_${new Date().getTime()}.pdf`);
    this.toastr.success('Logsheet report generated successfully!', 'Success');
  }

}
