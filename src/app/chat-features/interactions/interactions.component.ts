import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from "@angular/core";
import { cacheService } from "src/app/services/cache.service";
import { sharedService } from "src/app/services/shared.service";
import { socketService } from "src/app/services/socket.service";
import { MatDialog, MatSnackBar } from "@angular/material";
import { CimEvent } from "../../models/Event/cimEvent";
import { v4 as uuidv4 } from "uuid";
import { NgScrollbar } from "ngx-scrollbar";
import { snackbarService } from "src/app/services/snackbar.service";
import { FilePreviewComponent } from "src/app/file-preview/file-preview.component";
import { appConfigService } from "src/app/services/appConfig.service";
import { httpService } from "src/app/services/http.service";
import { finesseService } from "src/app/services/finesse.service";
import { ConfirmationDialogComponent } from "src/app/new-components/confirmation-dialog/confirmation-dialog.component";
import { WrapUpFormComponent } from "../wrap-up-form/wrap-up-form.component";
import { TranslateService } from "@ngx-translate/core";
import { CallControlsComponent } from "../../new-components/call-controls/call-controls.component";
import { SipService } from "src/app/services/sip.service";
import { HighlightResult } from 'ngx-highlightjs';


// declare var EmojiPicker: any;

@Component({
  selector: "app-interactions",
  templateUrl: "./interactions.component.html",
  styleUrls: ["./interactions.component.scss"]
})
export class InteractionsComponent implements OnInit {
  @Input() conversation: any;
  @Input() customerBar: any;
  @Input() currentTabIndex: any;
  @Input() changeDetecter: any;
  @Output() expandCustomerInfo = new EventEmitter<any>();
  @Output() updatedlabels = new EventEmitter<boolean>();
  @ViewChild("replyInput", { static: true }) elementView: ElementRef;
  @ViewChild(NgScrollbar, { static: true }) scrollbarRef: NgScrollbar;
  @ViewChild("media", { static: false }) media: ElementRef;
  @ViewChild("mainScreen", { static: false }) elementViewSuggestions: ElementRef;
  @ViewChild("consultTransferTrigger", { static: false }) consultTransferTrigger: any;

  isWhisperMode: boolean = false;
  dispayVideoPIP = true;
  scrollSubscriber;
  labels: Array<any> = [];
  quotedMessage: any;
  replyToMessageId: any;
  privateMessageReply: any
  viewFullCommentAction: boolean = false;
  fullPostView: boolean = false;
  selectedCommentId: string;
  lastSeenMessageId;
  pastActivitiesloadedOnce:boolean=false;
  // isTransfer = false;
  // isConsult = false;
  ctiBarView = true;
  ctiBoxView = false;
  timer: any = "00:00";
  cxVoiceSession: any;

  ngAfterViewInit() {
    this.scrollSubscriber = this.scrollbarRef.scrollable.elementScrolled().subscribe((scrolle: any) => {
      let scroller = scrolle.target;
      let height = scroller.clientHeight;
      let scrollHeight = scroller.scrollHeight - height;
      let scrollTop = scroller.scrollTop;
      let percent = Math.floor((scrollTop / scrollHeight) * 100);
      this.currentScrollPosition = percent;
      if (percent > 80) {
        this.showNewMessageNotif = false;
      }
    });
  }

  categories: string[] = ["Fayina Addinall", "Doy Ortelt", " Ev Gayforth", "Adam Joe Stanler"];

  showNewMessageNotif: boolean = false;
  currentScrollPosition: number = 100;

  isBarOpened = false;
  unidentified = true;
  isConnected = true;
  popTitle = "Notes";
  expanedHeight = 0;
  selectedLanguage = "";
  isRTLView = false;

  message = "";
  convers: any[];
  ringing = false;
  callControls = true;

  isSuggestion = false;
  displaySuggestionsArea = false;
  cannedTabOpen = false;
  quickReplies = true;
  viewHeight = "180px";
  noMoreConversation = false;
  pastCimEventsOffsetLimit: number = 0;
  loadingPastActivity: boolean = false;
  activeChat = false;
  activeChannelSessionList: Array<any>;
  commentPostId: string = null;
  commentId: string = null;
  conversationSettings: any;
  postData: any = null;
  postComments: any = null;
  sendTypingStartedEventTimer: any = null;
  onMessageSuggestions = false;

  constructor(
    private _sharedService: sharedService,
    public _cacheService: cacheService,
    public _socketService: socketService,
    private dialog: MatDialog,
    private _snackbarService: snackbarService,
    public _appConfigService: appConfigService,
    private _httpService: httpService,
    public _finesseService: finesseService,
    private snackBar: MatSnackBar,
    public _sipService: SipService,
    private _translateService: TranslateService
  ) { }
  ngOnInit() {
    //  console.log("i am called hello")
    if (navigator.userAgent.indexOf("Firefox") != -1) {
      this.dispayVideoPIP = false;
    }
    this.convers = this.conversation.messages;
    // setTimeout(() => {
    //   new EmojiPicker();
    // }, 500);

    this.isWhisperMode = this.conversation.topicParticipant.role == "SILENT_MONITOR" ? true : false;
    this.conversationSettings = this._sharedService.conversationSettings;
    this.loadLabels();

    //to get the language saved in prefrence of the agent
    this.selectedLanguage = this._sharedService.prefferedLanguageCode;

    //listen to the change of the language preference
    this._sharedService.selectedlangugae.subscribe((data: string) => {
      this.selectedLanguage = data;
    });

    if (this.selectedLanguage == "ar") {
      this.isRTLView = true;
    }

    this._sharedService.serviceCurrentMessage.subscribe((e: any) => {
      if (e.msg == "seenReportAdded") {
        if (this.currentScrollPosition > 90) {
          this.downTheScrollAfterMilliSecs(0, "smooth");
        }
      }
    });

    if (this.conversation && this._socketService.isVoiceChannelSessionExists(this.conversation.activeChannelSessions)) {
      if (this._sipService.isCallActive == true) this.ctiControlBar();
      this.getVoiceChannelSession();
    }
  }

