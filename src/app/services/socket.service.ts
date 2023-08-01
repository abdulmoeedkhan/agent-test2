import { Injectable, OnInit } from "@angular/core";
import { io } from "socket.io-client";
import { BehaviorSubject, Observable } from "rxjs";
import { Router } from "@angular/router";
import { appConfigService } from "./appConfig.service";
import { cacheService } from "./cache.service";
import { sharedService } from "./shared.service";
import { CimEvent } from "../models/Event/cimEvent";
import { snackbarService } from "./snackbar.service";
import { pullModeService } from "./pullMode.service";
import { soundService } from "./sounds.service";
import { NgxUiLoaderService } from "ngx-ui-loader";
import { httpService } from "./http.service";
import { v4 as uuidv4 } from "uuid";
import { AuthService } from "./auth.service";
import { TopicParticipant } from "../models/User/Interfaces";
import { TranslateService } from "@ngx-translate/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { announcementService } from "./announcement.service";

//const mockTopicData: any = require("../mocks/mockTopicData.json");

@Injectable({
  providedIn: "root"
})
export class socketService {
  socket: any;
  uri: string;
  isSocketConnected: boolean = false;
  conversations: any = [];
  conversationIndex = -1;
  consultTask;
  private _conversationsListener: BehaviorSubject<any> = new BehaviorSubject([]);

  public readonly conversationsListener: Observable<any> = this._conversationsListener.asObservable();

  constructor(
    private _snackbarService: snackbarService,
    private _announcementService: announcementService,
    private _appConfigService: appConfigService,
    private _cacheService: cacheService,
    private _sharedService: sharedService,
    private _pullModeService: pullModeService,
    private _router: Router,
    private _soundService: soundService,
    private ngxService: NgxUiLoaderService,
    private _httpService: httpService,
    private _authService: AuthService,
    private snackBar: MatSnackBar,
    private _translateService: TranslateService
  ) {
     //this.onTopicData(mockTopicData, "12345", "");
  }

  connectToSocket() {
    //load pullMode list
    this._cacheService.loadPullModeList();

    //cache customer schema
    this._cacheService.cacheCustomerSchema();

    this.uri = this._appConfigService.config.SOCKET_URL;
    let origin = new URL(this.uri).origin;
    let path = new URL(this.uri).pathname;
    console.log("username------ " + this._cacheService.agent.username);

    let fcmKeyObj = {
      desktopFcmKey: this._cacheService.isMobileDevice ? null : this._cacheService.agentFcmkey,
      mobileFcmKey: this._cacheService.isMobileDevice ? this._cacheService.agentFcmkey : null
    };

    this.socket = io(origin, {
      path: path == "/" ? "" : path + "/socket.io",
      auth: {
        //  token: this._cacheService.agent.details.access_token,
        agent: JSON.stringify(this._cacheService.agent),
        fcm: fcmKeyObj
      },
      query: {
        username: this._cacheService.agent.username
      }
    });

    this.socket.on("connect_error", (err) => {
      this.isSocketConnected = false;
      this.ngxService.stop();
      this._sharedService.serviceChangeMessage({ msg: "closeAllPushModeRequests", data: null });
      try {
        console.error(err.data);
        console.error("socket connect_error ", err.data && err.data.content ? err.data.content : err);
        if (err.data && err.data.content && err.data.content && err.data.content.key == "LM" && err.data.content.licStatus) {
          this._snackbarService.open(this._translateService.instant("snackbar.The-license-is") + err.data.content.licStatus, "err");
        } else {
          this._snackbarService.open(
            err.data && err.data.content ? err.data.content.msg : this._translateService.instant("snackbar.unable-to-connect-to-chat"),
            "err"
          );
        }
      } catch (err) {}
      if (err.message == "login-failed") {
        try {
          sessionStorage.clear();
          localStorage.removeItem("ccUser");
        } catch (e) {}
        this._cacheService.resetCache();
        this.socket.disconnect();
        this.moveToLogin();
      }
    });

    this.socket.on("connect", (e) => {
      this.ngxService.stop();
      this.isSocketConnected = true;
      this._sharedService.serviceChangeMessage({ msg: "closeAllPushModeRequests", data: null });
      this._snackbarService.open("Connected", "succ");
      console.log("socket connect " + e);
      if (this._router.url == "/login") {
        // this._router.navigate(["customers"]);
        this._authService.moveToAuthorizedResourceOnLogin();
      }
    });

    this.subscribeToSocketEvents();
  }

  subscribeToSocketEvents() {
    this.socket.on("disconnect", (reason) => {
      console.error("socket disconnect " + reason);

      this.isSocketConnected = false;

      // this means that server forcefully disconnects the socket connection
      if (reason == "io server disconnect") {
        //  localStorage.clear();
        try {
          sessionStorage.clear();
          localStorage.removeItem("ccUser");
        } catch (e) {}
        this._cacheService.resetCache();
        this.socket.disconnect();
        this._router.navigate(["login"]).then(() => {
          window.location.reload();
        });
      }
    });

    this.socket.on("agentPresence", (res: any) => {
      console.log("agent presence", res);
      this._sharedService.serviceChangeMessage({ msg: "stateChanged", data: res.agentPresence });
    });

    this.socket.on("ANNOUNCEMENT_CREATED", (res: any) => {
      if ((res.supervisorId !== this._cacheService.agent.id)) {
        this._announcementService.addCreatedAnnoucement(res);
      }
    });

    this.socket.on("ANNOUNCEMENT_DELETED", (res: any) => {
      this._announcementService.removeAnnoucement(res);
    });


    this.socket.on("errors", (res: any) => {
      console.error("socket errors ", res);
      this.onSocketErrors(res);
    });


    this.socket.on("taskRequest", (res: any) => {
      console.log("taskRequest==>", res);
      if (res.taskState && res.taskState.name.toLowerCase() == "started") {
        if (res.taskDirection.toLowerCase() == "consult") {
          this.consultTask = undefined;
          this.consultTask = res;
          console.log("taskRequest1==>");
          this.emit("topicSubscription", {
            topicParticipant: new TopicParticipant("AGENT", this._cacheService.agent, res.conversationId, "ASSISTANT", "SUBSCRIBED"),
            agentId: this._cacheService.agent.id,
            conversationId: res.conversationId,
            taskId: res.taskId
          });
        } else {
          console.log("taskRequest2==>");
          this.emit("topicSubscription", {
            topicParticipant: new TopicParticipant("AGENT", this._cacheService.agent, res.conversationId, "PRIMARY", "SUBSCRIBED"),
            agentId: this._cacheService.agent.id,
            conversationId: res.conversationId,
            taskId: res.taskId
          });
        }
      } else {
        if (res.channelSession.channel.channelType.name.toLowerCase() !== "cx_voice") {
        // } else {
        this.triggerNewChatRequest(res);
        }
        // this.triggerNewChatRequest(res);
      }
    });

    // this.socket.on("incomingCallAlertEvent", (res: any) => {
    //   console.log("event received==>")
    //   this.triggerIncomingCallAlert(res);
    // });

    this.socket.on("revokeTask", (res: any) => {
      console.log("revokeTask ", res);
      this.revokeChatRequest(res);
    });

    this.socket.on("onCimEvent", (res: any) => {
      try {
        this.onCimEventHandler(JSON.parse(res.cimEvent), res.conversationId);
      } catch (err) {
        console.error("error on onCimEvent ==>" + err);
        // If got any error while receiving cimEvent then simply unsubscribe to the topic
        this._snackbarService.open(this._translateService.instant("snackbar.Malfunction-event"), "err");
        // this.emit("topicUnsubscription", {
        //   conversationId: res.conversationId,
        //   agentId: this._cacheService.agent.id
        // });
      }
    });

    this.socket.on("onTopicData", (res: any, callback: any) => {
      console.log("onTopicData==>", JSON.parse(JSON.stringify(res)));
      try {
        this.onTopicData(res.topicData, res.conversationId, res.taskId);
        if (callback) {
          callback({ status: "ok" });
        }
      } catch (err) {
        console.error("error on onTopicData ", err);
        this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-process-chat-unsubscribing"), "err");
        // If got any error while receiving topicData then simply unsubscribe to the topic
        this.emit("topicUnsubscription", {
          conversationId: res.conversationId,
          agentId: this._cacheService.agent.id
        });
      }
    });

    this.socket.on("topicUnsubscription", (res: any) => {
      console.log("topicUnsubscription", res);
      if (res.reason.toUpperCase() != "UNSUBSCRIBED" && res.reason.toUpperCase() != "CHAT TRANSFERRED") {
        this._snackbarService.open(this._translateService.instant("snackbar.Conversation-is-closed-due-to") + res.reason, "err");
      }

      if (res.reason.toUpperCase() == "CHAT TRANSFERRED") {
        this.snackBar.open("chat has been transferred", "", {
          duration: 4000,
          panelClass: "chat-success-snackbar",
          horizontalPosition: "right",
          verticalPosition: "bottom"
        });
      }

      this.removeConversation(res.conversationId);
    });

    this.socket.on("socketSessionRemoved", (res: any) => {
      console.log("socketSessionRemoved", res);
      this.onSocketSessionRemoved();
    });

    this.socket.on("onPullModeSubscribedList", (res: any) => {
      console.log("onPullModeSubscribedList", res);
      this._translateService.stream("globals.no-new-conversation").subscribe(
        (text: string) => {
          this._sharedService.mainPagetile = text;
        },
        (err) => {
          console.error("Error translating key 'globals.no-new-conversation'", err);
        }
      );
      this._pullModeService.updateSubscribedList(res);
    });

    this.socket.on("onPullModeSubscribedListRequest", (res: any) => {
      try {
        console.log("onPullModeSubscribedListRequest", res);
        this._pullModeService.updateSubscribedListRequests(JSON.parse(res.pullModeEvent), res.type);
      } catch (err) {
        console.error(err);
      }
    });

    this.socket.on("pullModeSubscribedListRequests", (res: any) => {
      console.log("pullModeSubscribedListRequests", res);
      this._pullModeService.initializedSubscribedListRequests(res);
    });

    this.socket.on("addPullModeSubscribedListRequests", (res: any) => {
      console.log("addPullModeSubscribedListRequests", res);
      this._pullModeService.addPullModeSubscribedListRequests(res);
    });

    this.socket.on("removePullModeSubscribedListRequests", (res: any) => {
      console.log("removePullModeSubscribedListRequests", res);
      this._pullModeService.removePullModeSubscribedListRequests(res);
    });

    this.socket.on("onChannelTypes", (res: any) => {
      console.log("onChannelTypes==>", res);
      // this._sharedService.channelTypeList = res;
      this._sharedService.setChannelIcons(res);
    });
  }

