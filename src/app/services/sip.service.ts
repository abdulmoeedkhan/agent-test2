import { Injectable, OnInit } from "@angular/core";
import { Subject } from "rxjs";
import { cacheService } from "./cache.service";
import { snackbarService } from "./snackbar.service";
import { TranslateService } from "@ngx-translate/core";
import { appConfigService } from "./appConfig.service";
import { socketService } from "./socket.service";
import { httpService } from "./http.service";
import { sharedService } from "./shared.service";
import * as uuid from "uuid";

declare var postMessage;

@Injectable({
  providedIn: "root"
})
export class SipService implements OnInit {
  public _isActiveSub = new Subject();

  extension: number;
  customer: any;
  startTime: any;
  endTime: any;
  timeoutId;
  taskList: Array<any>;
  isCallActive: boolean = false;
  isCallHold: boolean = false;
  activeDialog: any;
  isSipLoggedIn: boolean = false;
  agentMrdStates: any;
  customerNumber: any = "";
  isSubscriptionFailed = false;

  constructor(
    private _appConfigService: appConfigService,
    public _cacheService: cacheService,
    private _translateService: TranslateService,
    private _socketService: socketService,
    private _httpService: httpService,
    private _snackbarService: snackbarService,
    private _sharedService: sharedService
  ) {}
  ngOnInit(): void {}

  initMe() {
    try {
      if (this._appConfigService.config.isCxVoiceEnabled) {
        this._sharedService.serviceCurrentMessage.subscribe((e: any) => {
          if (e.msg == "stateChanged") {
            this.agentMrdStates = e.data;
            if (!this.isSubscriptionFailed && !this.isSipLoggedIn && this.checkAgentExtensionAttribute(this._cacheService.agent.attributes))
              this.loginSip();
          }
        });
      }
    } catch (error) {
      console.error("[Error on initMe] Sip ==>", error);
    }
  }

  // this will used to subscribe to SIP library events
  loginSip() {
    try {
      let sipPassword = localStorage.getItem("sipPass");
      sipPassword = JSON.parse(sipPassword ? atob(sipPassword) : null);
      let loginId = this._cacheService.agent.username;
      let password = sipPassword;
      if (this.checkAgentExtensionAttribute(this._cacheService.agent.attributes)) {
        let extension = this.extension != undefined ? this.extension : this._cacheService.agent.attributes.agentExtension[0];

        let command = {
          action: "login",
          parameter: {
            loginId,
            password,
            extension,
            clientCallbackFunction: this.clientCallback
          }
        };
        console.log("login SIP command sip==>", command);
        postMessage(command);
      } else {
        console.log("No Extension configured for agent==>");
        this._snackbarService.open(this._translateService.instant("snackbar.No-Extension-Found"), "err");
      }
    } catch (error) {
      this.notReadyAgentState();
      console.error("login SIP command sip==>", error);
    }
  }

  checkAgentExtensionAttribute(attributes) {
    if (Object.keys(attributes).length !== 0) {
      if (
        attributes.agentExtension !== "" &&
        attributes.agentExtension !== null &&
        attributes.agentExtension !== undefined &&
        attributes.agentExtension[0] !== ""
      ) {
        return true;
      } else {
        this._snackbarService.open(this._translateService.instant("snackbar.No-Extension-Found"), "err");
        return false;
      }
    } else {
      // this._snackbarService.open(this._translateService.instant("snackbar.No-Extension-Found"), "err");
    }
  }