  loadLabels() {
    this._httpService.getLabels().subscribe(
      (e) => {
        this.labels = e;
      },
      (err) => {
        this._sharedService.Interceptor(err.error, "err");
        console.error("Error getting Labels", err);
      }
    );
  }
  emoji() { }

  BargeIn() {
    let obj = {
      participantId: this.conversation.topicParticipant.participant.id,
      conversationId: this.conversation.conversationId
    };
    this._socketService.emit("JoinAsBargin", obj);
  }

  onSend(text) {
    text = text.trim();

    if (text) {
      this.constructAndSendCimEvent("plain", "", "", "", text);
    }
  }

  // This was fb page comment action / Generalizing it.
  commentAction(message, action) {

    if (action == "like" && message["isLiked"]) {
    }
    else if (this._socketService.isSocketConnected) {

      let commentId = message.header.providerMessageId;
      if (commentId && message.body.postId) {
        let channelSession = this.getChannelSession(message);
        if (channelSession) {
          let originalChannelSession = JSON.parse(JSON.stringify(channelSession));
          delete originalChannelSession["isChecked"];
          delete originalChannelSession["isDisabled"];

          this.constructAndSendCommentAction(commentId, message.body.postId, originalChannelSession, message.id, action);
        } else {
          this._snackbarService.open(this._translateService.instant("snackbar.Requested-session-not-available-at-the-moment"), "err");
        }
      } else {
        this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-process-the-request"), "err");
      }
    }
    else {
      this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-connect-with-server"), "err");
    }
  }


  constructAndSendCommentAction(commentId, postId, channelSession, replyToMessageId, action) {
    let message = this.getCimMessage();
    message.header.providerMessageId = commentId;
    message.body.postId = postId;
    message.body.type = "COMMENT";
    message.header.channelSession = channelSession;
    message.header.channelData = channelSession.channelData;
    message.header.replyToMessageId = replyToMessageId;
    if (action == "like" || action == "delete" || action == "hide") {
      message.body.itemType = action.toUpperCase();
      this.emitFBActionEvent(message);
    }
  }

  //This is for private comment reply for Instagram for now.
  privateReplyToComment(message) {
    this.privateMessageReply = "PRIVATE_REPLY"
    this.replyToComment(message)
  }
  //replyToFBComment
  replyToComment(message) {
    this.commentPostId = message.body.postId;
    this.replyToMessageId = message.id;
    this.commentId = message.header.providerMessageId;
    if (this.commentPostId && this.commentId) {
      let channelSession = this.getChannelSession(message);

      if (channelSession) {
        this.conversation.activeChannelSessions.forEach((channelSession) => {
          channelSession.isChecked = false;
        });

        channelSession.isChecked = true;

        this.conversation.activeChannelSessions = this.conversation.activeChannelSessions.concat([]);

        this.openQuotedReplyArea(message);
      } else {
        this._snackbarService.open(this._translateService.instant("snackbar.Requested-session-not-available-at-the-moment"), "err");
      }
    } else {
      this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-process-the-request"), "err");
    }
  }
  
  //Quoted Reply
  onQuotedReply(message) {
    this.replyToMessageId = message.id;
    this.openQuotedReplyArea(message);
  }

  navigationToRepliedMessage(repliedMessage: any) {
    if (repliedMessage && repliedMessage.id ) {
      const elementId = repliedMessage.id;
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    }
  }

  openDialog(templateRef, e): void {
    this.popTitle = e;

    this.dialog.open(templateRef, {
      panelClass: "wrap-dialog"
    });
  }

  //To open the quoted area
  openQuotedReplyArea(e) {
    this.quotedMessage = e;
  }
  onTextAreaFocus() {
    this.conversation.unReadCount = 0;
    this.publishLatestMessageSeenEvent();
  }

  publishLatestMessageSeenEvent() {
    let latestCustomerMessage = this.getLatestCustomerMessage();
    this.publishMessageSeenEvent(latestCustomerMessage);
  }

  getLatestCustomerMessage() {
    for (let index = this.conversation.messages.length - 1; index >= 0; index--) {
      const message = this.conversation.messages[index];
      if (
        message.header.sender.type.toLowerCase() == "customer" ||
        (message.header.sender.type.toLowerCase() == "agent" &&
          message.header.sender.id !== this.conversation.topicParticipant.participant.keycloakUser.id)
      ) {
        return message;
      }
    }
  }

  publishMessageSeenEvent(messageForSeenNotification) {
    if (
      document.hasFocus() &&
      messageForSeenNotification &&
      messageForSeenNotification.id != this.lastSeenMessageId &&
      this.conversation.topicParticipant.role.toLowerCase() != "silent_monitor"
    ) {
      const data = {
        id: uuidv4(),
        header: {
          channelData: {
            channelCustomerIdentifier: messageForSeenNotification.header.channelData.channelCustomerIdentifier,
            serviceIdentifier: messageForSeenNotification.header.channelData.serviceIdentifier
          },
          sender: {
            id: this.conversation.topicParticipant.participant.keycloakUser.id,
            senderName: this.conversation.topicParticipant.participant.keycloakUser.username,
            type: "AGENT"
          },
          channelSession: messageForSeenNotification.header.channelSession,
          language: {},
          timestamp: "",
          securityInfo: {},
          stamps: [],
          intent: null,
          entities: {}
        },
        body: {
          type: "DELIVERYNOTIFICATION",
          markdownText: "",
          messageId: messageForSeenNotification.id,
          status: "READ",
          reasonCode: 200
        }
      };

      let event: any = new CimEvent(
        "MESSAGE_DELIVERY_NOTIFICATION",
        "NOTIFICATION",
        this.conversation.conversationId,
        data,
        this.conversation.customer
      );

      this._socketService.emit("publishCimEvent", {
        cimEvent: event,
        agentId: this._cacheService.agent.id,
        conversationId: this.conversation.conversationId
      });

      this.lastSeenMessageId = messageForSeenNotification.id;
      this.conversation.unReadCount = 0;
    }
  }

