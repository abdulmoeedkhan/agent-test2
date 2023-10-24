import { EventEmitter, Injectable, Output } from "@angular/core";
import { MatDialog } from "@angular/material";
import { TranslateService } from "@ngx-translate/core";
import { Subject } from "rxjs";
import { LinkConversationDialogComponent } from "../dialogs/link-conversation-dialog/link-conversation-dialog.component";
import { ConfirmationDialogComponent } from "../new-components/confirmation-dialog/confirmation-dialog.component";
import { httpService } from "./http.service";
import { snackbarService } from "./snackbar.service";

@Injectable({
  providedIn: "root"
})
export class sharedService {
  constructor(
    private dialog: MatDialog,
    private _translateService: TranslateService,
    private _snackbarService: snackbarService,
    private _httpService: httpService
  ) {
    this._translateService.stream("snackbar.FETCHING-CHATS").subscribe((data: string) => {
      this.mainPagetile = data;
    });
  }
  @Output() isCompactView = new EventEmitter<string>();

  schema;
  mainPagetile: any;
  matCurrentTabIndex = 0;
  channelLogoMapper = new Map();
  serviceCurrentMessage = new Subject();
  selectedlangugae = new Subject();
  channelTypeList;
  conversationSettings = {
    isFileSharingEnabled: false,
    isEmojisEnabled: false,
    isConversationParticipantsEnabled: false,
    isWrapUpEnabled: false,
    wrapUpTime: 15,
    isMessageFormattingEnabled: false,
    isOutboundSmsSendandClose: false,
    isOutboundSmsEnabled: false,
    prefixCode: ''
  };

  //preffered language code of agent
  //default is en/english
  prefferedLanguageCode = "en";

  //emit the change of the language preference by agent
  //code has the language code e.g: en/ar/fr
  changelanguage(code: string) {
    this.selectedlangugae.next(code);
  }

  serviceChangeMessage(data: any) {
    this.serviceCurrentMessage.next(data);
  }
  setConversationSettings(setting) {
    this.conversationSettings.isConversationParticipantsEnabled = setting.isConversationParticipantsEnabled;
    this.conversationSettings.isFileSharingEnabled = setting.isFileSharingEnabled;
    this.conversationSettings.isEmojisEnabled = setting.isEmojisEnabled;
    this.conversationSettings.isMessageFormattingEnabled = setting.isMessageFormattingEnabled;
    this.conversationSettings.isOutboundSmsSendandClose = setting.isOutboundSmsSendandClose;
    this.conversationSettings.isOutboundSmsEnabled = setting.isOutboundSmsEnabled;
    this.conversationSettings.prefixCode = setting.prefixCode ? setting.prefixCode : ''
  }
  getIndexFromConversationId(conversationId, array) {
    let index = array.findIndex((e) => {
      return e.conversationId == conversationId;
    });
    return index;
  }

  spliceArray(index, array) {
    array.splice(index, 1);
  }


  setChannelIcons(channelTypes) {
    this.channelTypeList = channelTypes;
    try {
      localStorage.setItem("channelTypes", JSON.stringify(channelTypes));
    } catch (e) { }
    channelTypes.forEach((channelType) => {
      this._httpService.getChannelLogo(channelType.channelLogo).subscribe((file) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          // caching the channel logos
          this.channelLogoMapper.set(channelType.channelLogo, reader.result);
        };
      });
    });
  }

  getConfirmation(header, msg) {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        width: "490px",
        panelClass: "confirm-dialog",
        data: { header: header, message: msg }
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result && result.event == "confirm") {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  getProfileLinkingConfirmation(channelIdentifier, customerName, attr, isMergeAble) {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(LinkConversationDialogComponent, {
        width: "490px",
        panelClass: "confirm-dialog",
        data: { channelIdentifier: channelIdentifier, customerName: customerName, attr: attr, isMergeAble: isMergeAble }
      });
      dialogRef.afterClosed().subscribe((decision) => {
        if (decision) {
          console.log("this is decision ", decision);
          resolve(decision);
        }
      });
    });
  }

  Interceptor(e, res) {

    if (res == "err" && e && e.error.error_detail && e.error.error_detail.reason && e.error.error_message) {
      let statusCode: number = e.statusCode || 500;
      let msg: string = e.error.error_message || "Unknown Error without specific Details";
      let reason: string | undefined = e.error.error_detail.reason.error_description || e.error.error_detail.reason.error || e.error.error_detail.reason;

      // Construct the error message dynamically based on the available information
      let errorMessage = `${statusCode}: ${msg}`;
      if (reason === undefined) {
        reason = "No specific reason is provided";
      }
      errorMessage += `. Reason: ${reason}`;
      this._snackbarService.open(errorMessage, "err");
    }

    else if (res == "err") {
      if (e.statusCode == 401) {
        this._snackbarService.open(this._translateService.instant("snackbar.UNAUTHORIZED-USER"), "err");
      } else if (e.statusCode == 400) {
        this._snackbarService.open(
          e.msg.error.attribute
            ? e.msg.error.attribute + this._translateService.instant("snackbar.is") + e.msg.error.validation
            : this._translateService.instant("snackbar.Bad-Request"),
          "err"
        );
      } else if (e.statusCode == 412) {
        this._snackbarService.open(this._translateService.instant("snackbar.unable-to-fetch-license-status"), "err");
      } else if (e.statusCode == 500) {
        this._snackbarService.open(this._translateService.instant("snackbar.Internal-Server-Error"), "err");
      } else if (e.statusCode == 408) {
        this._snackbarService.open(e.msg, "err");
      } else if (e.error) {
        this._snackbarService.open(e.error.msg, "err");
      } else {
        this._snackbarService.open(this._translateService.instant("snackbar.Something-went-wrong"), "err");
      }
    }
    if (res == "succ") {
      this._snackbarService.open(e, "succ");
    }
  }

  snackErrorMessage(msg) {
    this._snackbarService.open(msg, "err");
  }


  checkCompactView(e) {
    this.isCompactView.emit(e);
  }
}
