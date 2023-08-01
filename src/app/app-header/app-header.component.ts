import { AfterViewInit, Component, EventEmitter, OnInit, Output, ViewChild } from "@angular/core";
import { cacheService } from "../services/cache.service";
import { sharedService } from "../services/shared.service";
import { socketService } from "../services/socket.service";
import { CountupTimerService, countUpTimerConfigModel, timerTexts } from "ngx-timer";
import { Router } from "@angular/router";
import { finesseService } from "../services/finesse.service";
import { fcmService } from "../services/fcm.service";
import { httpService } from "../services/http.service";
import { TranslateService } from "@ngx-translate/core";
import { SipService } from "../services/sip.service";
import { appConfigService } from "../services/appConfig.service";
import { snackbarService } from "../services/snackbar.service";
import { announcementService } from "../services/announcement.service";
import { getMatIconFailedToSanitizeLiteralError } from "@angular/material";

@Component({
  selector: "app-header",
  templateUrl: "./app-header.component.html",
  styleUrls: ["./app-header.component.scss"]
})
export class AppHeaderComponent implements OnInit, AfterViewInit {
  @ViewChild("stateTrigger", { static: false }) stateTrigger: any;
  @Output() themeSwitcher = new EventEmitter<any>();
  @Output() languageSwitcher = new EventEmitter<any>();

  isdarkMode = false;
  checkRoles:any=[];
  setAgent=true;
  unreadAnnouncements = 0;
  agent = {
    state: "ready",
    name: "Bryan Miller",
    extension: 1126
  };
  selectedReasonCode;
  stateChangedSubscription;
  isConnected = true;
  changeLanguageCode = "en";
  languageFlag =
    "data:image/png;base64,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";
  languageName = "English";
  languages: { _id: string; code: string; name: string; flag: string }[];
  reasonCodes = [];
  changeLanguage = false;
  logoutReasonList = false;
  stateView = true;
  // startTime: Date;
  // stopTime: Date;
  // active: boolean = false;
  timerConfigs;
  disableMrdActions : boolean = false;
  // get display() {
  //   return this.startTime && this.stopTime ? +this.stopTime - +this.startTime : 0;
  // }

  // timer() {
  //   if (this.active) {
  //     this.stopTime = new Date();
  //     setTimeout(() => {
  //       this.timer();
  //     }, 1000);
  //   }
  // }

  constructor(
    private countupTimerService: CountupTimerService,
    private _router: Router,
    public _cacheService: cacheService,
    private _socketService: socketService,
    private _sharedService: sharedService,
    public _finesseService: finesseService,
    public _sipService: SipService,
    public _appConfigService:appConfigService,
    private _fcmService: fcmService,
    private _httpService: httpService,
    private _snackBarService: snackbarService,
    private _translateService: TranslateService,
    private _announcementService: announcementService,
  ) { }

  ngOnInit() {
    this.timerConfigs = new countUpTimerConfigModel();
    this.timerConfigs.timerTexts = new timerTexts();
    this.timerConfigs.timerTexts.hourText = ":"; //default - hh
    this.timerConfigs.timerTexts.minuteText = ":"; //default - mm
    this.timerConfigs.timerTexts.secondsText = " "; //default - ss
    this.timerConfigs.timerClass = "state-timer";
    this.checkRoles=this._cacheService.agent.roles.filter(value => {value == "agent"
     this.setAgent=true;
  }
    )
    //   e=>{
    //   console.log("arry val",e);
    //   if(e == "agent")
    //   {this.checkRoles= e}

    // }


    // }

    

    this.stateChangedSubscription = this._sharedService.serviceCurrentMessage.subscribe((e: any) => {
      if (e.msg == "stateChanged") {
        this.disableMrdActions = false;
        if (e.data.state.name.toLowerCase() == "logout") {
          this.moveToLogin();
        } else if (this._cacheService.agentPresence.state.name == null) {
          this.reStartTimer();
        } else if (this._cacheService.agentPresence.stateChangeTime != e.data.stateChangeTime) {
          this.reStartTimer();
        }
        this._cacheService.agentPresence = e.data;
      }
    });
    this._announcementService.countUnreadAnnouncementSubject.subscribe((e: any) => {
      if (e) {
        this.countUnreadAnnouncements()
      }
    })
  }

  ngAfterViewInit() {
    this.getSupportedLanguages();
    this.getReasonCodes();
  }
  countUnreadAnnouncements() {
    this.unreadAnnouncements = 0;
    let agentId = this._cacheService.agent.id;
    let announcementList = this._announcementService.announcementList;
    if (agentId && announcementList) {
      announcementList.forEach(element => {
        if (element.seenBy.includes(agentId)) {
          // seenByCount = seenByCount;
        } else {
          this.unreadAnnouncements = this.unreadAnnouncements + 1;
        }

      });

    }

  }
  getReasonCodes() {
    this._httpService.getReasonCodes().subscribe(
      (e) => {
        this.reasonCodes = e;
      },
      (error) => {
        this._sharedService.Interceptor(error.error, "err");
        console.error("error getting reason codes", error);
      }
    );
  }
  getSupportedLanguages() {
    this._httpService.getSupportedLanguages().subscribe(
      (e) => {
        this.languages = e[0].supportedLanguages;
        this.getAgentSettings();
      },
      (error) => {
        this._sharedService.Interceptor(error.error, "err");
        console.error("error getting supported languages", error);
      }
    );
  }
  getAgentSettings() {
    if (this._cacheService.agent.id) {
      this._httpService.getAgentSettings(this._cacheService.agent.id).subscribe(
        (e) => {
          if (e.theme == "dark") {
            this.themeSwitch(true);
          }
          this.setAgentPreferedlanguage(e.language);
        },
        (error) => {
          this._sharedService.Interceptor(error.error, "err");
          console.error("error getting agent settings", error);
        }
      );
    }
  }

