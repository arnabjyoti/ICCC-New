import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from 'src/app/app.service';
import { environment } from 'src/environments/environment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-drivers',
  templateUrl: './drivers.component.html',
  styleUrls: ['./drivers.component.css']
})
export class DriversComponent {

  public endpoint: string;
  constructor(
    private appService: AppService,
    private http: HttpClient,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.endpoint = environment.BASE_URL;
  }

  imagePreview: string | ArrayBuffer | null = null;

  form1: any = {
    driver_id: '',
    driver_name: '',
    contact_no: '',
    aadhaar: '',
    pan: '',
    voter: '',
    dl: '',
    address: '',
    photo: null,
  };

  busDriverList: any;
  driverList: any[] = [];
  filteredDriverList: any[] = [];
  searchText: string = '';

  ngOnInit(): void {
    this.getDrivers();
  }


  isEdit: boolean = false;
  openNewDriverDialog = () => {
    this.isEdit = false;
    this.form1 = {
      driver_id: '',
      driver_name: '',
      contact_no: '',
      aadhaar: '',
      pan: '',
      voter: '',
      dl: '',
      address: '',
      photo: null,
    };
    this.imagePreview = null;
  };

  onPhotoChange(event: any) {
    const file = event.target.files[0];

    if (!file) return;

    // validate image
    if (!file.type.startsWith('image/')) {
      this.toastr.warning('Only image files allowed');
      return;
    }

    this.form1.photo = file;

    // preview
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result;
    };
    reader.readAsDataURL(file);
  }


  saveData = (form: any) => {
    // 1. Required fields: ID, Full Name, Contact Number
    if (!this.form1.driver_id || !this.form1.driver_id.trim()) {
      this.toastr.warning('Driver ID is required.', 'Validation Warning');
      return;
    }
    if (!this.form1.driver_name || !this.form1.driver_name.trim()) {
      this.toastr.warning('Driver Full Name is required.', 'Validation Warning');
      return;
    }
    const contact = (this.form1.contact_no || '').trim();
    if (!contact) {
      this.toastr.warning('Contact Number is required.', 'Validation Warning');
      return;
    }

    // 2. 10-digit validation
    if (!/^\d{10}$/.test(contact)) {
      this.toastr.warning('Contact Number must be exactly 10 digits.', 'Validation Warning');
      return;
    }

    // 3. Unique contact number check
    const isDuplicateContact = (this.driverList || []).some(
      (d: any) => String(d.contact_no || '').trim() === contact
    );
    if (isDuplicateContact) {
      this.toastr.error('This contact number is already registered with another driver.', 'Duplicate Contact');
      return;
    }

    // 4. Unique driver ID check
    const isDuplicateId = (this.driverList || []).some(
      (d: any) => String(d.driver_id || '').trim().toLowerCase() === this.form1.driver_id.trim().toLowerCase()
    );
    if (isDuplicateId) {
      this.toastr.error('Driver ID already exists. Please choose a unique ID.', 'Duplicate ID');
      return;
    }

    const formData = new FormData();
    formData.append('driver_id', this.form1.driver_id.trim());
    formData.append('driver_name', this.form1.driver_name.trim());
    formData.append('contact_no', contact);
    formData.append('aadhaar', this.form1.aadhaar || '');
    formData.append('pan', this.form1.pan || '');
    formData.append('voter', this.form1.voter || '');
    formData.append('dl', this.form1.dl || '');
    formData.append('address', this.form1.address || '');
    if (this.form1.photo) {
      formData.append('photo', this.form1.photo);
    }

    const ENDPOINT = `${environment.BASE_URL}/api/saveDriver`;

    this.http.post(ENDPOINT, formData).subscribe(
      (response: any) => {
        this.getDrivers();
        this.resetForm1();
        this.toastr.success('Driver registered successfully!', 'Success');
        this.imagePreview = null;
        // Close modal
        (window as any).$('#formModal').modal('hide');
      },
      (error: any) => {
        console.error('error here ', error);
        const errMsg = error?.error?.message || 'Failed to register driver. Please try again.';
        this.toastr.error(errMsg, 'Error');
      }
    );
  };

  closeForm() {
    this.imagePreview = null;
  }

  resetForm1() {
    this.form1 = {};
    this.isEdit = false;
  }

  openEditDriverDialog = (data: any) => {
    this.isEdit = true;

    this.form1 = {
      id: data?.id,
      driver_id: data?.driver_id,
      driver_name: data?.driver_name,
      contact_no: data?.contact_no,
      aadhaar: data?.aadhaar,
      pan: data?.pan,
      voter: data?.voter,
      dl: data?.dl,
      address: data?.address,
      photo: null,              // NEW FILE (optional)
      old_photo: data?.photo    // EXISTING IMAGE PATH
    };

    // show existing photo preview
    if (data?.photo) {
      this.imagePreview = `${environment.BASE_URL}/docs/${data.photo}`;
    }
  };


  updateData = () => {
    if (!this.form1.id) {
      this.toastr.warning('Something went wrong! Please try again', 'Warning');
      return;
    }

    if (!this.form1.driver_id || !this.form1.driver_id.trim()) {
      this.toastr.warning('Driver ID is required.', 'Validation Warning');
      return;
    }

    if (!this.form1.driver_name || !this.form1.driver_name.trim()) {
      this.toastr.warning('Driver Full Name is required.', 'Validation Warning');
      return;
    }

    const contact = (this.form1.contact_no || '').trim();
    if (!contact) {
      this.toastr.warning('Contact Number is required.', 'Validation Warning');
      return;
    }

    if (!/^\d{10}$/.test(contact)) {
      this.toastr.warning('Contact Number must be exactly 10 digits.', 'Validation Warning');
      return;
    }

    // Check duplicate contact excluding current driver
    const isDuplicateContact = (this.driverList || []).some(
      (d: any) => d.id !== this.form1.id && String(d.contact_no || '').trim() === contact
    );
    if (isDuplicateContact) {
      this.toastr.error('This contact number is already registered with another driver.', 'Duplicate Contact');
      return;
    }

    const formData = new FormData();
    formData.append('id', this.form1.id);
    formData.append('driver_id', this.form1.driver_id.trim());
    formData.append('driver_name', this.form1.driver_name.trim());
    formData.append('contact_no', contact);
    formData.append('aadhaar', this.form1.aadhaar || '');
    formData.append('pan', this.form1.pan || '');
    formData.append('voter', this.form1.voter || '');
    formData.append('dl', this.form1.dl || '');
    formData.append('address', this.form1.address || '');

    // send old photo path
    formData.append('old_photo', this.form1.old_photo || '');

    // send new photo ONLY if selected
    if (this.form1.photo) {
      formData.append('photo', this.form1.photo);
    }

    const ENDPOINT = `${environment.BASE_URL}/api/updateDriver`;

    this.http.post(ENDPOINT, formData).subscribe(
      () => {
        this.getDrivers();
        this.resetForm1();
        this.imagePreview = null;
        this.isEdit = false;
        this.toastr.success('Driver record updated successfully', 'Success');
        (window as any).$('#formModal').modal('hide');
      },
      (error: any) => {
        const errMsg = error?.error?.message || 'Something went wrong!';
        this.toastr.error(errMsg, 'Error');
      }
    );
  };


  getDrivers = () => {
    const ENDPOINT = `${environment.BASE_URL}/api/getDriver`;
    this.http.get(ENDPOINT).subscribe(
      (response: any) => {
        this.driverList = response || [];
        this.filterDrivers();
      },
      (error) => {
        console.error('error here ', error);
        this.toastr.error('Something went wrong !', 'Warning');
      }
    );
  };

  filterDrivers(): void {
    if (!this.searchText || !this.searchText.trim()) {
      this.filteredDriverList = [...(this.driverList || [])];
      return;
    }
    const q = this.searchText.trim().toLowerCase();
    this.filteredDriverList = (this.driverList || []).filter((d: any) => {
      return (
        (d.driver_id && d.driver_id.toString().toLowerCase().includes(q)) ||
        (d.driver_name && d.driver_name.toString().toLowerCase().includes(q)) ||
        (d.contact_no && d.contact_no.toString().toLowerCase().includes(q)) ||
        (d.dl && d.dl.toString().toLowerCase().includes(q)) ||
        (d.aadhaar && d.aadhaar.toString().toLowerCase().includes(q)) ||
        (d.pan && d.pan.toString().toLowerCase().includes(q)) ||
        (d.voter && d.voter.toString().toLowerCase().includes(q)) ||
        (d.address && d.address.toString().toLowerCase().includes(q)) ||
        (d.status && d.status.toString().toLowerCase().includes(q))
      );
    });
  }

  clearSearch(): void {
    this.searchText = '';
    this.filterDrivers();
  }

  exportToExcel(): void {
    const listToExport = (this.searchText && this.searchText.trim()) ? this.filteredDriverList : this.driverList;
    if (!listToExport || listToExport.length === 0) {
      this.toastr.warning('No driver data available to export.', 'Warning');
      return;
    }

    const excelRows = listToExport.map((item: any, index: number) => ({
      '#': index + 1,
      'Driver ID': item.driver_id || '-',
      'Driver Name': item.driver_name || '-',
      'Contact Number': item.contact_no || '-',
      'Driving License': item.dl || '-',
      'Aadhaar': item.aadhaar || '-',
      'PAN': item.pan || '-',
      'Voter ID': item.voter || '-',
      'Address': item.address || '-',
      'Status': item.status || 'Active'
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelRows);

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 32 },
      { wch: 12 }
    ];

    const workbook: XLSX.WorkBook = {
      Sheets: { 'Drivers': worksheet },
      SheetNames: ['Drivers']
    };

    XLSX.writeFile(workbook, `GMC_Driver_Directory_${new Date().getTime()}.xlsx`);
    this.toastr.success('Driver directory exported to Excel successfully!', 'Success');
  }

  toBeDeletedDriverRecord: any = {};
  openConfirmationDialog = (data: any) => {
    this.toBeDeletedDriverRecord = data;
  }

  handleDeleteDriver = () => {
    if (this.toBeDeletedDriverRecord.id != '') {
      const ENDPOINT = `${environment.BASE_URL}/api/deleteDriver`;
      const requestOptions = {
        requestObject: this.toBeDeletedDriverRecord,
      };
      this.http.post(ENDPOINT, requestOptions).subscribe(
        () => {
          this.getDrivers();
          this.toastr.success("Driver deleted successfully", "Success Message");
          (window as any).$('#deleteDriverModal').modal('hide');
        },
        (error) => {
          console.error("error here ", error);
          this.toastr.error("Something went wrong !", "Warning");
        }
      );
    } else {
      this.toastr.warning("Please enter data properly before proceed", "Warning Message");
    }
  }

  selectedData: any;
  viewDriverData = (dataOrIndex: any) => {
    if (typeof dataOrIndex === 'number') {
      this.selectedData = this.filteredDriverList[dataOrIndex] || this.driverList[dataOrIndex];
    } else {
      this.selectedData = dataOrIndex;
    }
  };

  activeTabName: any = 'Driver';
  setAddNewButton = (tabName: any) => {
    this.activeTabName = tabName;
  };

  generatePDF(): void {
    const listToExport = (this.searchText && this.searchText.trim()) ? this.filteredDriverList : this.driverList;
    if (!listToExport || listToExport.length === 0) {
      this.toastr.warning('No drivers found to generate report', 'Warning');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');

    const headers = [[
      '#',
      'Driver ID',
      'Driver Name',
      'Contact Number',
      'Driving License',
      'Aadhaar',
      'Address',
      'Status'
    ]];

    const rows = listToExport.map((d: any, index: number) => [
      index + 1,
      d.driver_id || '-',
      d.driver_name || '-',
      d.contact_no || '-',
      d.dl || '-',
      d.aadhaar || '-',
      d.address || '-',
      (d.status || 'Active').toUpperCase()
    ]);

    doc.setFontSize(16);
    doc.text('GMC - Driver Directory Report', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Total Drivers: ${listToExport.length}  |  Generated: ${new Date().toLocaleString()}`, 14, 22);

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

    doc.save(`GMC_Driver_Directory_Report_${new Date().getTime()}.pdf`);
    this.toastr.success('Driver directory report generated successfully!', 'Success');
  }
}