  disConnectSocket() {
    try {
      this.socket.disconnect();
    } catch (err) {}
  }

  listen(eventName: string) {
    return new Observable((res) => {
      this.socket.on(eventName, function (data, callback) {
        res.next({ data: data, callback: callback });
      });
    });
  }

  emit(eventName: string, data: any) {
    this.socket.emit(eventName, data);
  }

  triggerNewChatRequest(data) {
    this._sharedService.serviceChangeMessage({ msg: "openPushModeRequestHeader", data: data });
  }

  revokeChatRequest(data) {
    this._sharedService.serviceChangeMessage({ msg: "closePushModeRequestHeader", data: data });
  }
  //this.socket.on(){}

  onCimEventHandler(cimEvent, conversationId) {
    console.log("cim event ", JSON.parse(JSON.stringify(cimEvent)));
    if (cimEvent.channelSession) {
      if (cimEvent.data && cimEvent.data.header) {
        cimEvent.data.header.channelSession = cimEvent.channelSession;
      }
    }

    let sameTopicConversation = this.conversations.find((e) => {
      return e.conversationId == conversationId;
    });

    if (sameTopicConversation) {
      if (
        cimEvent.name.toLowerCase() == "agent_message" ||
        cimEvent.name.toLowerCase() == "bot_message" ||
        cimEvent.name.toLowerCase() == "customer_message" ||
        cimEvent.name.toLowerCase() == "whisper_message"
      ) {
        if (cimEvent.name.toLowerCase() != "agent_message") {
          this.playSoundAndBrowserNotification(sameTopicConversation, cimEvent);
        }

        if (cimEvent.data.header.sender.type.toLowerCase() == "connector") {
          cimEvent.data.header.sender.id = cimEvent.data.header.customer._id;
          cimEvent.data.header.sender.type = "CUSTOMER";
          cimEvent.data.header.sender.senderName =
            cimEvent.data.header.customer.firstName + " " + cimEvent.data.header.customer.lastName ? cimEvent.data.header.customer.lastName : "";
          if (cimEvent.data.body.type.toLowerCase() != "notification") {
            clearTimeout(sameTopicConversation["isTyping"]);
            sameTopicConversation["isTyping"] = null;
          }
          this.processActiveChannelSessions(sameTopicConversation, cimEvent.data.header.channelSession);
          ++sameTopicConversation.unReadCount;
        }
        if (
          cimEvent.name.toLowerCase() == "agent_message" &&
          cimEvent.data.body.type.toLowerCase() == "comment" &&
          cimEvent.data.body.itemType.toLowerCase() != "text" &&
          cimEvent.data.body.itemType.toLowerCase() != "video" &&
          cimEvent.data.body.itemType.toLowerCase() != "image" &&
          cimEvent.data.body.itemType.toLowerCase() !="private_reply"
        ) {
          this.processCommentActions(sameTopicConversation.messages, cimEvent.data);
        }
        // for agent type message change the status of message
        else if (cimEvent.name.toLowerCase() == "agent_message" || cimEvent.name.toLowerCase() == "whisper_message") {
          // find the message is already located in the conversation
          let cimMessage = sameTopicConversation.messages.find((message) => {
            return message.id == cimEvent.data.id;
          });
          // if yes, only update the staus
          if (cimMessage) {
            cimMessage.header["status"] = "sent";
            cimMessage.body["isWhisper"] = cimEvent.name.toLowerCase() == "whisper_message" ? true : false;
          } else {
            // if no, marked staus as sent and push in the conversation
            cimEvent.data.header["status"] = "sent";
            cimEvent.data.body["isWhisper"] = cimEvent.name.toLowerCase() == "whisper_message" ? true : false;
            sameTopicConversation.messages.push(cimEvent.data);
          }
        } else {
          sameTopicConversation.messages.push(cimEvent.data);
        }

        sameTopicConversation.unReadCount ? undefined : (sameTopicConversation.unReadCount = 0);

        this._conversationsListener.next(this.conversations);
      } else if (cimEvent.type.toLowerCase() == "suggestion") {
        this.mergeBotSuggestions(sameTopicConversation, cimEvent.data);
      } else if (cimEvent.name.toLowerCase() == "channel_session_started") {
        this.addChannelSession(cimEvent, conversationId);
      } else if (cimEvent.name.toLowerCase() == "conversation_data_changed") {
        this.upateActiveConversationData(cimEvent, conversationId);
      } else if (cimEvent.name.toLowerCase() == "channel_session_ended") {
        this.removeChannelSession(cimEvent, conversationId);
      } else if (cimEvent.name.toLowerCase() == "associated_customer_changed") {
        this.changeTopicCustomer(cimEvent, conversationId);
      } else if (cimEvent.name.toLowerCase() == "agent_subscribed") {
        this.handleAgentSubscription(cimEvent, conversationId);
      } else if (cimEvent.name.toLowerCase() == "agent_unsubscribed") {
        this.handleAgentSubscription(cimEvent, conversationId);
      } else if (cimEvent.name.toLowerCase() == "task_enqueued") {
        this.handleTaskEnqueuedEvent(cimEvent, conversationId);
      } else if (cimEvent.name.toLowerCase() == "task_state_changed") {
        this.handleTaskStateChangedEvent(cimEvent, conversationId);
      } else if (cimEvent.name.toLowerCase() == "no_agent_available") {
        this.handleNoAgentEvent(cimEvent, conversationId);
      } else if (cimEvent.name.toLowerCase() == "message_delivery_notification") {
        this.handleDeliveryNotification(cimEvent, conversationId);
      } else if (cimEvent.name.toLowerCase() == "typing_indicator" && cimEvent.data.header.sender.type.toLowerCase() == "connector") {
        this.handleTypingStartedEvent(cimEvent, sameTopicConversation);
      } else if (cimEvent.name.toLowerCase() == "participant_role_changed") {
        this.handleParticipantRoleChangedEvent(cimEvent, conversationId);
      }
    } else {
      this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-process-event-unsubscribing"), "err");
      this.emit("topicUnsubscription", {
        conversationId: conversationId,
        agentId: this._cacheService.agent.id
      });
    }
  }

