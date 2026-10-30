import { Component, OnInit } from '@angular/core';
import { VehicleMasterService } from './vehicle-master.service';
import { VehicleService } from '../vehicle.service';
import { ToastrService } from 'ngx-toastr';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

declare var $: any;

@Component({
  selector: 'app-vehicle-master',
  templateUrl: './vehicle-master.component.html',
  styleUrls: ['./vehicle-master.component.css']
})
export class VehicleMasterComponent implements OnInit {

  vehicles: any[] = [];
  dbVehicles: any[] = [];

  loading = false;

  selectedVehicle: any = {};
  routes:any[] = [];
  operators: any[] = [];
  drivers: any[] = [];

  today: string = '';

  totalVehicles = 0;
  activeVehicles = 0;
  stoppedVehicles = 0;
  ignitionOnVehicles = 0;
  unreachableVehicles = 0;

  filteredVehicles: any[] = [];
  paginatedVehicles: any[] = [];
  searchText: string = '';

  pageSize: number = 10;
  pageSizeOptions: number[] = [10, 30, 50, 100];
  currentPage: number = 1;

  previousVehiclesMap = new Map<string, any>();

  constructor(
    private VehicleMasterService: VehicleMasterService,
    private vehicleService: VehicleService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {

    this.loading = true;

    this.today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    this.loadOperators();
    this.loadDrivers();
    this.getRoutes();

    // ⭐ Load DB vehicles once
    this.VehicleMasterService.getVehicleMaster().subscribe((db:any)=>{

      this.dbVehicles = db;

      // ⭐ Start listening to socket updates
      this.listenVehicleSocket();

    });

  }


/* =====================================================
   LIVE VEHICLE SOCKET
===================================================== */

listenVehicleSocket(){

  this.vehicleService.onVehicleUpdate((apiVehicles:any[])=>{

    this.vehicles = apiVehicles.map((api:any)=>{

      const db = this.dbVehicles.find(
        (d:any)=> d.vehicle_no == api.VehName
      );

      const key = api.VehName || api.BoxId;
      const prev = this.previousVehiclesMap.get(key);

      let speedChanged = false;
      let statusChanged = false;
      let locationChanged = false;
      let justUpdated = false;

      if (prev) {
        speedChanged = String(prev.Speed) !== String(api.Speed);
        statusChanged = prev.VehicleStatus !== api.VehicleStatus;
        locationChanged = prev.Location !== api.Location;
        justUpdated = speedChanged || statusChanged || locationChanged;
      }

      // Cache for next tick comparison
      this.previousVehiclesMap.set(key, {
        Speed: api.Speed,
        VehicleStatus: api.VehicleStatus,
        Location: api.Location
      });

      return {

        ...api,

        db_id: db?.id,
        division: db?.division,
        vehicle_type: db?.vehicle_type,
        operates_on: db?.operates_on || 'Fuel',
        capacity: db?.capacity,
        owner_name: db?.owner_name,

        route_id: db?.route_id,

        operator_id: db?.operator_id,
        driver_id: db?.driver_id,

        operator_name: db?.operator?.operator_name,
        driver_name: db?.driver?.driver_name,

        route_name: db?.route?.routeName,

        speedChanged,
        statusChanged,
        locationChanged,
        justUpdated

      };

    }).sort((a:any,b:any)=> a.VehName.localeCompare(b.VehName));


    // Auto-clear highlight flags after 3 seconds
    setTimeout(() => {
      this.vehicles.forEach(v => {
        v.speedChanged = false;
        v.statusChanged = false;
        v.locationChanged = false;
        v.justUpdated = false;
      });
    }, 3000);

    // Apply active search filter without resetting user's view
    this.applySearchFilter();


    /* ---------- DASHBOARD STATS ---------- */

    this.totalVehicles = this.vehicles.length;

    this.activeVehicles =
      this.vehicles.filter(v => v.VehicleStatus === "Moving").length;

    this.stoppedVehicles =
      this.vehicles.filter(v => v.VehicleStatus === "Stopped").length;

    this.ignitionOnVehicles =
      this.vehicles.filter(v => v.VehicleStatus === "IgnitionOn" || v.VehicleStatus === "Idle").length;

    this.unreachableVehicles =
      this.vehicles.filter(v => v.VehicleStatus === "Unreachable").length;


    this.loading = false;

  });

}



/* =====================================================
   SEARCH VEHICLE (Filter without page reload / reset)
===================================================== */

searchVehicle() {
  this.currentPage = 1;
  this.applySearchFilter();
}

clearSearch() {
  this.searchText = '';
  this.currentPage = 1;
  this.applySearchFilter();
}

applySearchFilter() {
  const value = (this.searchText || '').toLowerCase().trim();
  if (!value) {
    this.filteredVehicles = [...this.vehicles];
  } else {
    this.filteredVehicles = this.vehicles.filter((v:any)=>
      (v.VehName && v.VehName.toLowerCase().includes(value)) ||
      (v.operator_name && v.operator_name.toLowerCase().includes(value)) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(value)) ||
      (v.BoxId && v.BoxId.toLowerCase().includes(value)) ||
      (v.division && v.division.toLowerCase().includes(value)) ||
      (v.vehicle_type && v.vehicle_type.toLowerCase().includes(value)) ||
      (v.operates_on && v.operates_on.toLowerCase().includes(value)) ||
      (v.VehicleStatus && v.VehicleStatus.toLowerCase().includes(value)) ||
      (v.Location && v.Location.toLowerCase().includes(value))
    );
  }
  this.updatePaginatedVehicles();
}

get totalPages(): number {
  return Math.ceil(this.filteredVehicles.length / Number(this.pageSize)) || 1;
}

get paginationStartIndex(): number {
  if (this.filteredVehicles.length === 0) return 0;
  return (this.currentPage - 1) * Number(this.pageSize) + 1;
}

get paginationEndIndex(): number {
  return Math.min(this.currentPage * Number(this.pageSize), this.filteredVehicles.length);
}

updatePaginatedVehicles() {
  const total = this.filteredVehicles.length;
  const maxPages = Math.ceil(total / Number(this.pageSize)) || 1;
  if (this.currentPage > maxPages) {
    this.currentPage = maxPages;
  }
  if (this.currentPage < 1) {
    this.currentPage = 1;
  }
  const start = (this.currentPage - 1) * Number(this.pageSize);
  const end = start + Number(this.pageSize);
  this.paginatedVehicles = this.filteredVehicles.slice(start, end);
}

onPageSizeChange() {
  this.pageSize = Number(this.pageSize);
  this.currentPage = 1;
  this.updatePaginatedVehicles();
}

goToPage(page: number) {
  if (page < 1 || page > this.totalPages || page === this.currentPage) return;
  this.currentPage = page;
  this.updatePaginatedVehicles();
}

nextPage() {
  if (this.currentPage < this.totalPages) {
    this.goToPage(this.currentPage + 1);
  }
}

prevPage() {
  if (this.currentPage > 1) {
    this.goToPage(this.currentPage - 1);
  }
}

get visiblePages(): (number | string)[] {
  const total = this.totalPages;
  const current = this.currentPage;
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | string)[] = [];
  pages.push(1);
  if (current > 3) {
    pages.push('...');
  }
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (current < total - 2) {
    pages.push('...');
  }
  pages.push(total);
  return pages;
}

