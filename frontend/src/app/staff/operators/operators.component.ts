import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from 'src/app/app.service';
import { environment } from 'src/environments/environment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-operators',
  templateUrl: './operators.component.html',
  styleUrls: ['./operators.component.css']
})
export class OperatorsComponent {

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
    operator_id: '',
    operator_name: '',
    designation: '',
    contact_no: '',
    aadhaar: '',
    pan: '',
    voter: '',
    address: '',
    license_no: '',
    photo: null
  };

  operatorList: any[] = [];

  ngOnInit(): void {
    this.getOperators();
  }

  isEdit: boolean = false;

  openNewOperatorDialog = () => {
    this.isEdit = false;

    this.form1 = {
      operator_id: '',
      operator_name: '',
      designation: '',
      contact_no: '',
      aadhaar: '',
      pan: '',
      voter: '',
      address: '',
      license_no: '',
      photo: null
    };

    this.imagePreview = null;
  };

  onPhotoChange(event: any) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastr.warning('Only image files allowed');
      return;
    }

    this.form1.photo = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result;
    };

    reader.readAsDataURL(file);
  }

  saveData = (form: any) => {
    // 1. Required fields: ID, Full Name, Designation
    if (!this.form1.operator_id || !this.form1.operator_id.trim()) {
      this.toastr.warning('Supervisor ID is required.', 'Validation Warning');
      return;
    }
    if (!this.form1.operator_name || !this.form1.operator_name.trim()) {
      this.toastr.warning('Supervisor Full Name is required.', 'Validation Warning');
      return;
    }
    if (!this.form1.designation || !this.form1.designation.trim()) {
      this.toastr.warning('Designation is required.', 'Validation Warning');
      return;
    }

    // Check unique supervisor ID
    const isDuplicateId = (this.operatorList || []).some(
      (o: any) => String(o.operator_id || '').trim().toLowerCase() === this.form1.operator_id.trim().toLowerCase()
    );
    if (isDuplicateId) {
      this.toastr.error('Supervisor ID already exists. Please choose a unique ID.', 'Duplicate ID');
      return;
    }

    const formData = new FormData();
    formData.append('operator_id', this.form1.operator_id.trim());
    formData.append('operator_name', this.form1.operator_name.trim());
    formData.append('designation', this.form1.designation.trim());
    formData.append('contact_no', this.form1.contact_no || '');
    formData.append('aadhaar', this.form1.aadhaar || '');
    formData.append('pan', this.form1.pan || '');
    formData.append('voter', this.form1.voter || '');
    formData.append('address', this.form1.address || '');
    formData.append('license_no', this.form1.license_no || '');
    if (this.form1.photo) {
      formData.append('photo', this.form1.photo);
    }

    const ENDPOINT = `${environment.BASE_URL}/api/saveOperator`;

    this.http.post(ENDPOINT, formData).subscribe(
      (response: any) => {
        this.getOperators();
        this.resetForm1();
        this.toastr.success('Supervisor added successfully', 'Success');
        this.imagePreview = null;
        (window as any).$('#operatorFormModal').modal('hide');
      },
      (error: any) => {
        console.error(error);
        const errMsg = error?.error?.message || 'Something went wrong !';
        this.toastr.error(errMsg, 'Error');
      }
    );
  };

  openEditOperatorDialog = (data: any) => {
    this.isEdit = true;

    this.form1 = {
      id: data?.id,
      operator_id: data?.operator_id,
      operator_name: data?.operator_name,
      designation: data?.designation || '',
      contact_no: data?.contact_no,
      aadhaar: data?.aadhaar,
      pan: data?.pan,
      voter: data?.voter,
      address: data?.address,
      license_no: data?.license_no,
      photo: null,
      old_photo: data?.photo
    };

    if (data?.photo) {
      this.imagePreview = `${environment.BASE_URL}/docs/${data.photo}`;
    }
  };

  updateData = () => {
    if (!this.form1.id) {
      this.toastr.warning('Something went wrong!', 'Warning');
      return;
    }

    if (!this.form1.operator_id || !this.form1.operator_id.trim()) {
      this.toastr.warning('Supervisor ID is required.', 'Validation Warning');
      return;
    }
    if (!this.form1.operator_name || !this.form1.operator_name.trim()) {
      this.toastr.warning('Supervisor Full Name is required.', 'Validation Warning');
      return;
    }
    if (!this.form1.designation || !this.form1.designation.trim()) {
      this.toastr.warning('Designation is required.', 'Validation Warning');
      return;
    }

    const formData = new FormData();
    formData.append('id', this.form1.id);
    formData.append('operator_id', this.form1.operator_id.trim());
    formData.append('operator_name', this.form1.operator_name.trim());
    formData.append('designation', this.form1.designation.trim());
    formData.append('contact_no', this.form1.contact_no || '');
    formData.append('aadhaar', this.form1.aadhaar || '');
    formData.append('pan', this.form1.pan || '');
    formData.append('voter', this.form1.voter || '');
    formData.append('address', this.form1.address || '');
    formData.append('license_no', this.form1.license_no || '');
    formData.append('old_photo', this.form1.old_photo || '');
    if (this.form1.photo) {
      formData.append('photo', this.form1.photo);
    }

    const ENDPOINT = `${environment.BASE_URL}/api/updateOperator`;

    this.http.post(ENDPOINT, formData).subscribe(
      () => {
        this.getOperators();
        this.resetForm1();
        this.imagePreview = null;
        this.toastr.success('Supervisor record updated successfully', 'Success');
        (window as any).$('#operatorFormModal').modal('hide');
      },
      (error: any) => {
        const errMsg = error?.error?.message || 'Something went wrong!';
        this.toastr.error(errMsg, 'Error');
      }
    );
  };

  getOperators = () => {
    const ENDPOINT = `${environment.BASE_URL}/api/getOperator`;
    this.http.get(ENDPOINT).subscribe(
      (response: any) => {
        this.operatorList = response || [];
      },
      (error) => {
        console.error(error);
        this.toastr.error('Something went wrong !', 'Warning');
      }
    );
  };

  resetForm1() {
    this.form1 = {};
    this.isEdit = false;
  }

  closeForm() {
    this.imagePreview = null;
  }

  toBeDeletedOperatorRecord: any = {};

  openConfirmationDialog = (data: any) => {
    this.toBeDeletedOperatorRecord = data;
  }

  handleDeleteOperator = () => {
    if (this.toBeDeletedOperatorRecord.id != '') {
      const ENDPOINT = `${environment.BASE_URL}/api/deleteOperator`;
      const requestOptions = {
        requestObject: this.toBeDeletedOperatorRecord,
      };

      this.http.post(ENDPOINT, requestOptions).subscribe(
        () => {
          this.getOperators();
          this.toastr.success("Supervisor deleted successfully", "Success");
          (window as any).$('#deleteOperatorModal').modal('hide');
        },
        (error) => {
          console.error(error);
          this.toastr.error("Something went wrong !", "Warning");
        }
      );
    }
  };

  selectedData: any;

  viewOperatorData = (id: any) => {
    this.selectedData = this.operatorList[id];
  };

  generatePDF(): void {
    if (!this.operatorList || this.operatorList.length === 0) {
      this.toastr.warning('No supervisors found to generate report', 'Warning');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');

    const headers = [[
      '#',
      'Supervisor ID',
      'Supervisor Name',
      'Designation',
      'Contact Number',
      'License / ID',
      'Address',
      'Status'
    ]];

    const rows = this.operatorList.map((o: any, index: number) => [
      index + 1,
      o.operator_id || '-',
      o.operator_name || '-',
      o.designation || '-',
      o.contact_no || '-',
      o.license_no || o.aadhaar || '-',
      o.address || '-',
      (o.status || 'Active').toUpperCase()
    ]);

    doc.setFontSize(16);
    doc.text('GMC - Supervisor Directory Report', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Total Supervisors: ${this.operatorList.length}  |  Generated: ${new Date().toLocaleString()}`, 14, 22);

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

    doc.save(`GMC_Supervisor_Directory_Report_${new Date().getTime()}.pdf`);
    this.toastr.success('Supervisor directory report generated successfully!', 'Success');
  }
}