  clientCallback = (event) => {
    try {
      console.log("SIP event sip==>", event);
      if (event.event.toLowerCase() == "agentinfo") {
        if (event.response.state.toLowerCase() == "login") {
          this.isSipLoggedIn = true;
          this._snackbarService.open(this._translateService.instant("snackbar.CX-Voice-Login-Success"), "succ");
          this.readyAgentState();
          console.log("Connection Established, CTI Status is Connected ==>");
        }
        if (event.response.state.toLowerCase() == "logout") {
          this.isSipLoggedIn = false;
          this.notReadyAgentState();
          this._snackbarService.open(this._translateService.instant("snackbar.SIP-Logout-Successful"), "succ");
          console.log("Connection Expired, CTI Status logout==>");
        }
      } else if (event.event.toLowerCase() == "dialogstate") {
        if (event.response.dialog == null) {
        } else if (event.response.dialog.state.toLowerCase() == "active") {
          this.isCallHold = false;
        } else if (event.response.dialog.state.toLowerCase() == "held") {
          this.isCallHold = true;
        }
        this.handleDialogStateEvent(event);
      } else if (event.event.toLowerCase() == "newinboundcall") {
        this.customerNumber = event.response.dialog.customerNumber;
        let cacheId = `${this._cacheService.agent.id}:${event.response.dialog.id}`;
        let cacheDialog: any = this.getDialogFromCache(cacheId);
        if (!cacheDialog) this.identifyCustomer(event, event.response.dialog.customerNumber, "INBOUND");
      } else if (event.event == "Error") {
        console.log("test==>")
        if (event.response.type.toLowerCase() == "invalidstate") {
          this._snackbarService.open(this._translateService.instant("snackbar.CX-Voice-incorrect-request"), "err");
          this.notReadyAgentState();
        } else if (event.response.type.toLowerCase() == "subscriptionfailed") {
          this.isSubscriptionFailed = true;
          this.notReadyAgentState();
          this._snackbarService.open(this._translateService.instant("snackbar.CX-Voice-invalid-credentials"), "err");
        } else if (event.response.type.toLowerCase() == "generalerror") {
          console.log("test1==>")
          if (event.response.description.toLowerCase() == "canceled") {
            console.log("test2==>")
            this._snackbarService.open(this._translateService.instant("snackbar.CX-Voice-call-canceled"), "err");
          } else {
            console.log("test3==>")
            let cacheId = `${this._cacheService.agent.id}:${event.response.dialog.id}`;
            let dialogCache: any = this.getDialogFromCache(cacheId);
            if (dialogCache && dialogCache.dialogState == "active") {
              console.log("test4==>")
              this.handleCallDroppedEvent(cacheId, event.dialog, "call_end", undefined, "DIALOG_ENDED", undefined);
            }
            console.log("test5==>")
            this.removeNotification(event.response.dialog);
            this._snackbarService.open(this._translateService.instant("snackbar.CX-Voice-connection-failed"), "err");
            this.notReadyAgentState();
          }
        }
      }
    } catch (e) {
      console.error("SIP ERROR sip==>", e);
    }
  };

  handleDialogStateEvent(dialogEvent) {
    try {
      let dialogState = dialogEvent.response;
      this.activeDialog = dialogState.dialog;
      if (this.customer && dialogState.dialog && dialogState.dialog != null && dialogState.dialog.participants) {
        let participants = dialogState.dialog.participants;
        let cacheId = `${this._cacheService.agent.id}:${dialogState.dialog.id}`;

        if (Array.isArray(participants)) {
          this.handleDialogParticipantList(dialogEvent, participants, cacheId);
        } else {
        }
      } else {
        if (!this.customer) {
          console.log("Customer Not found sip==>");
          this.handleRefreshCase(dialogEvent, dialogState);
        }
      }
    } catch (e) {
      console.error("[Error Sip] handleDialogStateEvent ==>", e);
    }
  }

  handleDialogParticipantList(dialogEvent, participants, cacheId) {
    try {
      let dialogState = dialogEvent.response;
      participants.forEach((item) => {
        let currentParticipant = item.mediaAddress == this._cacheService.agent.attributes.agentExtension[0] ? item : undefined;
        if (currentParticipant) {
          if (dialogState.dialog.state == "ACTIVE") {
            this.removeNotification(dialogState.dialog);
            if (currentParticipant.state == "ACTIVE") {
              if (dialogState.dialog.isCallAlreadyActive == false) {
                this.isCallActive = true;
                this._isActiveSub.next(true);
                this.setDialogCache(dialogEvent, "ACTIVE");
                this.handleCallActiveEvent(dialogEvent, dialogState);
              }
            }
          }
        }
      });
      if (dialogEvent.response.dialog.state == "DROPPED") {
        // this.setDialogCache(dialogEvent, "DROPPED");
        if (dialogEvent.response.dialog.callEndReason == "Canceled") {
          this.removeNotification(dialogState.dialog);
          this.notReadyAgentState();
        }

        this.handleCallDroppedEvent(cacheId, dialogState, "call_end", undefined, "DIALOG_ENDED", undefined);
      }
    } catch (e) {
      console.error("[Error Sip] handleDialogParticipant ==>", e);
    }
  }