trackByVehicle(index: number, v: any): string {
  return v.VehName || v.BoxId || index.toString();
}



/* =====================================================
   OPEN SAVE MODAL
===================================================== */

openSaveModal(v: any) {

  this.selectedVehicle = {

    vehicle_no: v.VehName,
    division: v.division,
    vehicle_type: v.vehicle_type,
    operates_on: v.operates_on || 'Fuel',
    capacity: v.capacity,
    owner_name: v.owner_name,
    route_id: v.route_id,
    operator_id: v.operator_id,
    driver_id: v.driver_id,

    box_id: v.BoxId,
    speed: v.Speed,
    status: v.VehicleStatus,
    location: v.Location

  };

  $('#vehicleModal').modal('show');

}


/* =====================================================
   SAVE VEHICLE
===================================================== */

saveVehicle(){
  if (!this.selectedVehicle.vehicle_no) {
    this.toastr.warning('Vehicle registration number is required.', 'Validation Warning');
    return;
  }

  this.VehicleMasterService.saveVehicle(this.selectedVehicle)
  .subscribe({
    next:()=>{
      this.toastr.success('Vehicle registered successfully.', 'Success');
      $('#vehicleModal').modal('hide');
      this.reloadDbVehicles();
    },
    error:(err)=>{
      console.log(err);
      this.toastr.error('Failed to register vehicle. Please try again.', 'Error');
    }
  });
}