  onSocketSessionRemoved() {
    try {
      sessionStorage.clear();
      localStorage.removeItem("ccUser");
    } catch (e) {}
    this._cacheService.resetCache();
    this._snackbarService.open(this._translateService.instant("snackbar.you-are-logged-In-from-another-session"), "err");
    alert(this._translateService.instant("snackbar.you-are-logged-In-from-another-session"));
  }
  onTopicData(topicData, conversationId, taskId) {
    // this.removeConversation(conversationId);
    let conversation = {
      conversationId: conversationId,
      taskId,
      isTyping: null,
      messages: [],
      activeConversationData: topicData.conversationData,
      activeChannelSessions: [],
      unReadCount: undefined,
      index: null,
      state: conversationId == "FAKE_CONVERSATION" ? "CLOSED" : "ACTIVE",
      customer: topicData.customer,
      customerSuggestions: topicData.channelSession ? topicData.channelSession.customerSuggestions : [],
      topicParticipant: topicData.topicParticipant ? topicData.topicParticipant : "", //own ccuser of Agent
      firstChannelSession: topicData.channelSession ? topicData.channelSession : "",
      messageComposerState: false,
      agentParticipants: [] //all Agents in conversations except itself
    };

    // feed the conversation with type "messages"
    let topicEvents = topicData.topicEvents ? topicData.topicEvents : [];

    // feed the conversation with type "messages"
    topicEvents.forEach((event, i) => {
      if (event.channelSession) {
        if (event.data.header) {
          event.data.header.channelSession = event.channelSession;
        }
      }
      if (
        (event.name.toLowerCase() == "message_delivery_notification" || event.name.toLowerCase() == "customer_message") &&
        event.data.header.sender.type.toLowerCase() == "connector"
      ) {
        event.data.header.sender.senderName = event.data.header.customer.firstName;
        event.data.header.sender.id = event.data.header.customer._id;
        event.data.header.sender.type = "CUSTOMER";
      }
      if (
        event.name.toLowerCase() == "agent_message" ||
        event.name.toLowerCase() == "bot_message" ||
        event.name.toLowerCase() == "customer_message"
      ) {
        if (
          event.name.toLowerCase() == "agent_message" &&
          event.data.body.type.toLowerCase() == "comment" &&
          event.data.body.itemType.toLowerCase() != "text" &&
          event.data.body.itemType.toLowerCase() != "video" &&
          event.data.body.itemType.toLowerCase() != "image" &&
          event.data.body.itemType.toLowerCase() != "private_reply"
        ) {
          this.processCommentActions(conversation.messages, event.data);
         
        } else {
          event.data.header["status"] = "sent";
          conversation.messages.push(event.data);
        }
      } else if (
        [
          "task_enqueued",
          "no_agent_available",
          "channel_session_started",
          "channel_session_ended",
          "agent_subscribed",
          "agent_unsubscribed",
          "task_state_changed",
          "participant_role_changed"
        ].includes(event.name.toLowerCase())
      ) {
        let message = this.createSystemNotificationMessage(event);
        if (message) {
          conversation.messages.push(message);
        }
      } else if (event.name.toLowerCase() == "whisper_message") {
        event.data.header["status"] = "sent";
        event.data.body["isWhisper"] = true;
        conversation.messages.push(event.data);
      }
    });

    this.processSeenMessages(conversation, topicEvents);

    let participants = topicData.participants ? topicData.participants : [];
    // feed the active channel sessions
    participants.forEach((e) => {
      if (e.type.toLowerCase() == "customer") {
        let participant = e.participant;

        // seprate the webChanneldata in channel session if found in additionalAttributes
        let webChannelData = participant.channelData.additionalAttributes.find((e) => {
          return e.type.toLowerCase() == "webchanneldata";
        });
        if (webChannelData) {
          participant["webChannelData"] = webChannelData.value;
        }

        //feed the active channel session array
        // if (participant.channel.channelType.name.toLowerCase() == "voice") {
        //   if (participant.state.reasonCode != "AGENT") {
        //     conversation.activeChannelSessions.push(participant);
        //   } else {
        //     // console.log("participant==>", participant);
        //   }
        // } else {
        conversation.activeChannelSessions.push(participant);
        // }

        // if the channel session is of voice or facebook then channel session should be disabled
        // because the channel session in the array is used to send the message to customer
        conversation.activeChannelSessions.forEach((channelSession) => {
          if (
            channelSession.channel.channelType.name.toLowerCase() == "cisco_cc" ||
            channelSession.channel.channelType.name.toLowerCase() == "cx_voice"
          ) {
            channelSession["isDisabled"] = true;
          } else {
            channelSession["isDisabled"] = false;
          }
          channelSession["isChecked"] = false;
        });

        // if the channel session is of web or whatsapp then channel session should be selected
        // because the channel session in the array is used to send the message to customer
        let repliedChannelSession = conversation.activeChannelSessions.find((channelSession) => {
          if (
            channelSession.channel.channelType.name.toLowerCase() != "cisco_cc" &&
            channelSession.channel.channelType.name.toLowerCase() != "cx_voice"
          ) {
            return channelSession;
          }
        });

        if (repliedChannelSession) {
          repliedChannelSession["isChecked"] = true;
        }
      } else if (e.type.toLowerCase() == "agent") {
        if (e.participant.keycloakUser.id != conversation.topicParticipant.participant.keycloakUser.id) {
          conversation.agentParticipants.push(e);
        }
      }
    });

    conversation.messageComposerState = this.isNonVoiceChannelSessionExists(conversation.activeChannelSessions);
    let index;
    let oldConversation = this.conversations.find((e, indx) => {
      if (e.customer._id == topicData.customer._id) {
        index = indx;
        conversation.index = e.index;
        return e;
      }
    });

    if (oldConversation) {
      // if that conversation already exists update it
      if (conversation.conversationId != "FAKE_CONVERSATION") {
        this.conversations[index] = conversation;
        // console.log("old convo ===>", oldConversation);
      }
    } else {
      // else push that conversation
      conversation.index = ++this.conversationIndex;
      this.conversations.push(conversation);
      this._soundService.playBeep();
    }

    // console.log("conversations==>", this.conversations);
    this._conversationsListener.next(this.conversations);
  }

  processSeenMessages(conversation, events) {
    let latestDeliveryEventMessage = this.getLatestDeliveryEventMessage(events);

    if (latestDeliveryEventMessage && latestDeliveryEventMessage.body.status.toLowerCase() == "read") {
      this.markAgentMessagesToSeenTillId(
        conversation.messages,
        latestDeliveryEventMessage.body.messageId,
        latestDeliveryEventMessage.header.customer
      );
    }

    this.addParticipantsToTheLastSeenMessage(conversation, events);
  }

