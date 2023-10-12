import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { cacheService } from "../../services/cache.service";
import { httpService } from "../../services/http.service";
import { Subscription } from "rxjs";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material";
import { TranslateService } from "@ngx-translate/core";
import { snackbarService } from "src/app/services/snackbar.service";



@Component({
  selector: "app-announcement-dialog",
  templateUrl: "./announcement-dialog.component.html",
  styleUrls: ["./announcement-dialog.component.scss"]
})
export class AnnouncementDialogComponent implements OnInit {
  announceDateMin = new Date();
  maxDate;
  expireDateMax=new Date();
  expireDateMin = new Date();
  FilterSelected = "all";
  announcements = [];
  announcementsBackup: any;
  agentDetail: any;
  announcementsIndex = 0;
  isLoadMore = true;
  displayAnnouncements = [];
  announcementsFilter = "all";
  announcementTask = "create";
  teamList: any;
  selectedTeams: any;
  settings = {};
  supervisor = {};
  supervisorId = {};
  postData = {};
  fetchDataList = [];
  currentAnnouncement: any = {};
  announcementForm: FormGroup;
  editAnnouncementObj = {};
  setRowObj = {};

  announceDate = new FormControl(new Date(), [Validators.required]);
  expireDate = new FormControl(new Date(), [Validators.required]);
  teamListdata = new FormControl("", [Validators.required]);
  announcementMessage = new FormControl("", [Validators.required]);
  public formGroup = new FormGroup({
    date: new FormControl(null, [Validators.required])
  });

  constructor(
    private dialog: MatDialog,
    private _cacheService: cacheService,
    private _httpService: httpService,
    private _translateService: TranslateService,
    private _snackbarService: snackbarService,
    public dialogRef: MatDialogRef<AnnouncementDialogComponent>, @Inject(MAT_DIALOG_DATA) public dataID: any
  ) {}
  
  ngOnInit() {
    let date = new Date(this.expireDateMin);
    date.setMinutes(date.getMinutes() +10);
    this.expireDate = new FormControl(date, [Validators.required]);
    this.onValidateExpiryDate(new Date());
    // let _date = new Date();
    // _date.setDate(this.expireDateMin.getDate() + 5);
    // this.maxDate = _date;


    // this.expireDateMax=new Date(this.expireDateMin);
    // this.maxDate= this.expireDateMax.setHours(120);


  
    if (this.dataID !== null) {
      this.currentAnnouncement = this._httpService.getAnnouncementsById(this.dataID.value).subscribe(res => {
        this.setRowObj = {
          "teams": this.selectedTeams = res.teams,
          "announcementText": this.announcementMessage.setValue(res.announcementText),
          "expiryTime": this.expireDate.setValue(res.expiryTime),
          "scheduledTime": this.announceDate.setValue(res.scheduledTime),
          "supervisorId": this.supervisorId,
          "supervisorName": this.supervisor,
        }
      });

    }

    this.teamList = this._cacheService.agent.supervisedTeams;
    this.supervisor = this._cacheService.agent.username;
    this.supervisorId = this._cacheService.agent.id;
    this.selectedTeams = [];
    this.settings = {
      text: "",
      selectAllText: 'Select All',
      unSelectAllText: 'UnSelect All',
      enableSearchFilter: true,
      isFilterSelectAll: false,
      classes: "myclass custom-class",
      primaryKey: "teamId"
    };

  }

  getAllAnnouncementList() {
    this._httpService.getAnnouncements(this.supervisorId).subscribe((data) => {
      this.fetchDataList = data;

    });
  }


  onCreateAnnouncement() {

    this.postData = {
      "teams": this.selectedTeams,
      "announcementText": this.announcementMessage.value,
      "expiryTime": this.expireDate.value,
      "scheduledTime": this.announceDate.value,
      "supervisorId": this.supervisorId,
      "supervisorName": this.supervisor
    }
   
    this._httpService.addAnnouncemenent(this.postData).subscribe({
      next: (val: any) => {
        this.dialog.closeAll();
        this._snackbarService.open(this._translateService.instant("snackbar.New-Announcement"), "succ");
      },
      error: (err: any) => {
        console.error(err);
        this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-Create-New-Announcement"), "err");
        this.dialog.closeAll();
      },
    });
    this.dialog.closeAll();  
  }

  updateAnnouncement() {
   
    this.editAnnouncementObj = {
      "teams": this.selectedTeams,
      "announcementText": this.announcementMessage.value,
      "expiryTime": this.expireDate.value,// this.announceDate.setValue(this.announceDate.value),
      "scheduledTime": this.announceDate.value,
      "supervisorId": this.supervisorId,
      "supervisorName": this.supervisor,
    }
    this._httpService.updateAnnouncemenentById(this.dataID.value, this.editAnnouncementObj).subscribe({
      next: (val: any) => {
        this._snackbarService.open(this._translateService.instant("snackbar.Announcement-Updated"), "succ")
        this.dialog.closeAll();
      },
      error: (err: any) => {
        console.error(err);
        this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-Update-Announcement"), "err");
        this.dialog.closeAll();
      
      },
    });

  }

  onClose() {
    this.dialog.closeAll();
  }

 onSchduledDate(d){
  console.log(d);
 }


  onValidateExpiryDate(d) {
    let date = new Date(d);
    date.setMinutes(date.getMinutes() );
    this.expireDateMin = date;
    let _date = new Date(d);
    _date.setMinutes(_date.getMinutes() );


    this.expireDateMax=new Date(this.expireDateMin);
    this.maxDate= this.expireDateMax.setHours(120);

    this.expireDate = new FormControl(_date, [Validators.required]);
  }

  // confirmationDialog() {
  //   //this.dialog.closeAll();
  //   const dialogRef = this.dialog.open(AnnouncementDialogComponent, {
  //     width: "490px",
  //     panelClass: "confirm-dialog",
  //     data: this.postData
  //   });

  //   dialogRef.afterClosed().subscribe((result) => {
  //     this._httpService.getAnnouncements();
  //     dialogRef.close()
  //     this.dialog.closeAll();
  //   });


  // }

  onItemSelect(item: any) {
    console.log(item);
    console.log(this.selectedTeams);
  }
  OnItemDeSelect(item: any) {
    console.log("DeSelected  Team",item);
    //console.log(this.selectedTeams);
  }
  onSelectAll(items: any) {
    console.log("Selected All Teams",items);
  }
  onDeSelectAll(items: any) {
    console.log("DeSelected All Teams",items);
  }
  changeData() {
    this.selectedTeams = [];
  }
}
