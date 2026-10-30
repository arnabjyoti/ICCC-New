import { Component, OnInit } from '@angular/core';
import { VehicleRoutesService } from './vehicle-routes.service';
import { ToastrService } from 'ngx-toastr';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

declare var $: any;

@Component({
  selector: 'app-vehicle-routes',
  templateUrl: './vehicle-routes.component.html',
  styleUrls: ['./vehicle-routes.component.css']
})
export class VehicleRoutesComponent implements OnInit {
  routes: any[] = [];
  filteredRoutes: any[] = [];
  searchText: string = '';
  selectedRoute: any = {};
  routeToDelete: any = null;
  isLoading: boolean = false;

  constructor(
    private routeService: VehicleRoutesService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.getRoutes();
  }

  getRoutes(): void {
    this.isLoading = true;
    this.routeService.getVehicleRoutes().subscribe({
      next: (data: any) => {
        this.routes = data || [];
        this.filterRoutes();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.toastr.error('Failed to fetch routes list.', 'Error');
      }
    });
  }

  filterRoutes(): void {
    if (!this.searchText || !this.searchText.trim()) {
      this.filteredRoutes = [...(this.routes || [])];
      return;
    }
    const q = this.searchText.trim().toLowerCase();
    this.filteredRoutes = (this.routes || []).filter((r: any) => {
      return (
        (r.routeNo && r.routeNo.toString().toLowerCase().includes(q)) ||
        (r.routeName && r.routeName.toString().toLowerCase().includes(q)) ||
        (r.depot && r.depot.toString().toLowerCase().includes(q)) ||
        (r.start && r.start.toString().toLowerCase().includes(q)) ||
        (r.end && r.end.toString().toLowerCase().includes(q)) ||
        (r.via && r.via.toString().toLowerCase().includes(q)) ||
        (r.routeDistance && r.routeDistance.toString().toLowerCase().includes(q)) ||
        (r.status && r.status.toString().toLowerCase().includes(q))
      );
    });
  }

  clearSearch(): void {
    this.searchText = '';
    this.filterRoutes();
  }

  openAddModal(): void {
    this.selectedRoute = {
      depot: '',
      start: '',
      end: '',
      via: '',
      routeNo: '',
      routeName: '',
      routeDistance: '',
      depot_to_start_distance: '',
      end_to_depot_distance: '',
      status: 'Active'
    };
    $('#formModal').modal('show');
  }

  openEditModal(route: any): void {
    this.selectedRoute = { ...route };
    $('#formModal').modal('show');
  }

  validateRoute(): boolean {
    if (!this.selectedRoute.routeName || !this.selectedRoute.routeName.trim()) {
      this.toastr.warning('Please enter a Route Name.', 'Validation Warning');
      return false;
    }
    if (!this.selectedRoute.routeNo || !this.selectedRoute.routeNo.trim()) {
      this.toastr.warning('Please enter a Route Number.', 'Validation Warning');
      return false;
    }
    return true;
  }

  saveRoute(): void {
    if (!this.validateRoute()) return;

    this.routeService.saveRoute(this.selectedRoute).subscribe({
      next: () => {
        this.toastr.success('Route saved successfully!', 'Success');
        $('#formModal').modal('hide');
        this.getRoutes();
      },
      error: (err) => {
        this.toastr.error('Failed to save route. Please try again.', 'Error');
      }
    });
  }

  updateRoute(): void {
    if (!this.validateRoute()) return;

    this.routeService.updateRoute(this.selectedRoute).subscribe({
      next: () => {
        this.toastr.success('Route updated successfully!', 'Success');
        $('#formModal').modal('hide');
        this.getRoutes();
      },
      error: (err) => {
        this.toastr.error('Failed to update route.', 'Error');
      }
    });
  }

  confirmDeleteRoute(route: any): void {
    this.routeToDelete = route;
    $('#deleteModal').modal('show');
  }

  deleteRoute(): void {
    if (!this.routeToDelete || !this.routeToDelete.id) return;

    const data = {
      requestObject: { id: this.routeToDelete.id }
    };

    this.routeService.deleteRoute(data).subscribe({
      next: () => {
        this.toastr.success('Route deleted successfully!', 'Success');
        $('#deleteModal').modal('hide');
        this.routeToDelete = null;
        this.getRoutes();
      },
      error: (err) => {
        this.toastr.error('Failed to delete route.', 'Error');
      }
    });
  }

  exportToExcel(): void {
    const listToExport = (this.searchText && this.searchText.trim()) ? this.filteredRoutes : this.routes;
    if (!listToExport || listToExport.length === 0) {
      this.toastr.warning('No routes data available to export.', 'Warning');
      return;
    }

    const excelRows = listToExport.map((item: any, index: number) => ({
      '#': index + 1,
      'Route No': item.routeNo || '-',
      'Route Name': item.routeName || '-',
      'Depot': item.depot || '-',
      'Start Point': item.start || '-',
      'End Point': item.end || '-',
      'Via Transit': item.via || '-',
      'Route Distance (KM)': item.routeDistance ? `${item.routeDistance} km` : '-',
      'Depot to Start (KM)': item.depot_to_start_distance ? `${item.depot_to_start_distance} km` : '-',
      'End to Depot (KM)': item.end_to_depot_distance ? `${item.end_to_depot_distance} km` : '-',
      'Status': item.status || 'Active'
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelRows);

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 26 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 }
    ];

    const workbook: XLSX.WorkBook = {
      Sheets: { 'Routes': worksheet },
      SheetNames: ['Routes']
    };

    XLSX.writeFile(workbook, `GMC_Vehicle_Routes_${new Date().getTime()}.xlsx`);
    this.toastr.success('Vehicle routes catalog exported to Excel successfully!', 'Success');
  }

  generatePDF(): void {
    const listToExport = (this.searchText && this.searchText.trim()) ? this.filteredRoutes : this.routes;
    if (!listToExport || listToExport.length === 0) {
      this.toastr.warning('No routes found to generate report.', 'Warning');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');

    const headers = [[
      '#',
      'Route No',
      'Route Name',
      'Depot',
      'Start Point',
      'End Point',
      'Via Transit',
      'Distance (KM)',
      'Status'
    ]];

    const rows = listToExport.map((r: any, index: number) => [
      index + 1,
      r.routeNo || '-',
      r.routeName || '-',
      r.depot || '-',
      r.start || '-',
      r.end || '-',
      r.via || '-',
      r.routeDistance ? `${r.routeDistance} km` : '-',
      (r.status || 'Active').toUpperCase()
    ]);

    doc.setFontSize(16);
    doc.text('GMC - Vehicle Pre-Fixed Routes Catalog Report', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Total Routes: ${listToExport.length}  |  Generated: ${new Date().toLocaleString()}`, 14, 22);

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

    doc.save(`GMC_Vehicle_Routes_Report_${new Date().getTime()}.pdf`);
    this.toastr.success('Vehicle routes report generated successfully!', 'Success');
  }
}