  addParticipantsToTheLastSeenMessage(conversation, events) {
    let alreadyEnteredSenders = [];
    for (let i = events.length - 1; i > 0; i--) {
      if (
        events[i].name.toLowerCase() == "message_delivery_notification" &&
        events[i].data.body.status.toLowerCase() == "read" &&
        events[i].data.header &&
        events[i].data.header.sender &&
        events[i].data.header.sender.id != conversation.topicParticipant.participant.keycloakUser.id
      ) {
        for (let j = i - 1; j >= 0; j--) {
          if (
            events[j].data.header &&
            events[j].data.header.sender &&
            events[j].data.header.sender.id == conversation.topicParticipant.participant.keycloakUser.id &&
            (events[j].name.toLowerCase() == "agent_message" ||
              (events[j].name.toLowerCase() == "whisper_message" && events[i].data.header.sender.type.toLowerCase() == "agent"))
          ) {
            let senderPresent = alreadyEnteredSenders.findIndex((e) => e.id == events[i].data.header.sender.id);
            if (senderPresent < 0) {
              if (events[j].data.header.seenStatuses) {
                events[j].data.header.seenStatuses.push(events[i].data.header.sender);
                alreadyEnteredSenders.push(events[i].data.header.sender);
              } else {
                events[j].data.header["seenStatuses"] = [];
                events[j].data.header.seenStatuses.push(events[i].data.header.sender);
                alreadyEnteredSenders.push(events[i].data.header.sender);
              }
            }
          }
        }
      }
    }
  }

  getLatestDeliveryEventMessage(events) {
    for (let index = events.length - 1; index >= 0; index--) {
      const event = events[index];

      if (event.name.toLowerCase() == "message_delivery_notification" && event.data.header.sender.type.toLowerCase() == "customer") {
        return event.data;
      }
    }
  }

  getLatestDeliveryEvents(events) {
    let flag = false;
    let deliveryEvents = [];
    for (let index = events.length - 1; index >= 0; index--) {
      let event = events[index];
      if (event.name.toLowerCase() == "message_delivery_notification") {
        deliveryEvents.push(event);
        flag = true;
      }
      if (event.name.toLowerCase() != "message_delivery_notification" && flag) {
        break;
      }
    }
    return deliveryEvents;
  }

  isVoiceChannelSessionExists(activeChannelSessions) {
    let voiceChannelSession = activeChannelSessions.find((channelSession) => {
      if (
        channelSession.channel.channelType.name.toLowerCase() == "cisco_cc" ||
        channelSession.channel.channelType.name.toLowerCase() == "cx_voice"
      ) {
        return channelSession;
      }
    });

    if (voiceChannelSession) {
      return true;
    } else {
      return false;
    }
  }

  isNonVoiceChannelSessionExists(activeChannelSessions) {
    let nonVoiceChannelSession = activeChannelSessions.find((channelSession) => {
      if (
        channelSession.channel.channelType.name.toLowerCase() != "cisco_cc" &&
        channelSession.channel.channelType.name.toLowerCase() != "cx_voice"
        // channelSession.channel.channelConfig.routingPolicy.routingMode.toLowerCase() == "pull" ||
        // channelSession.channel.channelConfig.routingPolicy.routingMode.toLowerCase() == "push"
      ) {
        return channelSession;
      }
    });

    if (nonVoiceChannelSession) {
      return true;
    } else {
      return false;
    }
  }

  // getActiveChannelSessions(messages) {
  //   let lookup = {};
  //   let activeChannelSessions = [];

  //   for (let message, i = 0; (message = messages[i++]);) {
  //     if (message.header.sender.type.toLowerCase() == "customer") {
  //       let id = message.header.channelSession.id;

  //       if (!(id in lookup)) {
  //         lookup[id] = 1;
  //         activeChannelSessions.push(message.header.channelSession);
  //       }
  //     }
  //   }
  //   return activeChannelSessions;
  // }

  processActiveChannelSessions(conversation, incomingChannelSession) {
    // let matched: boolean = false;
    // let index = null;

    // conversation.activeChannelSessions.forEach((activeChannelSession, i) => {
    //   if (activeChannelSession.id === incomingChannelSession.id) {
    //     matched = true;
    //     index = i;
    //     return;
    //   }
    // });

    // if (matched && conversation.activeChannelSessions.length - 1 != index) {
    //   // if matched and session is not at the last of the array then push that channel session to the last in array
    //   // thats why first removing it from the array for removing duplicate entry
    //   conversation.activeChannelSessions.splice(index, 1);

    //   // pusing the incoming channel to the last in array
    //   conversation.activeChannelSessions.push(incomingChannelSession);
    // }
    if (incomingChannelSession.channel.channelType.name.toLowerCase() == "web") {
      let webChannelSession = conversation.activeChannelSessions.find((channelSession) => {
        return channelSession.channel.channelType.name.toLowerCase() == "web";
      });

      if (webChannelSession["isChecked"] != true) {
        conversation.activeChannelSessions.forEach((channelSession) => {
          channelSession["isChecked"] = false;
        });

        webChannelSession["isChecked"] = true;

        conversation.activeChannelSessions = conversation.activeChannelSessions.concat([]);
      }
    } else if (incomingChannelSession.channel.channelType.name.toLowerCase() == "whatsapp") {
      let whatsappChannelSession = conversation.activeChannelSessions.find((channelSession) => {
        return channelSession.channel.channelType.name.toLowerCase() == "whatsapp";
      });

      if (whatsappChannelSession["isChecked"] != true) {
        conversation.activeChannelSessions.forEach((channelSession) => {
          channelSession["isChecked"] = false;
        });

        whatsappChannelSession["isChecked"] = true;

        conversation.activeChannelSessions = conversation.activeChannelSessions.concat([]);
      }
    }
  }

  changeTopicCustomer(cimEvent, conversationId) {
    let conversation = this.conversations.find((e) => {
      //console.log("this is conversation id"+e.conversationId);
      return e.conversationId == conversationId;
    });

    if (conversation) {
      conversation.customer = cimEvent.data;
      //console.log("this is conversation of profile linked suceessfully");
      //this._snackbarService.open(this._translateService.instant("snackbar.Profile-linked-successfully"), "succ");
    }
  }

  removeConversation(conversationId) {
    // fetching the whole conversation which needs to be removed
    let index;
    const removedConversation = this.conversations.find((conversation, indx) => {
      if (conversation.conversationId == conversationId || conversation.customer._id == conversationId) {
        index = indx;
        return conversation;
      }
    });
    if (index != -1) {
      this._sharedService.spliceArray(index, this.conversations);
      --this.conversationIndex;

      // alter the rest of the conversation's indexes whose indexes are greater than the index of removed conversation
      // in order to remap the conversation indexex along with the indexes of the map tabs
      this.conversations.map((conversation) => {
        if (conversation.index > removedConversation.index) {
          conversation.index = --conversation.index;
        }
      });
    }

    this._conversationsListener.next(this.conversations);
  }

  mergeBotSuggestions(conversation, suggestionMessage) {
    if (suggestionMessage && suggestionMessage.requestedMessage && suggestionMessage.requestedMessage.id) {
      let message = conversation.messages.find((e) => {
        if (e.header.sender.type.toLowerCase() == "customer") {
          return e.id == suggestionMessage.requestedMessage.id;
        }
      });

      if (message) {
        message["botSuggestions"] = suggestionMessage.suggestions;
        message["showBotSuggestions"] = false;
        this._conversationsListener.next(this.conversations);
      }
    }
  }