/* =====================================================
   OPEN UPDATE MODAL
===================================================== */

openUpdateModal(v:any){
  let dbId = v.db_id;
  if (!dbId && this.dbVehicles) {
    const match = this.dbVehicles.find(
      (d: any) => (d.vehicle_no && d.vehicle_no === v.VehName) || (d.box_id && d.box_id === v.BoxId)
    );
    if (match) dbId = match.id;
  }

  this.selectedVehicle = {
    id: dbId,
    vehicle_no: v.VehName,
    division: v.division,
    vehicle_type: v.vehicle_type,
    operates_on: v.operates_on || 'Fuel',
    capacity: v.capacity,
    owner_name: v.owner_name,
    route_id: v.route_id,
    operator_id: v.operator_id,
    driver_id: v.driver_id,
    box_id: v.BoxId,
    speed: v.Speed,
    status: v.VehicleStatus,
    location: v.Location
  };

  $('#vehicleModal').modal('show');
}


/* =====================================================
   UPDATE VEHICLE
===================================================== */

updateVehicleModal(){
  if (!this.selectedVehicle.id && !this.selectedVehicle.vehicle_no) {
    this.toastr.warning('Please select a valid vehicle to update.', 'Validation Warning');
    return;
  }

  this.VehicleMasterService.updateVehicle(this.selectedVehicle)
  .subscribe({
    next:()=>{
      this.toastr.success('Vehicle details updated successfully.', 'Success');
      $('#vehicleModal').modal('hide');
      this.reloadDbVehicles();
    },
    error:(err)=>{
      console.log(err);
      this.toastr.error('Failed to update vehicle details.', 'Error');
    }
  });
}



/* =====================================================
   RELOAD DB VEHICLES
===================================================== */

reloadDbVehicles(){

  this.VehicleMasterService.getVehicleMaster()
  .subscribe((data:any)=>{

    this.dbVehicles = data;

    // Immediately reflect the updated DB records into the live vehicle list and UI
    if (this.vehicles && this.vehicles.length) {
      this.vehicles = this.vehicles.map((v: any) => {
        const db = this.dbVehicles.find(
          (d: any) => (d.vehicle_no && d.vehicle_no === v.VehName) || (d.box_id && d.box_id === v.BoxId)
        );

        if (db) {
          return {
            ...v,
            db_id: db.id,
            division: db.division,
            vehicle_type: db.vehicle_type,
            operates_on: db.operates_on || 'Fuel',
            capacity: db.capacity,
            owner_name: db.owner_name,
            route_id: db.route_id,
            operator_id: db.operator_id,
            driver_id: db.driver_id,
            operator_name: db.operator?.operator_name,
            driver_name: db.driver?.driver_name,
            route_name: db.route?.routeName
          };
        }
        return v;
      });

      this.applySearchFilter();
    }

  });

}



/* =====================================================
   LOAD OPERATORS
===================================================== */

loadOperators(){

  this.VehicleMasterService.getOperators().subscribe({

    next:(res)=>{

      this.operators = res;

    },

    error:(err)=>{

      console.log(err);

    }

  });

}



/* =====================================================
   LOAD DRIVERS
===================================================== */

loadDrivers(){

  this.VehicleMasterService.getDrivers().subscribe({

    next:(res)=>{

      this.drivers = res;

    },

    error:(err)=>{

      console.log(err);

    }

  });

}



/* =====================================================
   LOAD ROUTES
===================================================== */

getRoutes(){

  this.VehicleMasterService.getRoutes()
  .subscribe((data:any)=>{

    this.routes = data;

  });

}