  // textChanged(event) {
  //   const el: any = document.getElementById("messageTextarea");
  //   this.message = el.value;
  // }

  //on every key press
  onKey(event) {
    this.message = event.target.value;
    this.expanedHeight = this.elementView.nativeElement.offsetHeight;
    // if (this.message === "" && event.keyCode === 40) {
    //   this.isSuggestion = true;
    // } else if (this.message === "" && event.keyCode === 38) {
    //   this.isSuggestion = false;
    // }
    if (event.key !== "Enter") {
      this.sendTypingEvent();
    }

    if (this.message[0] === "/" || this.message[0] === " ") {
      this.displaySuggestionsArea = false;
      this.quickReplies = false;

      setTimeout(() => {
        this.viewHeight = this.elementViewSuggestions.nativeElement.offsetHeight + 180 + "px";
        this.downTheScrollAfterMilliSecs(0, "smooth");
        // this.viewHeight = this.mainHeight + 180 + 'px';
        // this.scrollToBottom();
      }, 100);

      this.cannedTabOpen = true;
    } else {
      this.cannedTabOpen = false;
      this.quickReplies = true;
      this.viewHeight = "180px";
    }
    // if (this.message[0] === '.') {
    //     console.log('value is 0')
    //     this.isTemplateOpen = false;
    // }
    if (this.expanedHeight > 50) {
      this.adjustHeightOnComposerResize();
    }
  }

  //to send typing event
  sendTypingEvent() {
    if (!this.sendTypingStartedEventTimer) {
      if (this._socketService.isSocketConnected && this.conversation.topicParticipant.role.toLowerCase() != "silent_monitor" && !this.isWhisperMode) {
        let message = this.getCimMessage();
        let selectedChannelSession = this.conversation.activeChannelSessions.find((item) => item.isChecked == true);
        if (selectedChannelSession) {
          // channel is web or whatsApp
          let sendingActiveChannelSession = JSON.parse(JSON.stringify(selectedChannelSession));

          delete sendingActiveChannelSession["webChannelData"];
          delete sendingActiveChannelSession["isChecked"];
          delete sendingActiveChannelSession["isDisabled"];

          message.header.sender = {
            id: this.conversation.topicParticipant.participant.keycloakUser.id,
            senderName: this.conversation.topicParticipant.participant.keycloakUser.username,
            type: "AGENT"
          };
          message.header.channelSession = sendingActiveChannelSession;
          message.header.channelData = sendingActiveChannelSession.channelData;
          message.body.type = "NOTIFICATION";
          message.body.notificationType = "TYPING_STARTED";

          let event: any = new CimEvent("TYPING_INDICATOR", "NOTIFICATION", this.conversation.conversationId, message, this.conversation.customer);

          this._socketService.emit("publishCimEvent", {
            cimEvent: event,
            agentId: this._cacheService.agent.id,
            conversationId: this.conversation.conversationId
          });
          this.sendTypingStartedEventTimer = setTimeout(() => {
            this.sendTypingStartedEventTimer = false;
          }, 3000);
        }
      }
    }
  }
  eventFromChild(data) {
    console.log("isbaropened " + data);
    console.log("ctiBarView " + this.ctiBarView);
    this.isBarOpened = data;
  }
  eventFromChildForUpdatedLabel(data) {
    this.labels = data;
  }

  onLeaveClick() {
    if (this._socketService.isVoiceChannelSessionExists(this.conversation.activeChannelSessions)) {
      this.closeConversationConfirmation();
    } else {
      this._socketService.topicUnsub(this.conversation);
    }
  }