  removeNotification(dialog) {
    try {
      this._sharedService.serviceChangeMessage({ msg: "closeExternalModeRequestHeader", data: dialog });
    } catch (e) {
      console.error("[Error Sip] removeNotification ==>", e);
    }
  }

  getCurrentParticipantFromDialog(dialog) {
    try {
      let participantsList: Array<any> = dialog.participants;
      let currentParticipant = participantsList.find((item) => {
        return item.mediaAddress == this._cacheService.agent.attributes.agentExtension[0];
      });
      return currentParticipant;
    } catch (e) {
      console.error("[Error] getCurrentParticipantFromDialog ==>", e);
    }
  }

  getStartOREndTimeStamp(dialog, status) {
    try {
      let currentParticipant = this.getCurrentParticipantFromDialog(dialog);
      let time;
      if (status == "startCall") {
        time = currentParticipant.startTime;
      } else if (status == "endCall") {
        time = currentParticipant.stateChangeTime;
      }
      let unixTimeStamp = Math.floor(new Date(time).getTime() / 1000); // in seconds
      unixTimeStamp = unixTimeStamp * 1000;
      return unixTimeStamp;
    } catch (e) {
      console.error("[Error Sip] getStartOREndTimeStamp ==>", e);
    }
  }

  handleCallActiveEvent(
    dialogEvent: { event?: string; response: any },
    dialogState: { dialog: { ani: any; fromAddress: any; id: any; dnis?: any; callType?: string; dialedNumber?: any; callVariables?: any } }
  ) {
    try {
      let channelCustomerIdentifier = dialogState.dialog.ani ? dialogState.dialog.ani : dialogState.dialog.fromAddress;
      let serviceIdentifier = dialogEvent.response.dialog.dnis;
      let leg = `${this._cacheService.agent.attributes.agentExtension[0]}:${this._cacheService.agent.id}:${dialogState.dialog.id}`;
      let callType;
      let timeStamp = this.getStartOREndTimeStamp(dialogState.dialog, "startCall");
      callType = "INBOUND";
      this.setDialogCache(dialogEvent, "active");
      let cimMessage = this.createCIMMessage(
        "VOICE",
        channelCustomerIdentifier,
        serviceIdentifier,
        "CALL_LEG_STARTED",
        this.customer,
        leg,
        dialogState.dialog,
        callType,
        timeStamp,
        undefined
      );
      console.log("[handleCallActiveEvent] CIM Message sip==>", cimMessage);
      this.ccmChannelSessionApi(cimMessage, "", "", undefined);
    } catch (e) {
      console.error("[Error] handleCallActiveEvent Sip==>", e);
    }
  }

  notReadyAgentState() {
    try {
      const voiceMrdObj = this.getVoiceMrd(this.agentMrdStates.agentMrdStates);
      if (this.agentMrdStates.state.name.toLowerCase() == "ready") {
        // If state in Sip is loggedIn ready and aur agent state in not ready then make the agent ready first
        // and then make voice mrd ready
        this._socketService.emit("changeAgentState", {
          agentId: this.agentMrdStates.agent.id,
          action: "agentState",
          state: { name: "NOT_READY", reasonCode: null }
        });

        setTimeout(() => {
          this._socketService.emit("changeAgentState", {
            agentId: this.agentMrdStates.agent.id,
            action: "agentMRDState",
            state: "NOT_READY",
            mrdId: voiceMrdObj.mrd.id
          });
        }, 500);
      }
    } catch (error) {
      console.error("Not Ready State for Sip==>", error);
    }
  }