  linkCustomerWithInteraction(customerId, conversationId) {
    this.emit("publishCimEvent", {
      cimEvent: new CimEvent("ASSOCIATED_CUSTOMER_CHANGED", "NOTIFICATION", conversationId, { Id: customerId }, null),
      agentId: this._cacheService.agent.id,
      conversationId: conversationId
    });
    this._snackbarService.open(this._translateService.instant("snackbar.CUSTOMER-LINKED-SUCCESSFULLY"), "succ");
  }

  handleTaskStateChangedEvent(cimEvent, conversationId) {
    let conversation = this.conversations.find((e) => {
      return e.conversationId == conversationId;
    });

    if (conversation) {
      let message = this.createSystemNotificationMessage(cimEvent);
      if (message) {
        conversation.messages.push(message);
      }
    }
  }

  removeChannelSession(cimEvent, conversationId) {
    let conversation = this.conversations.find((e) => {
      return e.conversationId == conversationId;
    });

    if (conversation) {
      let message = this.createSystemNotificationMessage(cimEvent);
      if (message) {
        conversation.messages.push(message);
      }

      let removedChannelSessionIndex = null;
      let removedChannelSession;

      conversation.activeChannelSessions.forEach((channelSession, index) => {
        if (channelSession.id === cimEvent.data.id) {
          removedChannelSessionIndex = index;
          removedChannelSession = channelSession;
        }
      });

      if (removedChannelSessionIndex != null) {
        conversation.activeChannelSessions.splice(removedChannelSessionIndex, 1);

        if (removedChannelSession["isChecked"] == true) {
          // if the channel session is of web or whatsapp then channel session should be selected
          // because the channel session in the array is used to send the message to customer
          let repliedChannelSession = conversation.activeChannelSessions.find((channelSession) => {
            if (
              channelSession.channel.channelType.name.toLowerCase() != "cisco_cc" &&
              channelSession.channel.channelType.name.toLowerCase() != "cx_voice" &&
              channelSession.channel.channelType.name.toLowerCase() != "facebook"
            ) {
              return channelSession;
            }
          });

          if (repliedChannelSession) {
            repliedChannelSession["isChecked"] = true;
          }
        }

        conversation.activeChannelSessions = conversation.activeChannelSessions.concat([]);

        conversation.messageComposerState = this.isNonVoiceChannelSessionExists(conversation.activeChannelSessions);
        console.log("channel session removed");
      } else {
        console.error("channelSessionId not found to removed");
      }
    }
  }

  handleTaskEnqueuedEvent(cimEvent, conversationId) {
    let conversation = this.conversations.find((e) => {
      return e.conversationId == conversationId;
    });

    if (conversation) {
      let message = this.createSystemNotificationMessage(cimEvent);
      if (message) {
        conversation.messages.push(message);
      }
    }
  }

  handleDeliveryNotification(cimEvent, conversationId) {
    let conversation = this.conversations.find((e) => {
      return e.conversationId == conversationId;
    });
    if (
      conversation &&
      cimEvent.data.header.sender.id != conversation.topicParticipant.participant.keycloakUser.id &&
      ((cimEvent.data.header.sender.type.toLowerCase() == "connector" && cimEvent.data.body.status.toLowerCase() == "read") ||
        (cimEvent.data.header.sender.type.toLowerCase() == "agent" && cimEvent.data.body.status.toLowerCase() == "read"))
    ) {
      if (cimEvent.data.header.sender.type.toLowerCase() == "connector") {
        cimEvent.data.header.sender.id = cimEvent.data.header.customer._id;
        cimEvent.data.header.sender.type = "CUSTOMER";
        cimEvent.data.header.sender.senderName =
          cimEvent.data.header.customer.firstName + " " + (cimEvent.data.header.customer.lastName ? cimEvent.data.header.customer.lastName : "");
      }
      this.addParticipantsToLastSeenMessage(conversation, cimEvent.data.body.messageId, cimEvent.data.header.sender);
    }
    if (cimEvent.data.header.sender.type.toLowerCase() == "customer" && cimEvent.data.body.status.toLowerCase() == "read") {
      if (conversation) {
        this.markAgentMessagesToSeenTillId(conversation.messages, cimEvent.data.body.messageId, cimEvent.data.header.customer);
      }
    } else if (cimEvent.data.header.sender.type.toLowerCase() == "system" && cimEvent.data.body.status.toLowerCase() == "failed") {
      if (conversation) {
        const selectedMessage = conversation.messages.find((message) => {
          return message.id == cimEvent.data.body.messageId;
        });
        if (selectedMessage) {
          selectedMessage["header"]["status"] = "failed";
        }
      }
    }
  }

  markAgentMessagesToSeenTillId(messages, id, sender) {
    // find index of the message for the delivery notification
    let index = messages.findIndex((message) => message.id == id);

    // mark all the previous messages as 'seen' before that message
    messages.forEach((message, i) => {
      if (i <= index && (message.header.sender.type.toLowerCase() == "agent" || message.header.sender.type.toLowerCase() == "bot")) {
        if (messages[i]["header"]["status"] != "failed") {
          messages[i]["header"]["status"] = "seen";
        }
      }
    });
  }
  addParticipantsToLastSeenMessage(conversation, id, sender) {
    // find index of the message for the delivery notification
    let messages = conversation.messages;
    let index = -1;
    // let index = messages[index].header.sender.findIndex((message) => message.id == id);
    for (let i = messages.length - 1; i >= 0; i--) {
      if (
        messages[i].header &&
        (!messages[i].header.status || messages[i].header.status != "failed") &&
        messages[i].header.sender.id == conversation.topicParticipant.participant.keycloakUser.id &&
        (!messages[i].body.isWhisper || sender.type.toLowerCase() != "customer")
      ) {
        index = i;
        break;
      }
    }
    var senderPresent = -1;
    if (index != -1) {
      if (!messages[index].header.seenStatuses) {
        messages[index].header["seenStatuses"] = [];
      } else {
        senderPresent = messages[index].header.seenStatuses.findIndex((x) => x.id === sender.id);
      }
      //if not exist already add in the list
      if (senderPresent == -1) {
        messages[index].header.seenStatuses.push(sender);
        //Move bar to 100% if it is greater than 97 %
        this._sharedService.serviceChangeMessage({ msg: "seenReportAdded", data: null });
        //if sender pushed to list remove the sender from above messages if found
        if (index > 0) {
          for (let k = index - 1; k >= 0; k--) {
            if (
              messages[k].header &&
              messages[k].header.sender.id == conversation.topicParticipant.participant.keycloakUser.id &&
              messages[k].header.seenStatuses
            ) {
              const indx = messages[k].header.seenStatuses.findIndex((ser) => ser.id == sender.id);
              if (indx > -1) {
                messages[k].header.seenStatuses.splice(indx, 1);
              }
            }
          }
        }
      }
    }
  }
  handleNoAgentEvent(cimEvent, conversationId) {
    let conversation = this.conversations.find((e) => {
      return e.conversationId == conversationId;
    });

    if (conversation) {
      let message = this.createSystemNotificationMessage(cimEvent);
      if (message) {
        conversation.messages.push(message);
      }
    }
  }

