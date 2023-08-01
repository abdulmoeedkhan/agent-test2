import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild, ViewEncapsulation } from "@angular/core";
import { MatDialog, MatSidenav } from "@angular/material";
import { socketService } from "src/app/services/socket.service";
import { sharedService } from "src/app/services/shared.service";
import { NavigationExtras, Router } from "@angular/router";
import { CustomerActionsComponent } from "src/app/customer-actions/customer-actions.component";
import { httpService } from "src/app/services/http.service";
import { finesseService } from "src/app/services/finesse.service";
import { cacheService } from "src/app/services/cache.service";
import * as uuid from "uuid";
import { snackbarService } from "src/app/services/snackbar.service";
import { TranslateService } from "@ngx-translate/core";
import { SipService } from "src/app/services/sip.service";

@Component({
  selector: "app-customer-info",
  templateUrl: "./customer-info.component.html",
  styleUrls: ["./customer-info.component.scss"],
  encapsulation: ViewEncapsulation.None
})
export class CustomerInfoComponent implements OnInit {
  @ViewChild("sidenav", { static: true }) sidenav: MatSidenav;
  // tslint:disable-next-line:no-input-rename
  @Input() customer: any;
  @Input() customerSuggestions: any;
  @Input() activeChannelSessions: any;
  @Input() conversationId: any;
  @Input() conversation: any;
  @Input() activeConversationData: any;
  @Input() firstChannelSession: any;
  @Output() updatedlabels = new EventEmitter<boolean>();
  @Output() expandCustomerInfo = new EventEmitter<any>();

  customerProfileFormData: any;
  timeoutId;

  // customArray = [
  //   // 'media_channel',
  //   "customer_profile",
  //   "active_sessions",
  //   "link_profile"
  // ];
  mediaChannelData = [];

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
  timer = "00:00";
  ciscoVoiceSession;
  cxVoiceSession;
  // hours: number;
  // minutes: number;
  // seconds: number;
  // drop(event: CdkDragDrop<string[]>) {
  //   moveItemInArray(this.customArray, event.previousIndex, event.currentIndex);
  // }
  constructor(
    private _router: Router,
    private _sharedService: sharedService,
    public _socketService: socketService,
    private dialog: MatDialog,
    private _httpService: httpService,
    private _finesseService: finesseService,
    private _sipService: SipService,
    private _cacheService: cacheService,
    private _snackBarService: snackbarService,
    private _translateService: TranslateService
  ) {}