  readyAgentState() {
    try {
      const voiceMrdObj = this.getVoiceMrd(this.agentMrdStates.agentMrdStates);
      if (this.agentMrdStates.state.name.toLowerCase() != "ready") {
        // If state in Sip is loggedIn ready and aur agent state in not ready then make the agent ready first
        // and then make voice mrd ready
        this._socketService.emit("changeAgentState", {
          agentId: this.agentMrdStates.agent.id,
          action: "agentState",
          state: { name: "READY", reasonCode: null }
        });
      }
      setTimeout(() => {
        this.makeCXVoiceMRDReady(voiceMrdObj);
      }, 500);
    } catch (error) {
      console.error("Ready State for Sip==>", error);
    }
  }

  makeCXVoiceMRDReady(voiceMrdObj) {
    this._socketService.emit("changeAgentState", {
      agentId: this.agentMrdStates.agent.id,
      action: "agentMRDState",
      state: "READY",
      mrdId: voiceMrdObj.mrd.id
    });
  }

  // from the list of mrds, it will return voice mrd
  getVoiceMrd(mrds) {
    try {
      let voiceMrd = mrds.find((e) => {
        if (e.mrd.id == this._appConfigService.config.CX_VOICE_MRD) {
          return e;
        }
      });

      return voiceMrd;
    } catch (e) {
      console.error("[Error] getVoiceMrd ==>", e);
    }
  }

  identifyCustomer(sipEvent: { event?: string; response: any }, ani: any, callType: string) {
    try {
      let customerIdentifier = ani;
      if (customerIdentifier) {
        this.getCustomerByVoiceIdentifier(customerIdentifier, sipEvent, callType);
      } else {
        this._snackbarService.open("No Customer Identifier Found", "err");
      }
    } catch (e) {
      console.error("[Error on Identify Customer Sip] ==>", e);
    }
  }

  getCustomerByVoiceIdentifier(identifier: any, sipEvent: { response: any }, callType: string) {
    try {
      this._httpService.getCustomerByChannelTypeAndIdentifier("CX_VOICE", identifier).subscribe(
        (res) => {
          this.customer = res.customer;
          let data = {
            customer: res.customer,
            identifier,
            dialogData: sipEvent.response.dialog,
            provider: "cx_voice"
          };
          if (callType == "INBOUND") {
            this._sharedService.serviceChangeMessage({ msg: "openExternalModeRequestHeader", data: data });
            this.setDialogCache(sipEvent, "ALERTING");
          }
        },
        (error) => {
          this._sharedService.Interceptor(error.error, "err");
        }
      );
    } catch (e) {
      console.error("[Error] getCustomerByVoiceIdentifier Sip ==>", e);
    }
  }

  setDialogCache(sipEvent, dialogState) {
    try {
      let cacheId = `${this._cacheService.agent.id}:${sipEvent.response.dialog.id}`;
      let dialogCacheObj = {
        dialogState,
        dialog: sipEvent.response.dialog
      };
      localStorage.setItem(`${cacheId}`, JSON.stringify(dialogCacheObj));
    } catch (e) {
      console.error("[Error on Set Dialog Cache] Sip ==>", e);
    }
  }

  createCIMMessage(
    messageType: string,
    channelCustomerIdentifier: any,
    serviceIdentifier: any,
    intent: string,
    customer: any,
    leg: string,
    dialog: { ani?: any; fromAddress?: any; dnis?: any; id: any; callType?: string; dialedNumber?: any; callVariables?: any },
    reasonCode: string,
    timestamp: number,
    state
  ) {
    try {
      let cimMessage = {
        id: uuid.v4().toString(),
        header: {
          channelData: {
            channelCustomerIdentifier: channelCustomerIdentifier,
            serviceIdentifier: serviceIdentifier,
            additionalAttributes: this.getCallVariablesList(dialog.callVariables.CallVariable)
          },
          customer,
          language: {},
          timestamp,
          securityInfo: {},
          stamps: [],
          intent,
          entities: {},
          sender: {
            id: this._cacheService.agent.id,
            senderName: this._cacheService.agent.username,
            type: "AGENT",
            additionalDetail: {}
          }
        },
        body: {
          type: messageType,
          markdownText: null,
          reasonCode,
          leg,
          callId: dialog.id,
          dialog,
          state
        }
      };
      if (intent == "CALL_LEG_ENDED") {
        let conversationId = this.getCurrentConversationIdORConversation("id");
        let obj = {
          key: "conversationId",
          type: "String2000",
          value: conversationId
        };
        cimMessage.header.channelData.additionalAttributes.push(obj);
      }
      return cimMessage;
    } catch (e) {
      console.error("[Error] createCIMMessage Sip ==>", e);
    }
  }