/* =====================================================
   FORMAT DATE
===================================================== */

formatDate(date: string): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  const pad = (n: number) => n < 10 ? '0' + n : n;
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const yr = String(d.getFullYear()).slice(-2);
  const hrs = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${day}/${month}/${yr} ${hrs}:${mins}`;
}




generatePDF() {

  const doc = new jsPDF('l', 'mm', 'a4');

  const headers = [[
    '#',
    'Division',
    'Vehicle No',
    'Vehicle Type',
    'Operates On',
    'Supervisor',
    'Driver',
    'Box ID',
    'Speed',
    'Status',
    'Location',
    'Last Update',
    'Distance'
  ]];

  const rows = this.vehicles.map((item: any, index: number) => [
    index + 1,
    item.division || '-',
    item.VehName || '-',
    item.vehicle_type || '-',
    item.operates_on || 'Fuel',
    item.operator_name || '-',
    item.driver_name || '-',
    item.BoxId || '-',
    item.Speed !== undefined && item.Speed !== null ? item.Speed + ' km/h' : '-',
    item.VehicleStatus || '-',
    item.Location || '-',
    this.formatDate(item.Lastdate),
    item.Distance !== undefined && item.Distance !== null ? item.Distance + ' km' : '-'
  ]);

  doc.setFontSize(15);
  doc.text('GMC Fleet Master & Tracking Report', 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')} | Total Vehicles: ${this.vehicles.length}`, 14, 21);

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 25,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7.5,
      overflow: 'linebreak'
    },
    columnStyles: {
      10: { cellWidth: 55 }, // Location column
      7: { cellWidth: 28 }   // Box ID column
    }
  });

  doc.save(`GMC_Vehicle_Report_${new Date().getTime()}.pdf`);
  this.toastr.success('PDF report exported successfully.', 'Export Complete');
}

/* =====================================================
   EXPORT EXCEL
===================================================== */
exportToExcel() {
  if (!this.vehicles || this.vehicles.length === 0) {
    this.toastr.warning('No fleet data available to export.', 'Warning');
    return;
  }

  const excelRows = this.vehicles.map((item: any, index: number) => ({
    '#': index + 1,
    'Division': item.division || '-',
    'Vehicle No': item.VehName || '-',
    'Vehicle Type': item.vehicle_type || '-',
    'Operates On': item.operates_on || 'Fuel',
    'Supervisor': item.operator_name || '-',
    'Driver': item.driver_name || '-',
    'Box ID': item.BoxId || '-',
    'Speed (km/h)': item.Speed !== undefined && item.Speed !== null ? item.Speed : '-',
    'Status': item.VehicleStatus || '-',
    'Location': item.Location || '-',
    'Last Update': this.formatDate(item.Lastdate),
    'Distance (km)': item.Distance !== undefined && item.Distance !== null ? item.Distance : '-',
    'Capacity': item.capacity ? item.capacity + ' Tons' : '-',
    'Ownership': item.owner_name || '-',
    'Route': item.route_name || '-'
  }));

  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelRows);
  
  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 5 },  // #
    { wch: 16 }, // Division
    { wch: 15 }, // Vehicle No
    { wch: 22 }, // Vehicle Type
    { wch: 14 }, // Operates On
    { wch: 18 }, // Supervisor
    { wch: 18 }, // Driver
    { wch: 15 }, // Box ID
    { wch: 14 }, // Speed
    { wch: 14 }, // Status
    { wch: 35 }, // Location
    { wch: 18 }, // Last Update
    { wch: 14 }, // Distance
    { wch: 12 }, // Capacity
    { wch: 20 }, // Ownership
    { wch: 24 }  // Route
  ];

  const workbook: XLSX.WorkBook = {
    Sheets: { 'Vehicle Fleet': worksheet },
    SheetNames: ['Vehicle Fleet']
  };

  XLSX.writeFile(workbook, `GMC_Vehicle_Fleet_${new Date().getTime()}.xlsx`);
  this.toastr.success('Excel report exported successfully.', 'Export Complete');
}

}