  addChannelSession(cimEvent, conversationId) {
    let conversation = this.conversations.find((e) => {
      return e.conversationId == conversationId;
    });

    if (conversation) {
      let message = this.createSystemNotificationMessage(cimEvent);

      if (cimEvent.data.channel.channelType.name.toLowerCase() == "cisco_cc" || cimEvent.data.channel.channelType.name.toLowerCase() == "cx_voice") {
        cimEvent.data["isDisabled"] = true;
        cimEvent.data["isChecked"] = false;
      } else {
        conversation.activeChannelSessions.forEach((channelSession) => {
          channelSession["isChecked"] = false;
        });
        cimEvent.data["isChecked"] = true;
        cimEvent.data["isDisabled"] = false;
      }
      // console.log("voice session==>", cimEvent);
      //feed the active channel session array
      // if (cimEvent.data.channel.channelType.name.toLowerCase() == "voice") {
      //   if (cimEvent.data.state.reasonCode != "AGENT") {
      //     // conversation.activeChannelSessions.push(participant);
      //     conversation.activeChannelSessions.push(cimEvent.data);
      //   } else {
      //     // console.log("participant==>", cimEvent.data);
      //   }
      // } else {

      conversation.activeChannelSessions.push(cimEvent.data);
      // }

      // conversation.activeChannelSessions.push(cimEvent.data);

      conversation.activeChannelSessions = conversation.activeChannelSessions.concat([]);

      if (message) {
        conversation.messages.push(message);
      }

      conversation.messageComposerState = this.isNonVoiceChannelSessionExists(conversation.activeChannelSessions);
    } else {
      console.error("channelSessionId not found to added");
    }
  }

  handleTypingStartedEvent(cimEvent, sameTopicConversation) {
    //isTyping is not initialized start the timer else restart the timer
    if (!sameTopicConversation["isTyping"]) {
      sameTopicConversation["isTyping"] = setTimeout(() => {
        sameTopicConversation["isTyping"] = false;
      }, 5000);
    } else {
      clearTimeout(sameTopicConversation["isTyping"]);
      sameTopicConversation["isTyping"] = setTimeout(() => {
        sameTopicConversation["isTyping"] = false;
      }, 5000);
    }
  }
  handleParticipantRoleChangedEvent(cimEvent, conversationId) {
    let conversation = this.conversations.find((e) => {
      return e.conversationId == conversationId;
    });

    if (conversation) {
      if (this._cacheService.agent.id == cimEvent.data.conversationParticipant.participant.keycloakUser.id) {
        conversation.topicParticipant = cimEvent.data.conversationParticipant;
        console.log("updated participant", conversation.topicParticipant);
      } else {
        conversation.agentParticipants.push(cimEvent.data.conversationParticipant);
        conversation.agentParticipants = conversation.agentParticipants.concat([]);
      }
      let message = this.createSystemNotificationMessage(cimEvent);

      if (message) {
        conversation.messages.push(message);
      }
    }
  }

  upateActiveConversationData(cimEvent, conversationId) {
    let conversation = this.conversations.find((e) => {
      return e.conversationId == conversationId;
    });

    if (conversation) {
      conversation.activeConversationData = cimEvent.data;
    }
  }

  handleAgentSubscription(cimEvent, conversationId) {
    let conversation = this.conversations.find((e) => {
      return e.conversationId == conversationId;
    });

    if (conversation) {
      if (cimEvent.name.toLowerCase() == "agent_subscribed") {
        if (cimEvent.data.agentParticipant.participant.keycloakUser.id != conversation.topicParticipant.participant.keycloakUser.id) {
          conversation.agentParticipants.push(cimEvent.data.agentParticipant);
          conversation.agentParticipants = conversation.agentParticipants.concat([]);
        }
      } else if (cimEvent.name.toLowerCase() == "agent_unsubscribed") {
        conversation.agentParticipants = conversation.agentParticipants.filter((participant) => {
          return participant.participant.keycloakUser.id != cimEvent.data.agentParticipant.participant.keycloakUser.id;
        });
      }

      let message = this.createSystemNotificationMessage(cimEvent);

      if (message) {
        conversation.messages.push(message);
      }
    }
  }

  onSocketErrors(res) {
    this._snackbarService.open(this._translateService.instant("snackbar.on") + " " + res.task + " " + res.msg, "err");
  }

  playSoundAndBrowserNotification(conversation, cimEvent) {
    if (document.hidden) {
      this.showOnBrowserNoticication(conversation, cimEvent);
    } else {
      if (this._router.url !== "/customers/chats") {
        this.showOnBrowserNoticication(conversation, cimEvent);
      }
    }
    this._soundService.playBeep();
  }

  showOnBrowserNoticication(conversation, cimEvent) {
    if (cimEvent.name.toLowerCase() == "customer_message") {
      if (cimEvent.data.body.type.toLowerCase() == "plain") {
        this._soundService.openBrowserNotification(conversation.customer.firstName, cimEvent.data.body.markdownText);
      } else {
        this._soundService.openBrowserNotification(conversation.customer.firstName, "sent a " + cimEvent.data.body.type + " message");
      }
    } else if (cimEvent.name.toLowerCase() == "bot_message") {
      if (cimEvent.data.body.type.toLowerCase() == "plain") {
        this._soundService.openBrowserNotification("BOT", cimEvent.data.body.markdownText);
      } else {
        this._soundService.openBrowserNotification("BOT", "sent a " + cimEvent.data.body.type + " message");
      }
    }
  }

  moveToLogin() {
    try {
      sessionStorage.clear();
      localStorage.removeItem("ccUser");
    } catch (e) {}
    this._cacheService.resetCache();
    this._router.navigate(["login"]);
  }

  /**
   * to link the incoming customer requests to identified customers
   *
   * @param {Object} selectedCustomer the customer object which is selected to link the incoming customer with
   * @param {UUID} conversationId selected topic ID
   * @returns {Object}
   */

  async linkCustomerWithTopic(selectedCustomer, conversationId) {
    try {
      const conversation = this.conversations.find((e) => {
        return e.conversationId == conversationId;
      });
      const topicCustomer = conversation.customer;
      const channelSession = conversation.firstChannelSession;

      if (topicCustomer && channelSession) {
        const channelType = channelSession.channel.channelType.name;
        const channelIdentifier = channelSession.channelData.channelCustomerIdentifier;
        console.log("channelType " + channelType + " channelIdentifier " + channelIdentifier);
        if (channelType && channelIdentifier) {
          let attr;

          this._sharedService.schema.forEach((e: any) => {
            if (e.isChannelIdentifier == true) {
              if (e.channelTypes.includes(channelType)) {
                attr = e.key;
              }
            }
          });

          if (attr) {
            if (selectedCustomer[attr].includes(channelIdentifier)) {
              const resp: any = await this._sharedService.getProfileLinkingConfirmation(null, selectedCustomer.firstName, null, false);
              if (resp.decisionIs) {
                this.updateTopiCustomer(
                  selectedCustomer,
                  topicCustomer,
                  false,
                  topicCustomer.isAnonymous == true ? topicCustomer._id : null,
                  conversationId,
                  resp.isAttributeMerge
                );
              }
            } else {
              // const resp = await this._sharedService.getConfirmation('Merge Attribute Value', `Are you sure you want to add ${channelIdentifier} to ${selectedCustomer.firstName}'s ${attr}`);
              const resp: any = await this._sharedService.getProfileLinkingConfirmation(channelIdentifier, selectedCustomer.firstName, attr, true);

              if (resp.decisionIs == true) {
                if (resp.isAttributeMerge == true) {
                  if (selectedCustomer[attr].length <= 9) {
                    selectedCustomer[attr].push(channelIdentifier);
                    this.updateTopiCustomer(
                      selectedCustomer,
                      topicCustomer,
                      true,
                      topicCustomer.isAnonymous == true ? topicCustomer._id : null,
                      conversationId,
                      resp.isAttributeMerge
                    );
                    console.log("limit not exceed");
                  } else {
                    console.log("limit exceed");
                    this._snackbarService.open(
                      this._translateService.instant("snackbar.The-conversation-is-going-to-linking-with") +
                        selectedCustomer.firstName +
                        this._translateService.instant("snackbar.However-the-channel-identifier") +
                        channelIdentifier +
                        this._translateService.instant("snackbar.can-not-be-added-in") +
                        selectedCustomer.firstName +
                        attr +
                        this._translateService.instant("snackbar.space-unavailable-may-delete-channel-identifer"),
                      "succ",
                      20000,
                      "Ok"
                    );
                    // this.updateTopiCustomer(selectedCustomer, false, topicCustomer.isAnonymous == true ? topicCustomer._id : null, conversationId);
                  }
                } else {
                  this.updateTopiCustomer(
                    selectedCustomer,
                    topicCustomer,
                    false,
                    topicCustomer.isAnonymous == true ? topicCustomer._id : null,
                    conversationId,
                    resp.isAttributeMerge
                  );
                }
              }
            }
          } else {
            const resp: any = await this._sharedService.getProfileLinkingConfirmation(null, selectedCustomer.firstName, null, false);
            if (resp.decisionIs) {
              this.updateTopiCustomer(
                selectedCustomer,
                topicCustomer,
                false,
                topicCustomer.isAnonymous == true ? topicCustomer._id : null,
                conversationId,
                resp.isAttributeMerge
              );
            }
            // this._snackbarService.open("unable to link customer", "err");
          }
        } else {
          const resp: any = await this._sharedService.getProfileLinkingConfirmation(null, selectedCustomer.firstName, null, false);

          if (resp.decisionIs) {
            this.updateTopiCustomer(
              selectedCustomer,
              topicCustomer,
              false,
              topicCustomer.isAnonymous == true ? topicCustomer._id : null,
              conversationId,
              resp.isAttributeMerge
            );
          }
          //  this.snackErrorMessage("Unable to link profile");
        }
        //  this._socketService.linkCustomerWithInteraction(customerId, this.conversationId);
      } else {
        this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-link-customer"), "err");
      }
    } catch (err) {
      console.error("err ", err);
      this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-link-customer"), "err");
    }
  }