  ccmChannelSessionApi(data, methodCalledOn, cacheId, event) {
    try {
      this._httpService.ccmVOICEChannelSession(data).subscribe(
        (res) => {
          console.log("CCM API Success Sip==>");
          if (methodCalledOn == "call_end") this.clearLocalDialogCache(cacheId);
        },
        (error) => {
          console.error("[Error on CCM Channel Session API] ==>", error);
          this._sharedService.Interceptor(error.error, "err");
        }
      );
    } catch (e) {
      console.error("[Error] ccmChannelSessionApi ==>", e);
    }
  }

  getCallVariablesList(list: Array<any>) {
    try {
      const temp = [];

      list.forEach((item) => {
        const obj = {
          key: "",
          type: "String2000",
          value: ""
        };
        obj.key = item.name;
        obj.value = item.value;
        temp.push(obj);
      });
      return temp;
    } catch (err) {
      console.error("[Error on Get Call Variables List] Sip==>", err);
    }
  }

  getCurrentConversationIdORConversation(type) {
    try {
      let conversationList: Array<any> = this._socketService.conversations;
      for (let i = 0; i <= conversationList.length; i++) {
        if (conversationList[i] && conversationList[i].activeChannelSessions) {
          let voiceSession = conversationList[i].activeChannelSessions.find((item) => {
            return item.channel.channelType.name.toLowerCase() == "cx_voice";
          });
          if (voiceSession && type == "id") {
            return voiceSession.conversationId;
          } else if (voiceSession && type == "conversation") {
            return conversationList[i];
          }
        }
      }
    } catch (e) {
      console.error("[Error] getConversationIdOrConversation Sip==>", e);
    }
  }

  getDialogFromCache(cacheId: string) {
    try {
      let item = localStorage.getItem(`${cacheId}`);
      if (item) item = JSON.parse(item);
      return item;
    } catch (e) {
      console.error("[Error on Get Dialog Cache] Sip==>", e);
    }
  }

  handleCallDroppedEvent(cacheId, dialogState, methodCalledOn, event, callType, state) {
    try {
      let taskState;
      if (state && state.taskId) taskState = state;
      let channelCustomerIdentifier = dialogState.dialog.ani ? dialogState.dialog.ani : dialogState.dialog.fromAddress;
      let serviceIdentifier = dialogState.dialog.dnis;
      let leg = `${this._cacheService.agent.attributes.agentExtension[0]}:${this._cacheService.agent.id}:${dialogState.dialog.id}`;
      let customer;
      let timeStamp = this.getStartOREndTimeStamp(dialogState.dialog, "endCall");
      if (this.customer) customer = JSON.parse(JSON.stringify(this.customer));

      let cimMessage = this.createCIMMessage(
        "VOICE",
        channelCustomerIdentifier,
        serviceIdentifier,
        "CALL_LEG_ENDED",
        customer,
        leg,
        dialogState.dialog,
        callType,
        timeStamp,
        taskState
      );
      console.log("[ handleCallDroppedEvent] CIM Message Sip==>", cimMessage);
      this.ccmChannelSessionApi(cimMessage, methodCalledOn, cacheId, event);

      this.customer = undefined;
      this.isCallActive = false;
      this._isActiveSub.next(false);
      if (this.timeoutId) clearInterval(this.timeoutId);
    } catch (e) {
      console.error("[Error] handleCallDropEvent Sip==>", e);
    }
  }

  clearLocalDialogCache(cacheId: any) {
    try {
      localStorage.removeItem(`${cacheId}`);
    } catch (e) {
      console.error("[Error on clear Dialog Cache Sip] ==>", e);
    }
  }