  closeConversationConfirmation() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: "490px",
      panelClass: "confirm-dialog",
      data: {
        header: this._translateService.instant("snackbar.Close-Conversation"),
        message: this._translateService.instant("snackbar.Call-in-progress-sure-you-want-to-close-this-conversation")
      }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.event == "confirm") {
        this.endCallOnCTI();
      }
    });
  }

  endCallOnCTI() {
    let data;
    let voiceSession;
    for (let i = 0; i <= this.conversation.activeChannelSessions.length; i++) {
      if (
        this.conversation.activeChannelSessions[i] &&
        (this.conversation.activeChannelSessions[i].channel.channelType.name.toLowerCase() == "cisco_cc" ||
          this.conversation.activeChannelSessions[i].channel.channelType.name.toLowerCase() == "cx_voice")
      ) {
        let cacheId = `${this._cacheService.agent.id}:${this.conversation.activeChannelSessions[i].id}`;
        let cache = this._finesseService.getDialogFromCache(cacheId);
        if (cache) {
          voiceSession = this.conversation.activeChannelSessions[i];
        } else if (!cache && this._appConfigService.config.isCxVoiceEnabled) {
          voiceSession = voiceSession = this.conversation.activeChannelSessions[i];
        }
        if (!voiceSession && this._socketService.consultTask) {
          let consultCallDialog: any = localStorage.getItem("consultCallObject");
          if (typeof consultCallDialog == "string") consultCallDialog = JSON.parse(consultCallDialog);

          data = {
            action: "releaseCall",
            parameter: {
              dialogId: consultCallDialog ? consultCallDialog.id : null
            }
          };
        } else if (voiceSession) {
          data = {
            action: "releaseCall",
            parameter: {
              dialogId: voiceSession ? voiceSession.id : null
            }
          };
        }
      }
    }
    console.log("end call data==>", data);
    if (voiceSession || data.parameter.dialogId) {
      if (this._appConfigService.config.isCxVoiceEnabled) this._sipService.endCallOnSip();
      if (this._appConfigService.config.isCiscoEnabled) this._finesseService.endCallOnFinesse(data);
    } else {
      console.log("No active voice session or dialog id found ==>");
      this._snackbarService.open(this._translateService.instant("snackbar.Unable-To-End-Voice-Session"), "err");
      // this._snackbarService.open("Unable to end voice session", "err");
    }
  }

  downTheScrollAfterMilliSecs(milliseconds, behavior) {
    setTimeout(() => {
      try {
        document.getElementById("chat-area-end").scrollIntoView({ behavior: behavior, block: "nearest" });
      } catch (err) { }
    }, milliseconds);
  }

  upTheScrollAfterMilliSecs(milliseconds, behavior) {
    setTimeout(() => {
      try {
        document.getElementById("chat-area-start").scrollIntoView({ behavior: behavior, block: "nearest" });
      } catch (err) { }
    }, milliseconds);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.changeDetecter && changes.changeDetecter.currentValue && this.conversation.index == this._sharedService.matCurrentTabIndex) {
      if (changes.changeDetecter.currentValue.header.sender.id == this._cacheService.agent.id) {
        this.downTheScrollAfterMilliSecs(50, "smooth");
      } else {
        if (this.currentScrollPosition < 95) {
          this.showNewMessageNotif = true;
        } else {
          this.downTheScrollAfterMilliSecs(50, "smooth");
          if (
            changes.changeDetecter.currentValue.header.sender.type.toLowerCase() == "customer" ||
            changes.changeDetecter.currentValue.header.sender.type.toLowerCase() == "agent"
          ) {
            this.publishMessageSeenEvent(changes.changeDetecter.currentValue);
          }
        }
      }
    }
    if (changes.currentTabIndex) {
      this.downTheScrollAfterMilliSecs(500, "auto");
      //this.publishLatestMessageSeenEvent();
    }
  }

  ngOnDestroy() {
    this.scrollSubscriber.unsubscribe();
  }

  adjustHeightOnComposerResize() {
    if (this.currentScrollPosition > 95) {
      this.downTheScrollAfterMilliSecs(30, "smooth");
    }
  }

  goToLatestMessage() {
    this.downTheScrollAfterMilliSecs(0, "smooth");
    this.publishLatestMessageSeenEvent();
  }

  videoPIP(id) {
    try {
      const video: any = document.getElementById(id);
      video.requestPictureInPicture().then((pictureInPictureWindow) => {
        pictureInPictureWindow.addEventListener("resize", () => false);
      });
    } catch (err) {
      this._snackbarService.open(this._translateService.instant("snackbar.PIP-not-supported-in-this-browser"), "succ");
      console.error(err);
    }
  }

  fullLocation(lat, lng) {
    const locationUrl = `http://maps.google.com/maps?q=${lat}, ${lng}`;
    window.open(locationUrl, "_blank");
  }

  filePreviewOpener(url, fileName, type) {
    url = this._appConfigService.config.FILE_SERVER_URL + "/api/downloadFileStream" + new URL(url).search;

    const dialogRef = this.dialog.open(FilePreviewComponent, {
      maxHeight: "100vh",
      maxWidth: "100%",
      height: "auto",
      width: "auto",
      data: { fileName: fileName, url: url, type: type }
    });
    dialogRef.afterClosed().subscribe((result: any) => { });
  }
  externalfilePreviewOpener(url, fileName, type) {
    const dialogRef = this.dialog.open(FilePreviewComponent, {
      maxHeight: "100vh",
      maxWidth: "100%",
      height: "auto",
      width: "auto",
      data: { fileName: fileName, url: url, type: type }
    });
    dialogRef.afterClosed().subscribe((result: any) => { });
  }

  uploadFile(files) {
    let availableExtentions: any = ["txt", "png", "jpg", "jpeg", "pdf", "ppt", "xlsx", "xls", "doc", "docx", "rtf", "mp4", "mp3"];
    let ln = files.length;
    if (ln > 0) {
      for (var i = 0; i < ln; i++) {
        const fileSize = files[i].size;
        const fileMimeType = files[i].name.split(".").pop();

        if (fileSize <= 5000000) {
          if (availableExtentions.includes(fileMimeType.toLowerCase())) {
            let fd = new FormData();
            fd.append("file", files[i]);
            fd.append("conversationId", `${Math.floor(Math.random() * 90000) + 10000}`);
            this._httpService.uploadToFileEngine(fd).subscribe(
              (e) => {
                this.constructAndSendCimEvent(e.type.split("/")[0], e.type, e.name, e.size);
              },
              (error) => {
                this._snackbarService.open(error, "err");
              }
            );
          } else {
            this._snackbarService.open(files[i].name + this._translateService.instant("snackbar.unsupported-type"), "err");
          }
        } else {
          this._snackbarService.open(files[i].name + this._translateService.instant("snackbar.File-size-should-be-less-than-5MB"), "err");
        }
      }
    }
  }

  isInstagramChannel(channel) {
    if(this.replyToMessageId && this.privateMessageReply || this.replyToMessageId) {
      return channel.channelType.name === "INSTAGRAM";
    }
  }
  constructAndSendCimEvent(msgType, fileMimeType?, fileName?, fileSize?, text?, wrapups?, note?) {
    if (this._socketService.isSocketConnected) {
      let message = this.getCimMessage();

      if (msgType.toLowerCase() == "wrapup") {
        message = this.constructWrapUpEvent(message, wrapups, note, this.conversation.firstChannelSession);

        this.emitCimEvent(message, "AGENT_MESSAGE");
      } else {
        if (this.replyToMessageId ) {
          message.header.replyToMessageId = this.replyToMessageId;
          this.replyToMessageId = null;
        }
        let selectedChannelSession = this.conversation.activeChannelSessions.find((item) => item.isChecked == true);

        if (selectedChannelSession) {
          if (this.commentId && (selectedChannelSession.channel.channelType.name.toLowerCase() == "facebook" ||
            selectedChannelSession.channel.channelType.name.toLowerCase() == "instagram" ||
            selectedChannelSession.channel.channelType.name.toLowerCase() == "twitter")) {
            // If private reply icon is clicked then msgType would be private reply. 
            if(this.privateMessageReply) {
              msgType = this.privateMessageReply
              this.privateMessageReply = null
            }
            message = this.constructCommentEvent(message, msgType, selectedChannelSession, fileMimeType, fileName, fileSize, text);
            
            this.emitCimEvent(message, "AGENT_MESSAGE");
            this.commentId = null;
          } else {
            // channel is web or whatsApp

            let sendingActiveChannelSession = JSON.parse(JSON.stringify(selectedChannelSession));

            delete sendingActiveChannelSession["webChannelData"];
            delete sendingActiveChannelSession["isChecked"];
            delete sendingActiveChannelSession["isDisabled"];

            message.header.sender = {
              id: this.conversation.topicParticipant.participant.keycloakUser.id,
              senderName: this.conversation.topicParticipant.participant.keycloakUser.username,
              type: "AGENT"
            };
            message.header.channelSession = sendingActiveChannelSession;
            message.header.channelData = sendingActiveChannelSession.channelData;
            if (msgType.toLowerCase() == "plain") {
              message.body.type = "PLAIN";
              message.body.markdownText = text.trim();
            } else if (msgType.toLowerCase() == "application" || msgType.toLowerCase() == "text") {
              message.body.type = "FILE";
              message.body["caption"] = "";
              message.body["additionalDetails"] = { fileName: fileName };
              message.body["attachment"] = {
                mediaUrl: this._appConfigService.config.FILE_SERVER_URL + "/api/downloadFileStream?filename=" + fileName,
                mimeType: fileMimeType,
                size: fileSize
              };
            } else if (msgType.toLowerCase() == "image") {
              message.body.type = "IMAGE";
              message.body["caption"] = fileName;
              message.body["additionalDetails"] = {};
              message.body["attachment"] = {
                mediaUrl: this._appConfigService.config.FILE_SERVER_URL + "/api/downloadFileStream?filename=" + fileName,
                mimeType: fileMimeType,
                size: fileSize,
                thumbnail: ""
              };
            } else if (msgType.toLowerCase() == "video") {
              message.body.type = "VIDEO";
              message.body["caption"] = fileName;
              message.body["additionalDetails"] = {};
              message.body["attachment"] = {
                mediaUrl: this._appConfigService.config.FILE_SERVER_URL + "/api/downloadFileStream?filename=" + fileName,
                mimeType: fileMimeType,
                size: fileSize,
                thumbnail: ""
              };
            }

            this.emitCimEvent(message, this.conversation.agentParticipants.length > 0 && this.isWhisperMode ? "WHISPER_MESSAGE" : "AGENT_MESSAGE");
          }
        } else {
          this._snackbarService.open(this._translateService.instant("snackbar.No-channel-session-selected-at-the-moment"), "err");
        }
      }
    } else {
      this._snackbarService.open(this._translateService.instant("snackbar.Unable-to-send-the-message-at-the-moment"), "err");
    }
  }

  // to get past acitivities
  loadPastActivities(conversation) {
    try {
      this.pastActivitiesloadedOnce=true;
      this.loadingPastActivity = true;

      let limit = 25;

      this._httpService.getPastActivities(this.conversation.customer._id, limit, this.pastCimEventsOffsetLimit).subscribe(
        (res: any) => {
          ++this.pastCimEventsOffsetLimit;
          let docsLength: number = res ? res.docs.length : 0;
          let docs = res.docs;
          if (docsLength > 0) {
            this.filterAndMergePastActivities(docs);
          } else {
            if (conversation == "FAKE_CONVERSATION")
              this._snackbarService.open(this._translateService.instant("snackbar.No-Conversation-Found"), "succ");
            this.noMoreConversation = true;
          }
        },
        (error) => {
          this.loadingPastActivity = false;
          this._sharedService.Interceptor(error.error, "err");
        }
      );
    } catch (e) {
      console.error("[Load Past Activity] Error :", e);
    }
  }

  // to filter out activities and add in the conversation object, it expects a list
  filterAndMergePastActivities(cimEvents: Array<any>) {
    try {
      let msgs = [];
      cimEvents.forEach((event) => {
        if (event.channelSession) {
          if (event.data.header) {
            event.data.header.channelSession = event.channelSession;
          }
        }
        if (
          event.name.toLowerCase() == "agent_message" ||
          event.name.toLowerCase() == "bot_message" ||
          event.name.toLowerCase() == "customer_message"
        ) {
          if (event.name.toLowerCase() == "customer_message" && event.data.header.sender.type.toLowerCase() == "connector") {
            event.data.header.sender.senderName = event.data.header.customer.firstName + " " + event.data.header.customer.lastName;
            event.data.header.sender.id = event.data.header.customer._id;
            event.data.header.sender.type = "CUSTOMER";
          }
          event.data.header["status"] = "seen";
          msgs.push(event.data);
        } else if (
          [
            "task_enqueued",
            "no_agent_available",
            "channel_session_started",
            "channel_session_ended",
            "agent_subscribed",
            "agent_unsubscribed",
            "call_leg_ended",
            "task_state_changed",
            "participant_role_changed",
            "voice_activity"
          ].includes(event.name.toLowerCase())
        ) {
          let message = this._socketService.createSystemNotificationMessage(event);
          // console.log("test1==>", event.name);
          // if (event.name == "VOICE_ACTIVITY") console.log("past==>", message);
          if (message) {
            msgs.push(message);
          }
        } else if (event.name.toLowerCase() == "conversation_data_changed") {
          let message = this._socketService.createConversationDataMessage(event);
          msgs.push(message);
        } else if (event.name.toLowerCase() == "whisper_message") {
          event.data.header["status"] = "sent";
          event.data.body["isWhisper"] = true;
          msgs.push(event.data);
        }
        // else if(event.name.toLowerCase() == "call_leg_ended"){
        //   let message = this._socketService.createVoiceMessage(event);
        //   msgs.push(message);
        // }
      });

      // msgs.reverse();
      msgs.forEach((msg) => {
        if (
          msg.header.sender.type.toLowerCase() == "agent" &&
          msg.body.type.toLowerCase() == "comment" &&
          msg.body.itemType.toLowerCase() != "text" &&
          msg.body.itemType.toLowerCase() != "video" &&
          msg.body.itemType.toLowerCase() != "image"
        ) {
          this._socketService.processCommentActions(msgs, msg);
        } else {
          this.conversation.messages.unshift(msg);
        }
      });

      this.noMoreConversation = false;
      this.loadingPastActivity = false;
      this.upTheScrollAfterMilliSecs(0, "smooth");
    } catch (e) {
      console.error("[Load Past Activity] Filter Error :", e);
    }
  }

  //when enter key is pressed
  onEnterKey(event) {
    event.preventDefault();
    // clear the timer on enter key press so that we can send fresh typing started event
    //on next key press as receiving message on another end will stop its typing indication
    clearTimeout(this.sendTypingStartedEventTimer);
    this.sendTypingStartedEventTimer = null;
  }
  // loadBrowserLanguage() {
  //   let browserLang = navigator.language;
  //   console.log('Browser language is ' + browserLang);
  //   // this.selectedLanguage = browserLang;
  //   if (this.selectedLanguage == "ar") {
  //     this.isRTLView = true;
  //   }
  // }

  // to open dialog form
  openWrapUpDialog(e): void {
    const dialogRef = this.dialog.open(WrapUpFormComponent, {
      panelClass: "wrap-dialog",
      data: {
        header: this._translateService.instant("chat-features.interactions.wrapup"),
        conversation: this.conversation,
        RTLDirection: this.isRTLView
      }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res.event == "apply") {
        this.constructAndSendCimEvent("wrapup", "", "", "", "", res.data.wrapups, res.data.note);
      }
    });
  }

  switchChannelSession(channelSession, channelIndex) {
    try {
      console.log("channel session==>", channelSession);
      if (!channelSession.isDisabled) {
        if (!channelSession.isChecked) {
          this.conversation.activeChannelSessions.forEach((channelSession) => {
            channelSession.isChecked = false;
          });

          channelSession["isChecked"] = true;

          this.conversation.activeChannelSessions = this.conversation.activeChannelSessions.concat([]);
        }
      }
    } catch (e) {
      console.error("[Error in Channel Switching] :", e);
    }
  }

  // fbchannel session . 
  getChannelSession(message) {
    let channelType = message.header.channelSession.channel.channelType.name.toLowerCase()
    let channelSession = this.conversation.activeChannelSessions.find((channelSession) => {
      return channelSession.channel.channelType.name.toLowerCase() == channelType
    });

    return channelSession;
  }

  getCimMessage() {
    let message: any = {
      id: "",
      header: { timestamp: "", sender: {}, channelSession: {}, channelData: {} },
      body: { markdownText: "", type: "" }
    };

    message.id = uuidv4();
    message.header.timestamp = Date.now();
    message.header.sender = {
      id: this.conversation.topicParticipant.participant.keycloakUser.id,
      senderName: this.conversation.topicParticipant.participant.keycloakUser.username,
      type: "AGENT"
    };

    return message;
  }

  constructWrapUpEvent(message, wrapups, note, channelSession) {
    let sendingActiveChannelSession = JSON.parse(JSON.stringify(channelSession));
    delete sendingActiveChannelSession["webChannelData"];
    delete sendingActiveChannelSession["isChecked"];
    delete sendingActiveChannelSession["isDisabled"];

    message.body.type = "WRAPUP";
    message.body.markdownText = "";
    message.body["wrapups"] = wrapups;
    message.body["note"] = note;
    message.header.channelSession = sendingActiveChannelSession;
    message.header.channelData = sendingActiveChannelSession.channelData;

    return message;
  }

  // Fb comment event.
  constructCommentEvent(message, msgType, channelSession, fileMimeType?, fileName?, fileSize?, text?) {
    let sendingActiveChannelSession = JSON.parse(JSON.stringify(channelSession));
    delete sendingActiveChannelSession["webChannelData"];
    delete sendingActiveChannelSession["isChecked"];
    delete sendingActiveChannelSession["isDisabled"];

    message.header.providerMessageId = this.commentId;
    message.body.type = "COMMENT";
    message.body.postId = this.commentPostId;
    message.header.channelSession = sendingActiveChannelSession;
    message.header.channelData = sendingActiveChannelSession.channelData;

    if (msgType.toLowerCase() == "plain") {
      message.body.itemType = "TEXT";
      message.body.markdownText = text.trim();
    } else if (msgType.toLowerCase() == "image") {
      message.body.itemType = "IMAGE";
      // message.body["caption"] = fileName;
      // message.body["additionalDetails"] = {};
      message.body["attachment"] = {
        mediaUrl: this._appConfigService.config.FILE_SERVER_URL + "/api/downloadFileStream?filename=" + fileName,
        mimeType: fileMimeType,
        size: fileSize,
        thumbnail: ""
      };
    } else if (msgType.toLowerCase() == "video") {
      message.body.itemType = "VIDEO";
      // message.body["caption"] = fileName;
      // message.body["additionalDetails"] = {};
      message.body["attachment"] = {
        mediaUrl: this._appConfigService.config.FILE_SERVER_URL + "/api/downloadFileStream?filename=" + fileName,
        mimeType: fileMimeType,
        size: fileSize,
        thumbnail: ""
      };
    }
    else if (msgType.toLowerCase() == "private_reply") {
      message.body.itemType = "PRIVATE_REPLY"
      message.body.markdownText = text.trim()
    }
    return message;
  }

  emitCimEvent(message, eventName) {
    // let dummyMessage=JSON.parse(JSON.stringify(message))

    let event: any = new CimEvent(eventName, "MESSAGE", this.conversation.conversationId, message, this.conversation.customer);
    // console.log("event created",event)

    this._socketService.emit("publishCimEvent", {
      cimEvent: event,
      agentId: this._cacheService.agent.id,
      conversationId: this.conversation.conversationId
    });

    message.header["status"] = "sending";
    message.body["isWhisper"] = eventName == "WHISPER_MESSAGE" ? true : false;

    message["header"]["channelSession"] = event.channelSession;
    // console.log("message niw",message)
    this.conversation.messages.push(message);

    // console.log("all messages",this.conversation.messages)
    setTimeout(() => {
      this.message = "";

      this.quotedMessage = null;
    }, 40);
  }

  emitFBActionEvent(message) {
    let event: any = new CimEvent("AGENT_MESSAGE", "MESSAGE", this.conversation.conversationId, message, this.conversation.customer);
    this._socketService.emit("publishCimEvent", {
      cimEvent: event,
      agentId: this._cacheService.agent.id,
      conversationId: this.conversation.conversationId
    });

    // console.log("event data==>", event.data);
    setTimeout(() => {
      this.message = "";

      this.quotedMessage = null;
    }, 40);
  }

  queueList: any = [];

  queueSearch = "";
  requestedQueue: any;
  requestTitle: string;
  requestType: string;
  noteDialogBtnText: string;

  agentAssistanceRequest(templateRef, data, action, requestType): void {
    try {
      this.requestType = requestType;
      this.requestAction = action;

      if (requestType == "queue") {
        this.requestedQueue = data;
        if (action == "transfer") {
          this.requestTitle = this._translateService.instant("chat-features.interactions.Transfer-To-Queue");
          this.noteDialogBtnText = this._translateService.instant("chat-features.interactions.Transfer");
        } else if (action == "conference") {
          this.requestTitle = this._translateService.instant("chat-features.interactions.Conference-Request");
          this.noteDialogBtnText = this._translateService.instant("chat-features.interactions.Add-To-Conference");
        }
      }

      // this.requestAction = action;

      const dialogRef = this.dialog.open(templateRef, {
        panelClass: "consult-dialog"
      });

      dialogRef.afterClosed().subscribe((result) => {
        // console.log("The dialog was closed==>", result);
      });

      this.consultTransferTrigger.closeMenu();
    } catch (e) {
      console.error("[Error] on Agent Assitance", e);
    }
  }

  assistanceRequestNote: string;
  requestedAgentForAssistance;
  requestAction: string;

  sendAssistanceRequest() {
    if (this.requestType == "queue") {
      this.sendQueueRequest();
    }
    this.assistanceRequestNote = "";
  }

  sendQueueRequest() {
    let data = {
      channelSession: this.conversation.firstChannelSession,
      agentParticipant: this.conversation.topicParticipant,
      mode: "queue",
      queueName: this.requestedQueue.queueName,
      note: this.assistanceRequestNote
    };
    if (this.requestAction == "transfer") this._socketService.emit("directTransferRequest", data);
    else if (this.requestAction == "conference") this._socketService.emit("directConferenceRequest", data);

    this.showRequestNotification();
  }

  getAgentsInQueue() {
    try {
      this._httpService.getAgentsInQueue(this.conversation.conversationId).subscribe(
        (res: any) => {
          this.queueList = res;
        },
        (error) => {
          this._sharedService.Interceptor(error.error, "err");
        }
      );
    } catch (e) {
      console.error("[getAgentsInQueue] Error :", e);
    }
  }

  showRequestNotification() {
    let msg: string;
    if (this.requestAction == "transfer") msg = this._translateService.instant("snackbar.Transfer-request-placed-successfully");
    else if (this.requestAction == "conference") msg = this._translateService.instant("snackbar.Conference-request-placed-successfully");

    setTimeout(() => {
      this.snackBar.open(msg, "", {
        duration: 4000,
        panelClass: "chat-success-snackbar",
        horizontalPosition: "right",
        verticalPosition: "bottom"
      });
    }, 1000);
  }

  // getFBPost 
  getPost(postId, selectedCommentId, accessToken, FBHOSTAPI) {
    this._httpService.getFBPostData(postId, accessToken, FBHOSTAPI).subscribe(
      (res: any) => {
        this.postData = res;
        this.fullPostView = true;
        this.selectedCommentId = selectedCommentId;
      },
      (error) => {
        this._sharedService.Interceptor(error.error, "err");
        console.error("err [getPost]", error.error);
      }
    );
  }

  // getFBComments
  getComments(postId, selectedCommentId, accessToken, FBHOSTAPI) {
    this._httpService.getFBPostComments(postId, accessToken, FBHOSTAPI).subscribe(
      (res: any) => {
        this.postComments = res;
        this.fullPostView = true;
        this.selectedCommentId = selectedCommentId;
      },
      (error) => {
        this._sharedService.Interceptor(error.error, "err");
        console.error("err [getComments]", error.error);
      }
    );
  }

  //the function will fetch fb post and comments API parallel
  getPostAndComments(postId, selectedCommentId, accessToken, FBHOSTAPI) {
    try {
      this.getPost(postId, selectedCommentId, accessToken, FBHOSTAPI);
      this.getComments(postId, selectedCommentId, accessToken, FBHOSTAPI);
    } catch (err) {
      console.error("err [ getPostAndComments ] error while fetching post and comments", err);
    }
  }

  // getInstaPostAndComments(postId, selectedCommentId, accessToken, INSTHOSTAPI) {
  //   this._httpService.getInstaPostData(postId, accessToken, INSTHOSTAPI).subscribe(
  //     (res: any) => {
  //       this.postData = res;
  //       this.postComments = res;
  //       this.fullPostView = true;
  //       this.selectedCommentId = selectedCommentId;
  //     },
  //     (error) => {
  //       this._sharedService.Interceptor(error.error, "err");
  //       console.error("err [getPost]", error.error);
  //     }
  //   );
  // }

  //the below function will check for some keys and call another function which will fetch post data with comments
  getFullViewPostData(channelSession, postId, selectedCommentId) {
    let accessToken = null;
    let instaAccessToken = null
    let FBHOSTAPI = null;
    let INSTHOSTAPI = null
    this.postComments = null;
    this.postData = null;
    this.fullPostView = false;
    this.selectedCommentId = null;
    if (channelSession) {
      channelSession.channel.channelConnector.channelProviderConfigs.forEach((item) => {
        if (item.key == "FACEBOOK-API-KEY") {
          accessToken = item.value;
        }
        if (item.key == "FACEBOOK-HOST-URL") {
          FBHOSTAPI = item.value;
        }
        // if (item.key == "INSTAGRAM-API-KEY") {
        //   instaAccessToken = item.value;
        // }
        // if (item.key == "INSTAGRAM-HOST-URL") {
        //   INSTHOSTAPI = item.value;
        // }
      });
      if (accessToken && FBHOSTAPI) {

        this.getPostAndComments(postId, selectedCommentId, accessToken, FBHOSTAPI);

      }
      // else if (instaAccessToken && INSTHOSTAPI) {

      //   this.getInstaPostAndComments(postId, selectedCommentId, instaAccessToken, INSTHOSTAPI);
      // }

      else {
        this._snackbarService.open(this._translateService.instant("snackbar.Access-Token-or-FB-Host-API-for-FB-is-missing"), "err");
        console.error("err [getFullViewPostData] accessToken or FB Host API for FB is missing");
      }
    } else {
      this._snackbarService.open(this._translateService.instant("snackbar.Channel-session-not-found"), "err");
      console.error("err [getFullViewPostData] Channel session not found");
    }
  }

  // getCustomerAni(callLegs:Array<any>){
  //   console.log("data-->",callLegs)

  // }

  ctiControlBar() {
    this.ctiBoxView = true;
    this.ctiBarView = false;
    const dialogRef = this.dialog.open(CallControlsComponent, {
      panelClass: "call-controls-dialog",
      hasBackdrop: false,
      position: {
        top: '8%',
        right: '8%'
      },
      data: { conversation: this.conversation }
    });
    dialogRef.afterClosed().subscribe((result) => {
      this.ctiBoxView = false;
      this.ctiBarView = true;
      if (this._sipService.timeoutId) clearInterval(this._sipService.timeoutId);
    });
  }

  endCallOnSip() {
    console.log("on End Call Request==>");
    this._sipService.endCallOnSip();
  }

  getVoiceChannelSession() {
    try {
      this.cxVoiceSession = this.conversation.activeChannelSessions.find((channelSession) => {
        return channelSession.channel.channelType.name.toLowerCase() === "cx_voice";
      });
      if (this.cxVoiceSession) {
        const cacheId = `${this._cacheService.agent.id}:${this.cxVoiceSession.id}`;
        const cacheDialog: any = this._sipService.getDialogFromCache(cacheId);
        if (cacheDialog) {
          const currentParticipant = this._sipService.getCurrentParticipantFromDialog(cacheDialog.dialog);
          const startTime = new Date(currentParticipant.startTime);
          this._sipService.timeoutId = setInterval(() => {
            const currentTime = new Date();
            const timedurationinMS = currentTime.getTime() - startTime.getTime();
            this.msToHMS(timedurationinMS);
          }, 1000);
        } else {
          console.log("No Dialog Found==>");
        }
      } else {
        clearInterval(this._sipService.timeoutId);
      }
    } catch (e) {
      console.error("[getVoiceChannelSession] Error:", e);
    }
  }

  msToHMS(ms) {
    try {
      // Convert to seconds:
      let sec = Math.floor(ms / 1000);
      // Extract hours:
      const hours = Math.floor(sec / 3600); // 3,600 seconds in 1 hour
      sec %= 3600; // seconds remaining after extracting hours
      // Extract minutes:
      const min = Math.floor(sec / 60); // 60 seconds in 1 minute
      // Keep only seconds not extracted to minutes:
      sec %= 60;
      if (hours > 0) {
        this.timer = `${this.formatNumber(hours)}:${this.formatNumber(min)}:${this.formatNumber(sec)}`;
      } else {
        this.timer = `${this.formatNumber(min)}:${this.formatNumber(sec)}`;
      }
    } catch (e) {
      console.error("[msToHMS] Error:", e);
    }
  }

  formatNumber(num) {
    return num.toString().padStart(2, "0");
  }

}