  /**
   * to update the customer object of the current conversation with the selected customer
   *
   * @param {Object} selectedCustomer the customer object which is selected to link the incoming customer with
   * @param {Object} topicCustomer the incoming request customer object
   * @param {Boolean} needToBeUpdate to check if identifier needs to be updated in the selected
   * @param {ObjectID} toBeDeletedCustomerId the incoming request customer object ID
   * @param {UUID} conversationId selected topic ID
   * @param {Boolean} addChannelIdentifier to check if identifier is required to be added in the selected customer or not
   * @returns {Object}
   */

  updateTopiCustomer(selectedCustomer, topicCustomer, needToBeUpdate: boolean, toBeDeletedCustomerId, conversationId, addChannelIdentifier) {
    console.log("topic updated");
    console.log("need to be updated " + needToBeUpdate);
    console.log("toBeDeletedCustomerId " + toBeDeletedCustomerId);

    let selectedCustomerId = selectedCustomer._id;

    if (needToBeUpdate) {
      // updating customer

      delete selectedCustomer["_id"];
      delete selectedCustomer["__v"];

      this._httpService.updateCustomerById(selectedCustomerId, selectedCustomer).subscribe(
        (e) => {
          selectedCustomer["_id"] = selectedCustomerId;
          // this._snackbarService.open(this._translateService.instant("snackbar.Profile-linked-successfully"), "succ");
          // updating customer topic
          this._httpService.updateConversationCustomer(conversationId, selectedCustomer).subscribe(
            (e) => {
              if (addChannelIdentifier && toBeDeletedCustomerId != null) {
                let requestPayload = { currentCustomer: topicCustomer, newCustomer: selectedCustomer };
                this.updatePastConversation(requestPayload, toBeDeletedCustomerId);
              } else {
                this._router.navigate(["customers"]);
              }
            },
            (error) => {
              this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-link-customer"), "err");
              console.error("error while updating topic customer", error);
            }
          );
        },
        (error) => {
          this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-link-customer"), "err");
          console.error("error while updating customer ", error);
        }
      );
    } else {
      selectedCustomer["_id"] = selectedCustomerId;
      // updating customer topic
      this._httpService.updateConversationCustomer(conversationId, selectedCustomer).subscribe(
        (e) => {
          if (toBeDeletedCustomerId != null) {
            this.checkPastActivitiesAndDeleteCustomer(topicCustomer._id);
          } else {
            this._router.navigate(["customers"]);
          }
        },
        (error) => {
          this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-link-customer"), "err");
          console.error("error while updating topic customer ", error);
        }
      );
    }
    this._snackbarService.open(this._translateService.instant("snackbar.Profile-linked-successfully"), "succ");
  }

  /**
   * to update the customer object of the current conversation with the selected customer
   *
   * @param {Object} customersObj the object containing current customer and new customer customer objects
   * @param {ObjectID} toBeDeletedCustomerId the incoming request customer object ID
   * @returns {Object}
   */
  updatePastConversation(customersObj, toBeDeletedCustomerId) {
    this._httpService.updatePastConversationCustomer(customersObj).subscribe(
      (res) => {
        // if (res.status == "OK") {
        // if success response is fetched ,then delete the customer
        console.log(res.message);
        this.deleteCustomerAndRouteToAgent(toBeDeletedCustomerId);
        // }
      },
      (error) => {
        if (error.error && error.error.status && error.error.status == "NOT_FOUND") {
          console.error(error.error.message ? error.error.message : "Conversation_NOT_FOUND");
          // this._router.navigate(["customers"]);
          this.deleteCustomerAndRouteToAgent(toBeDeletedCustomerId);
        } else {
          console.error("error while updating past conversation customer ", error);
        }
      }
    );
  }

  /**
   * to delete customer object and routing to the customers page
   *
   * @param {ObjectID} toBeDeletedCustomerId the customer ID of the active conversation customer
   * @returns {Object}
   */

  deleteCustomerAndRouteToAgent(toBeDeletedCustomerId) {
    if (toBeDeletedCustomerId != null) {
      // deleting customer
      this._httpService.deleteCustomerById(toBeDeletedCustomerId).subscribe();
    }
    this._router.navigate(["customers"]);
  }

  /**
   * to check if there are any past activities associated with the customer object
   *
   * @param {ObjectID} customerID the customer ID of the active conversation customer
   * @returns {Object}
   */
  checkPastActivitiesAndDeleteCustomer(customerID) {
    try {
      this._httpService.getPastActivities(customerID, 25, 0).subscribe(
        (res: any) => {
          let docsLength: number = res ? res.docs.length : 0;
          if (docsLength > 0) {
            // to check if there any past activities exist and then routing to the customer page
            this._router.navigate(["customers"]);
          } else {
            // if no past activities exist, then deleting the customer
            this.deleteCustomerAndRouteToAgent(customerID);
          }
        },
        (error) => {
          this._sharedService.Interceptor(error.error, "err");
          console.error("[Load Past Activity] Error :", error);
        }
      );
    } catch (e) {
      console.error("[Load Past Activity] Error :", e);
    }
  }