  acceptCallOnSip(command: { action: string; parameter: { dialogId: any } }) {
    postMessage(command);
  }

  endCallOnSip() {
    try {
      let command = {
        action: "releaseCall",
        parameter: {
          dialogId: this.activeDialog.id
        }
      };
      console.log("EndCallOnSip ==>", command);
      postMessage(command);
    } catch (error) {
      console.error("[Error on initMe] Sip ==>", error);
    }
  }

  holdCallOnSip() {
    try {
      let command = {
        action: "holdCall",
        parameter: {
          dialogId: this.activeDialog.id,
          clientCallbackFunction: this.clientCallback
        }
      };
      console.log("holdCallOnSip==>", command);
      postMessage(command);
    } catch (error) {
      console.error("[Error on holdCallOnSip] ==>", error);
    }
  }

  resumeCallOnSip() {
    try {
      let command = {
        action: "retrieveCall",
        parameter: {
          dialogId: this.activeDialog.id,
          clientCallbackFunction: this.clientCallback
        }
      };
      console.log("resumeCallOnSip sip==>", command);
      postMessage(command);
    } catch (error) {
      console.error("[Error on resumeCallOnSip] ==>", error);
    }
  }

  getCurrentAgentFromParticipantList(list: Array<any>) {
    try {
      return list[0];
    } catch (e) {
      console.error("[Error] getCurrentAgentFromParticipantList ==>", e);
    }
  }

  handleRefreshCase(dialogEvent, dialogState) {
    try {
      let voiceTask = this.getVoiceTask();
      if (voiceTask) {
        let cacheId = `${this._cacheService.agent.id}:${voiceTask.channelSession.id}`;
        let D1: any = this.getDialogFromCache(cacheId);
        let state;
        if (voiceTask.state.name.toLowerCase() == "reserved") state = { state: "alerting", taskId: voiceTask.id };
        if (D1 && dialogState.dialog == null) {
          this.handleCallDroppedEvent(cacheId, D1, "call_end", undefined, "DIALOG_ENDED", state);
        }
        // else if (D1 && dialogState.dialog) {
        //   if (D1.dialog.id != dialogState.dialog.id) {
        //     this.handleCallDroppedEvent(cacheId, D1, "call_end", dialogEvent, "DIALOG_ENDED", state);
        //   } else if (D1.dialog.id == dialogState.dialog.id) {
        //     if (D1.dialogState == "active") {
        //       let conversation = this.getCurrentConversationIdORConversation("conversation");
        //       if (conversation) {
        //         this.customer = conversation.customer;
        //       }
        //     }
        //   }
        // }
      }
    } catch (e) {
      console.error("[Error] handleRefreshCase Sip==>", e);
    }
  }

  checkActiveTasks(agentId) {
    try {
      this._httpService.getRETasksList(agentId).subscribe(
        (res) => {
          this.taskList = res;
          console.log("Tasklist ==> ", this.taskList);

          if (this.taskList.length > 0) {
            this.getVoiceTask();
          }
        },
        (error) => {
          this._sharedService.Interceptor(error.error, "err");
        }
      );
    } catch (e) {
      console.error("[Error] checkActiveTasks ==>", e);
    }
  }

  getVoiceTask() {
    try {
      console.log("getVoiceTask ==>");

      if (this.taskList && this.taskList.length > 0) {
        for (let i = 0; i <= this.taskList.length; i++) {
          if (this.taskList[i] && this.taskList[i].channelSession && this.taskList[i].channelSession.channel.channelType.name == "CX_VOICE")
            return this.taskList[i];
        }
      }
      return null;
    } catch (e) {
      console.error("[Error] getVoiceTask ==>", e);
    }
  }

  logout() {
    try {
      if (this.isSipLoggedIn) {
        let command = {
          action: "logout",
          parameter: {
            reasonCode: "Logged Out",
            userId: this._cacheService.agent.attributes.agentExtension[0],
            clientCallbackFunction: this.clientCallback
          }
        };
        postMessage(command);
      }
    } catch (error) {
      console.error("[Error] Handle Logout for Sip==>", error);
    }
  }
}