  reStartTimer() {
    // this.startTime = new Date();
    // this.stopTime = this.stopTime;
    // this.active = true;
    // this.timer();
    this.countupTimerService.stopTimer();
    this.countupTimerService.startTimer();
  }

  changeState(state) {
    console.log("current state", state);

    if (state == 0) {
      this._socketService.emit("changeAgentState", {
        agentId: this._cacheService.agent.id,
        action: "agentState",
        state: { name: "NOT_READY", reasonCode: null }
      });
    } else if (state == 1) {
      this._socketService.emit("changeAgentState", {
        agentId: this._cacheService.agent.id,
        action: "agentState",
        state: { name: "READY", reasonCode: null }
      });
    } else {
      this._socketService.emit("changeAgentState", {
        agentId: this._cacheService.agent.id,
        action: "agentState",
        state: { name: "NOT_READY", reasonCode: state }
      });
    }
    this.disableMrdActions = true;
  }
  setAgentPreferedlanguage(languageCode) {
    let selectedLanguage = this.languages.find((r) => r.code == languageCode);
    if (selectedLanguage !== undefined) {
      this.languageName = selectedLanguage.name;
      this.languageFlag = selectedLanguage.flag;
      this.changeLanguageCode = languageCode;
      this.changeAgentDeskLanguage(languageCode);
    } else {
      selectedLanguage = this.languages.find((r) => r.code == "en");
      this.languageName = selectedLanguage.name;
      this.languageFlag = selectedLanguage.flag;
      this.changeLanguageCode = languageCode;
      try {
        this._httpService.updateAgentSettings({ language: "en" }, this._cacheService.agent.id).subscribe((e) => { });
      } catch (error) {
        this._sharedService.Interceptor(error.error, "err");
        console.error(`error updating language`, error);
      }
    }
  }

  lang(languageCode) {
    let selectedLanguage = this.languages.find((r) => r.code == languageCode);
    if (selectedLanguage !== undefined) {
      this.languageName = selectedLanguage.name;
      this.languageFlag = selectedLanguage.flag;
      this.changeLanguageCode = languageCode;
      this.changeAgentDeskLanguage(languageCode);
      try {
        this._httpService.updateAgentSettings({ language: languageCode }, this._cacheService.agent.id).subscribe((e) => { });
      } catch (error) {
        this._sharedService.Interceptor(error.error, "err");
        console.error(`error updating theme`, error);
      }
    }
  }

  updateLanguage() {
    this.changeLanguage = true;
    this.stateView = false;
  }
  async logout() {
    await this._fcmService.deleteFcmToken();
    try {
      window["dataLayer"].push({
        event: "logout",
        data: {
          message: this._translateService.instant("snackbar.Agent-Logged-Out-Successfully")
        }
      });
      sessionStorage.clear();
      localStorage.removeItem("ccUser");
    } catch (e) {
      window["dataLayer"].push({
        event: "error",
        data: {
          message: this._translateService.instant("snackbar.error-on-logout-request"),
          error: e.error
        }
      });
    }

    this._socketService.emit("changeAgentState", {
      agentId: this._cacheService.agent.id,
      action: "agentState",
      state: { name: "LOGOUT", reasonCode: this.selectedReasonCode }
    });

    if(this._appConfigService.config.isCxVoiceEnabled) this._sipService.logout();
  }

  changeMRD(event, agentMrdState) {
    console.log("current state ", agentMrdState);

    this._socketService.emit("changeAgentState", {
      agentId: this._cacheService.agent.id,
      action: "agentMRDState",
      state: event.checked == true ? "READY" : "NOT_READY",
      mrdId: agentMrdState.mrd.id
    });
    this.disableMrdActions = true;
  }

  close() { }

  onChange(reason) {
    this.selectedReasonCode = reason;
  }

  moveToLogin() {
    try {
      sessionStorage.clear();
      localStorage.removeItem("ccUser");
    } catch (e) { }

    this._cacheService.resetCache();
    this._socketService.socket.disconnect();
    this._router.navigate(["login"]).then(() => {
      window.location.reload();
    });
  }

  ngOnDestroy() {
    this.stateChangedSubscription.unsubscribe();
  }
  closeStateMenu(e) {
    setTimeout(() => {
      this.stateTrigger.closeMenu();
    }, 200);
  }
  //if onlySwitch flag true it will only switch the theme otherwise it will switch and also and update the theme in agentSettings
  themeSwitch(onlySwitch) {
    this.isdarkMode = !this.isdarkMode;
    this.themeSwitcher.emit({ isdarkMode: this.isdarkMode, onlySwitch: onlySwitch });
  }
  changeAgentDeskLanguage(languageCode) {
    //subject change languae emit to be listen by subscribers
    this._sharedService.changelanguage(languageCode);

    //save the preffered language code in shared service
    this._sharedService.prefferedLanguageCode = languageCode;
    this.languageSwitcher.emit({ language: languageCode });
  }
}