  createSystemNotificationMessage(cimEvent) {
    let CimMessage: any = {
      id: "",
      header: { timestamp: "", sender: {}, channelSession: {}, channelData: {} },
      body: { markdownText: "", type: "" }
    };

    CimMessage.id = uuidv4();
    CimMessage.header.timestamp = cimEvent.timestamp;
    CimMessage.body.type = "systemNotification";
    CimMessage.header.sender.type = "system";

    let message = undefined;

    if (cimEvent.name.toLowerCase() == "channel_session_started") {
      message = CimMessage;
      // if (cimEvent.data.body) {
      //   message.body["displayText"] = cimEvent.data.header.channelSession.channel.channelType.name;
      // } else {
      message.body["displayText"] = cimEvent.data.channel.channelType.name;
      // }

      this._translateService.stream("socket-service.session-started").subscribe((data: string) => {
        message.body.markdownText = data;
      });
    } else if (cimEvent.name.toLowerCase() == "channel_session_ended") {
      message = CimMessage;
      message.body["displayText"] = cimEvent.data.channel.channelType.name;

      this._translateService.stream("socket-service.session-ended").subscribe((data: string) => {
        message.body.markdownText = data;
      });
      message.body.markdownText = "session ended";
    } else if (cimEvent.name.toLowerCase() == "call_leg_ended" || cimEvent.name.toLowerCase() == "voice_activity") {
      message = CimMessage;
      // console.log("test==>")
      message.body.type = "VOICE";
      // message.body["displayText"] = cimEvent.data.channel.channelType.name;
      // message.body.markdownText = "call_leg_ended";
      message.body.data = cimEvent.data;
    } else if (cimEvent.name.toLowerCase() == "agent_subscribed" && cimEvent.data.agentParticipant.role.toLowerCase() != "silent_monitor") {
      message = CimMessage;
      message.body["displayText"] =
        this._cacheService.agent.id == cimEvent.data.agentParticipant.participant.keycloakUser.id
          ? "You"
          : cimEvent.data.agentParticipant.participant.keycloakUser.username;
      if (message.body.displayText == "You") {
        this._translateService.stream("socket-service.have-joined-the-conversation").subscribe((data: string) => {
          message.body.markdownText = data;
        });
      } else {
        this._translateService.stream("socket-service.has-joined-the-conversation").subscribe((data: string) => {
          message.body.markdownText = data;
        });
      }
    } else if (cimEvent.name.toLowerCase() == "participant_role_changed" && cimEvent.data.conversationParticipant.role.toLowerCase() == "primary") {
      message = CimMessage;
      message.body["displayText"] =
        this._cacheService.agent.id == cimEvent.data.conversationParticipant.participant.keycloakUser.id
          ? "You"
          : cimEvent.data.conversationParticipant.participant.keycloakUser.username;
      this._translateService.stream("socket-service.has-joined-the-conversation").subscribe((data: string) => {
        message.body.markdownText = data;
      });
    } else if (cimEvent.name.toLowerCase() == "agent_unsubscribed" && cimEvent.data.agentParticipant.role.toLowerCase() != "silent_monitor") {
      message = CimMessage;
      message.body["displayText"] =
        this._cacheService.agent.id == cimEvent.data.agentParticipant.participant.keycloakUser.id
          ? "You"
          : cimEvent.data.agentParticipant.participant.keycloakUser.username;

      this._translateService.stream("socket-service.left-the-conversation").subscribe((data: string) => {
        message.body.markdownText = data;
      });
    } else if (cimEvent.name.toLowerCase() == "task_enqueued") {
      message = CimMessage;
      let mode;
      if (cimEvent.data.task.type.mode.toLowerCase() == "agent") {
        mode = "Agent";
      } else if (cimEvent.data.task.type.mode.toLowerCase() == "queue") {
        mode = "Queue";
      }
      if (cimEvent.data.task.type.direction == "DIRECT_TRANSFER") {
        let text = " transfer request has been placed by ";
        this._translateService.stream("socket-service.transfer-request-has-been-placed-by").subscribe((data: string) => {
          text = data;
        });

        let string = mode + " " + text + " " + cimEvent.data.task.type.metadata.requestedBy;
        message.body["displayText"] = "";
        message.body.markdownText = string;
      } else if (cimEvent.data.task.type.direction == "DIRECT_CONFERENCE") {
        let text = "conference request has been placed by";
        this._translateService.stream("socket-service.conference-request-has-been-placed-by").subscribe((data: string) => {
          text = data;
        });
        let string = mode + " " + text + " " + cimEvent.data.task.type.metadata.requestedBy;
        message.body["displayText"] = "";
        message.body.markdownText = string;
      } else {
        message = null;
      }
    } else if (cimEvent.name.toLowerCase() == "no_agent_available") {
      message = CimMessage;
      let mode;
      let direction;

      if (cimEvent.data.requestType.mode.toLowerCase() == "agent") {
        mode = "Agent";
      } else if (cimEvent.data.requestType.mode.toLowerCase() == "queue") {
        mode = "Queue";
      }

      if (cimEvent.data.requestType.direction.toLowerCase() == "direct_transfer") {
        direction = "transfer";
        let text = "No agent is available for";
        this._translateService.stream("socket-service.No-agent-is-available-for").subscribe((data: string) => {
          text = data;
        });
        let string = text + " " + mode + " " + direction;
        message.body["displayText"] = "";
        message.body.markdownText = string;
      } else if (cimEvent.data.requestType.direction.toLowerCase() == "direct_conference") {
        direction = "conference";

        let text = "No agent is available for";
        this._translateService.stream("socket-service.No-agent-is-available-for").subscribe((data: string) => {
          text = data;
        });
        let string = text + " " + mode + " " + direction;
        message.body["displayText"] = "";
        message.body.markdownText = string;
      } else {
        message = null;
      }
    } else if (cimEvent.name.toLowerCase() == "task_state_changed") {
      if (
        cimEvent.data.type.direction.toLowerCase() == "direct_conference" &&
        cimEvent.data.state.reasonCode &&
        cimEvent.data.state.reasonCode.toLowerCase() == "force_closed"
      ) {
        message = CimMessage;
        message.body["displayText"] = "";
        this._translateService.stream("socket-service.conference-request-has-cancelled").subscribe((data: string) => {
          message.body.markdownText = data;
        });
      }
    }

    return message;
  }

  topicUnsub(conversation) {
    console.log("going to unsub from topic==>" + conversation.conversationId);

    if (conversation.state === "ACTIVE") {
      // if the topic state is 'ACTIVE' then agent needs to request the agent manager for unsubscribe
      this.emit("topicUnsubscription", {
        conversationId: conversation.conversationId,
        agentId: this._cacheService.agent.id
      });
    } else if (conversation.state === "CLOSED") {
      // if the topic state is 'CLOSED' it means agent is already unsubscribed by the agent manager
      // now it only needs to clear the conversation from conversations array

      if (conversation.conversationId == "FAKE_CONVERSATION") {
        this.removeConversation(conversation.customer._id);
      } else {
        this.removeConversation(conversation.conversationId);
      }
    }
  }

  getTopicSubscription(conversationId, taskId) {
    this.emit("topicSubscription", {
      topicParticipant: new TopicParticipant("AGENT", this._cacheService.agent, conversationId, "PRIMARY", "SUBSCRIBED"),
      agentId: this._cacheService.agent.id,
      conversationId: conversationId,
      taskId: taskId
    });
  }

  createConversationDataMessage(cimEvent) {
    let message: any = {
      id: "",
      header: { timestamp: "", sender: {}, channelData: {} },
      body: { markdownText: "", type: "" }
    };

    message.id = uuidv4();
    message.header.timestamp = cimEvent.timestamp;
    message.body.type = "conversationData";
    message.header.sender.type = "system";
    message.body["conversationData"] = cimEvent.data;

    return message;
  }

  createVoiceMessage(cimEvent) {
    let message: any = {
      id: "",
      header: { timestamp: "", sender: {}, channelData: {} },
      body: { markdownText: "", type: "" }
    };

    message.id = uuidv4();
    message.header.timestamp = cimEvent.timestamp;
    message.body.type = "conversationData";
    message.header.sender.type = "system";
    message.body["conversationData"] = cimEvent.data;

    return message;
  }

  getCimMessageByMessageId(cimMessages, id) {
    return cimMessages.find((cimMessage) => {
      return cimMessage.id == id;
    });
  }

  processCommentActions(cimMessages, message) {
    if (["like", "hide", "delete"].includes(message.body.itemType.toLowerCase())) {
      let commentMessage = this.getCimMessageByMessageId(cimMessages, message.header.replyToMessageId);
      if (commentMessage) {
        if (message.body.itemType.toLowerCase() == "like") {
          commentMessage["isLiked"] = true;
        } else if (message.body.itemType.toLowerCase() == "hide") {
          commentMessage["isHidden"] = true;
        } else if (message.body.itemType.toLowerCase() == "delete") {
          commentMessage["isDeleted"] = true;
        }
      }
    }
  }
}
