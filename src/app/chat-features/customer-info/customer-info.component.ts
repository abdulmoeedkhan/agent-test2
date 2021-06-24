import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from "@angular/core";
import { MatDialog, MatSidenav } from "@angular/material";
import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { socketService } from "src/app/services/socket.service";

@Component({
  selector: "app-customer-info",
  templateUrl: "./customer-info.component.html",
  styleUrls: ["./customer-info.component.scss"]
})
export class CustomerInfoComponent implements OnInit {
  @ViewChild("sidenav", { static: true }) sidenav: MatSidenav;
  // tslint:disable-next-line:no-input-rename
  @Input() associatedCustomer: any;
  @Input() customerSuggestions: any;
  @Input() activeChannelSessions: any;
  @Input() topicId: any;
  @Output() expandCustomerInfo = new EventEmitter<any>();
  customerProfileFormData: any;

  customArray = [
    // 'media_channel',
    "customer_profile",
    "active_sessions",
    "link_profile"
  ];
  customer: any = {
    type: "Customer",
    info: {
      channel: "web",
      email: "farhan.maqbool@expertflow.com",
      firstName: "farhan",
      id: "",
      language: "en",
      lastName: "maqbool",
      name: "farhan ",
      phone: "5555",
      refId: "5555",
      url: "http://localhost:4200/"
    }
  };
  displayCustomerChannels = false;
  displayProfile = true;
  barOpened = false;
  reRouteText = "";
  outgoingCallingNumber = "+446698988";
  customerActiveSessions = [];
  options: string[] = [
    "Glenn Helgass",
    " Ev Gayforth",
    "Adam Joe Stanler",
    "Fayina Addinall",
    "Doy Ortelt",
    "Donnie Makiver",
    "Verne West-Frimley",
    " Ev Gayforth",
    "Adam Joe Stanler",
    "Fayina Addinall",
    "Doy Ortelt",
    "Donnie Makiver",
    "Verne West-Frimley",
    "Glenn Helgass",
    " Ev Gayforth"
  ];
  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.customArray, event.previousIndex, event.currentIndex);
  }
  constructor(public _socketService: socketService, private dialog: MatDialog) {}

  ngOnInit() {}

  close() {
    this.sidenav.close();
  }

  openDialog(templateRef, e): void {
    this.outgoingCallingNumber = e;

    this.dialog.open(templateRef, {
      panelClass: "calling-dialog",
      width: "350px"
    });
  }
  reRouteDialog(templateRef, e): void {
    this.reRouteText = e;

    this.dialog.open(templateRef, {
      panelClass: "re-route-dialog",
      minWidth: "450px"
    });
  }
  customerInfoToggle() {
    this.barOpened = !this.barOpened;
    this.expandCustomerInfo.emit(this.barOpened);
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log("changes ", changes);
    if (changes.associatedCustomer && changes.associatedCustomer.currentValue != undefined) {
      this.associatedCustomer = null;
      this.associatedCustomer = changes.associatedCustomer.currentValue;
      this.customerProfileFormData = this.getProfileFormData(this.associatedCustomer);
    } else if (changes.activeChannelSessions && changes.activeChannelSessions.currentValue != undefined) {
      this.activeChannelSessions = null;
      this.activeChannelSessions = changes.activeChannelSessions.currentValue;
    } else if (changes.customerSuggestions && changes.customerSuggestions.currentValue != undefined) {
      this.customerSuggestions = null;
      this.customerSuggestions = changes.activeChannelSessions.currentValue;
    }
  }

  getProfileFormData(obj) {
    let processedObj = [];
    let keys = Object.keys(obj);
    let values = Object.values(obj);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] != "id") {
        processedObj.push({ key: keys[i], value: values[i] });
      }
    }
    return processedObj;
  }

  moveSession(event) {
    event.stopPropagation();
  }

  linkCustomer(customerId) {
    this._socketService.linkCustomerWithInteraction(customerId, this.topicId);
  }
}