  ngOnInit() {
    if (this.activeChannelSessions) this.setActiveChannelSessions(this.activeChannelSessions);
    // this._sipService.getTimer().subscribe((value) => {
    //   this.hours = Math.floor(value / 3600);
    //   this.minutes = Math.floor(value / 60);
    //   this.seconds = value % 60;
    // });
  }

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
    if (changes.customer && changes.customer.currentValue != undefined) {
      this.customer = null;
      this.customer = changes.customer.currentValue;
      this.customerProfileFormData = this.getProfileFormData(this.customer);
      this.mediaChannelData = this.getMediaChannels();
    } else if (changes.activeChannelSessions && changes.activeChannelSessions.currentValue != undefined) {
      this.activeChannelSessions = null;
      // this.activeChannelSessions = changes.activeChannelSessions.currentValue;
      // this.getVoiceChannelSession();
      this.setActiveChannelSessions(changes.activeChannelSessions.currentValue);
    } else if (changes.customerSuggestions && changes.customerSuggestions.currentValue != undefined) {
      this.customerSuggestions = null;
      this.customerSuggestions = changes.activeChannelSessions.currentValue;
    } else if (changes.firstChannelSession && changes.firstChannelSession.currentValue != undefined) {
      this.firstChannelSession = null;
      this.firstChannelSession = changes.activeChannelSessions.currentValue;
    }
  }

  setActiveChannelSessions(activeSessions: Array<any>) {
    let sessions: Array<any> = JSON.parse(JSON.stringify(activeSessions));
    sessions.forEach((item, index) => {
      // if (item.channel.channelConfig.routingPolicy.routingMode.toLowerCase() == "external") {
      if (item.channel.channelType.name.toLowerCase() == "voice") {
        if (item.state.reasonCode == "AGENT") {
          sessions.splice(index, 1);
        }
      }
    });
    this.activeChannelSessions = sessions;

    this.getVoiceChannelSession();
  }

  getVoiceChannelSession() {
    try {
      this.ciscoVoiceSession = this.activeChannelSessions.find((channelSession) => {
        if (channelSession.channel.channelType.name.toLowerCase() == "cisco_cc") {
          return channelSession;
        }
      });
      this.cxVoiceSession = this.activeChannelSessions.find((channelSession) => {
        if (channelSession.channel.channelType.name.toLowerCase() == "cx_voice") {
          return channelSession;
        }
      });

      if (this.ciscoVoiceSession) {
        let cacheId = `${this._cacheService.agent.id}:${this.ciscoVoiceSession.id}`;
        let cacheDialog: any = this._finesseService.getDialogFromCache(cacheId);
        if (cacheDialog) {
          let currentParticipant = this._finesseService.getCurrentParticipantFromDialog(cacheDialog.dialog);
          let startTime = new Date(currentParticipant.startTime);

          this._finesseService.timeoutId = setInterval(() => {
            let currentTime = new Date();
            let timedurationinMS = currentTime.getTime() - startTime.getTime();
            this.msToHMS(timedurationinMS);
          }, 1000);
        } else {
          console.log("No Dialog Found==>");
        }
      } else if (this.cxVoiceSession) {
        let cacheId = `${this._cacheService.agent.id}:${this.cxVoiceSession.id}`;
        let cacheDialog: any = this._sipService.getDialogFromCache(cacheId);
        if (cacheDialog) {
          let currentParticipant = this._sipService.getCurrentParticipantFromDialog(cacheDialog.dialog);
          let startTime = new Date(currentParticipant.startTime);

          this._sipService.timeoutId = setInterval(() => {
            let currentTime = new Date();
            let timedurationinMS = currentTime.getTime() - startTime.getTime();
            this.msToHMS(timedurationinMS);
          }, 1000);
        } else {
          console.log("No Dialog Found==>");
        }
      }

      else {
        if (this._finesseService.timeoutId) clearInterval(this._finesseService.timeoutId);
        if (this._sipService.timeoutId) clearInterval(this._sipService.timeoutId);
      }
    } catch (e) {
      console.error("[getVoiceChannelSession] Error :", e);
    }
  }

  msToHMS(ms) {
    try {
      // 1- Convert to seconds:
      let sec = ms / 1000;
      // 2- Extract hours:
      const hours = parseInt(JSON.stringify(sec / 3600)); // 3,600 seconds in 1 hour
      sec = sec % 3600; // seconds remaining after extracting hours
      // 3- Extract minutes:
      const min = parseInt(JSON.stringify(sec / 60)); // 60 seconds in 1 minute
      // 4- Keep only seconds not extracted to minutes:
      sec = Math.floor(sec % 60);

      if (hours > 0) {
        // this.timer = `${hours}:${min}:${sec}`;
        this.hourTimer(hours, min, sec);
      } else {
        if (min >= 10 && sec < 10) {
          this.timer = `${min}:0${sec}`;
        } else if (min < 10 && sec >= 10) {
          this.timer = `0${min}:${sec}`;
        } else if (min > 0 && min < 10 && sec < 10) {
          this.timer = `0${min}:0${sec}`;
        } else if (min == 0 && min < 10 && sec < 10) {
          this.timer = `0${min}:0${sec}`;
        } else {
          this.timer = `${min}:${sec}`;
        }
      }
    } catch (e) {
      console.error("[msToHMS] Error:", e);
    }
  }

  hourTimer(hour, min, sec) {
    try {
      if (hour > 0 && hour < 10) {
        if (min >= 10 && sec < 10) {
          this.timer = `0${hour}:${min}:0${sec}`;
        } else if (min < 10 && sec >= 10) {
          this.timer = `0${hour}0${min}:${sec}`;
        } else if (min > 0 && min < 10 && sec < 10) {
          this.timer = `0${hour}0${min}:0${sec}`;
        } else if (min == 0 && min < 10 && sec < 10) {
          this.timer = `0${hour}0${min}:0${sec}`;
        } else {
          this.timer = `${hour}:${min}:${sec}`;
        }
      } else {
        if (min >= 10 && sec < 10) {
          this.timer = `${hour}:${min}:0${sec}`;
        } else if (min < 10 && sec >= 10) {
          this.timer = `${hour}0${min}:${sec}`;
        } else if (min > 0 && min < 10 && sec < 10) {
          this.timer = `${hour}0${min}:0${sec}`;
        } else if (min == 0 && min < 10 && sec < 10) {
          this.timer = `${hour}0${min}:0${sec}`;
        } else {
          this.timer = `${hour}:${min}:${sec}`;
        }
      }
    } catch (e) {
      console.error("[hourTimer] Error :", e);
    }
  }

  getMediaChannels() {
    try {
      this.mediaChannelData = [];
      let mediaChannelData = [];
      this._sharedService.schema.forEach((e) => {
        if (e.isChannelIdentifier == true && this.customer.hasOwnProperty(e.key)) {
          this.customer[e.key].forEach((value) => {
            mediaChannelData.push({
              fieldType: e.type,
              value: value,
              label: e.label,
              channelList: e.channelTypes
            });
          });
        }
      });

      return mediaChannelData;
    } catch (e) {
      console.error("[getMedaiaChannels] Error:", e);
    }
  }
  startOutBoundConversation(channelCustomerIdentifier, channelTypeName) {
    // mockTopicData.customer=this.customer
    //  this._socketService.onTopicData(mockTopicData, 12345,"");
    if (!channelCustomerIdentifier) {
      this._snackBarService.open(this._translateService.instant("snackbar.Channel-Identifier-Not-Found"), "err");
    } else {
      let channelTypes = [];
      let channelType = null;
      try {
        channelTypes = JSON.parse(localStorage.getItem("channelTypes"));
        if (channelTypes) {
          channelType = channelTypes.find((e) => {
            return e.name == channelTypeName;
          });
          this._httpService.getDefaultOutboundChannel(channelType.id).subscribe(
            (data) => {
              if (data) {
                if (data.serviceIdentifier) {
                  let cimMessage = {
                    id: uuid.v4().toString(),
                    header: {
                      channelData: {
                        channelCustomerIdentifier: channelCustomerIdentifier,
                        serviceIdentifier: data.serviceIdentifier,
                        additionalAttributes: [{ key: "agentId", type: "String100", value: this._cacheService.agent.id }]
                      },
                      language: {},
                      timestamp: "",
                      securityInfo: {},
                      stamps: [],
                      intent: "AGENT_OUTBOUND",
                      entities: {},
                      customer: this.customer
                    },
                    body: {
                      type: "PLAIN",
                      markdownText: ""
                    }
                  };
                  console.log("cim==>", cimMessage);
                  this._httpService.startOutboundConversation(cimMessage).subscribe(
                    (e) => {},
                    (err) => {
                      this._sharedService.Interceptor(err.error, "err");
                      console.error("Error Starting Outbound Conversation", err);
                    }
                  );
                } else {
                  console.error("Service identifier not present");
                }
              }
            },
            (error) => {
              console.error("erro.staus", error);

              if (error.error.status == "NOT_FOUND") {
                this._snackBarService.open(
                  this._translateService.instant("snackbar.Default-Outbound-Channel-Not-Found-for-channelType") + " " + channelTypeName,
                  "err"
                );
              } else {
                this._sharedService.Interceptor(error.error, "err");
              }
              console.error("Error Starting Outbound Conversation", error);
            }
          );
        } else {
          console.error("error getting channel types from local storage", channelTypes);
        }
      } catch (e) {
        console.error("Error occurs", e);
      }
    }
  }

  getProfileFormData(obj) {
    let channelIdentifiers = [];
    this._sharedService.schema.forEach((e) => {
      if (e.isChannelIdentifier == true) {
        channelIdentifiers.push(e.key);
      }
    });

    let processedObj = [];
    let keys = Object.keys(obj);
    let values = Object.values(obj);
    for (let i = 0; i < keys.length; i++) {
      if (
        keys[i] != "_id" &&
        keys[i] != "createdAt" &&
        keys[i] != "updatedAt" &&
        keys[i] != "updatedBy" &&
        keys[i] != "createdBy" &&
        keys[i] != "__v" &&
        keys[i] != "isAnonymous" &&
        keys[i] != "labels" &&
        keys[i] != "labelNames" &&
        values[i]
      ) {
        if (!channelIdentifiers.includes(keys[i])) {
          processedObj.push({ key: keys[i], value: values[i] });
        }
      }
    }

    return processedObj;
  }
  updateProfile() {
    const dialogRef = this.dialog.open(CustomerActionsComponent, {
      panelClass: "edit-customer-dialog",
      maxWidth: "80vw",
      maxHeight: "88vh",
      // width: "818px",
      // height: "88vh",
      data: { id: this.customer._id, tab: "edit" }
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.event && result.event == "refresh") {
        this.updatedlabels.emit(result.data);
        this._httpService.getCustomerById(this.customer._id).subscribe(
          (customer) => {
            this._httpService.updateConversationCustomer(this.conversationId, customer).subscribe();
          },
          (error) => {
            this._sharedService.Interceptor(error.error, "err");
            console.error("Error Starting Outbound Conversation", error);
          }
        );
      }
    });
  }
  moveSession(event) {
    event.stopPropagation();
  }

  linkCustomer(selectedCustomer) {
    let completeSelectedCustomer = {};
    this._sharedService.schema.forEach((e) => {
      if (selectedCustomer.hasOwnProperty(e.key)) {
        completeSelectedCustomer[e.key] = selectedCustomer[e.key];
      } else {
        completeSelectedCustomer[e.key] = e.isChannelIdentifier ? [] : "";
      }
    });
    completeSelectedCustomer["_id"] = selectedCustomer._id;
    this._socketService.linkCustomerWithTopic(completeSelectedCustomer, this.conversationId);

    // this._socketService.changeTopicCustomer(
    //   {
    //     data: {
    //       phoneNumber: ["030078444212", "000", "002"],
    //       _id: "61a4ac9a93af2b53287369eb",
    //       firstName: "Mark",
    //       isAnonymous: false,
    //       __v: 0,
    //       alphanumeric: "",
    //       boolean: "",
    //       email: "",
    //       ip: "",
    //       name: "",
    //       number: "",
    //       password: "",
    //       viber: ["viber"],
    //       wewq: ["web"]
    //     }
    //   },
    //   "12345"
    // );
  }

  viewAllMatches() {
    let channelType;
    let channelIdentifier;
    let attr;
    let label;
    this._socketService.conversations.find((e) => {
      if (e.conversationId == this.conversationId) {
        channelType = e.firstChannelSession.channel.channelType.name;
        channelIdentifier = e.firstChannelSession.channelData.channelCustomerIdentifier;
        return;
      }
    });

    if (channelType && channelIdentifier) {
      this._sharedService.schema.forEach((e: any) => {
        if (e.isChannelIdentifier == true) {
          if (e.channelTypes.includes(channelType)) {
            attr = e.key;
            label = e.label;
          }
        }
      });
    }

    let navigationExtras: NavigationExtras = {
      queryParams: {
        q: "linking",
        filterKey: attr ? attr : null,
        filterLabel: label,
        filterValue: channelIdentifier ? channelIdentifier : null,
        conversationId: this.conversationId,
        topicCustomerId: this.customer._id
      }
    };

    this._router.navigate(["/customers/phonebook"], navigationExtras);
  }

  gotoEmbedView() {
    let navigationExtras: NavigationExtras = {
      queryParams: {
        q: "linking",
        conversationId: this.conversationId,
        topicCustomerId: this.customer._id
      }
    };

    this._router.navigate(["/customers/phonebook"], navigationExtras);
  }

  callStartTime(time) {
    return new Date(time * 1000).toISOString().substring(11, 16);
  }
}
