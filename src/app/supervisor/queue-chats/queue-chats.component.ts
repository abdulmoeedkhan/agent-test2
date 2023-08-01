import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog } from "@angular/material";
// import { ConfirmationDialogComponent } from "../../new-components/confirmation-dialog/confirmation-dialog.component";
import { httpService } from "../../services/http.service";
import { cacheService } from "../../services/cache.service";
import { ActivatedRoute } from "@angular/router";
import { Subscription, timer } from "rxjs";
import { map, retry } from "rxjs/operators";
import { snackbarService } from "src/app/services/snackbar.service";
import { TranslateService } from "@ngx-translate/core";
import { CustomerLabels } from "src/app/models/labels/labels";

@Component({
  selector: "app-queue-chats",
  templateUrl: "./queue-chats.component.html",
  styleUrls: ["./queue-chats.component.scss"]
})
export class QueueChatsComponent implements OnInit {
  queuedChatList = [];
  timerSubscription: Subscription;
  queueId: string;
  filteredData = [];
  supervisedTeams: any = [];
  selectedTeam: any = "";
  settings: any = {};
  labels:CustomerLabels[]
  selectedQueues: any = [];
  sortOrder: "asc" | "desc" = "asc";

  constructor(
    // private dialog: MatDialog,
    private _translateService: TranslateService,
    private _httpService: httpService,
    private route: ActivatedRoute,
    private _snackBarService: snackbarService,
    private _cacheService: cacheService
  ) {}

  ngOnInit(): void {
    this.loadLabels()
    this.settings = {
      text: "All Queues",
      selectAllText: "Select All",
      unSelectAllText: "UnSelect All",
      classes: "queue-list-dropdown",
      enableSearchFilter: false,
      badgeShowLimit: 1,
      primaryKey: "queueId"
    };

    this.queueId = this.route.snapshot.queryParamMap.get("queueId");
    this.supervisedTeams = this._cacheService.agent.supervisedTeams;
    if (this.supervisedTeams && this.supervisedTeams.length > 0) {
      this.selectedTeam = this.supervisedTeams[0].teamId;
      this.getAllQueuedChats(this.selectedTeam);
      this.startRefreshTimer();
    }
  }
  loadLabels():void {
    this._httpService.getLabels().subscribe((e) => {
      this.labels = e;
      console.log("labels",this.labels)

    });
  }
  // to start timer using rxjs `timer`
  startRefreshTimer() {
    try {
      this.timerSubscription = timer(0, 10000)
        .pipe(
          map(() => {
            this.getAllQueuedChats(this.selectedTeam);
          }, retry())
        )
        .subscribe();
    } catch (err) {
      console.error("[startRefeshTimer] Error :", err);
    }
  }

  // to get all queued chat detail from reporting connector
  getAllQueuedChats(selectedTeamId) {
    this._httpService.getAllQueuedChats(selectedTeamId, []).subscribe(
      (res) => {
        this.queuedChatList = res;
        this.filterData();
      },
      (err) => {
        this._snackBarService.open(this._translateService.instant("snackbar.Error-Getting-Active-Chats-with-Agents"), "err");
        console.error("[getAllQueuedChats] Error :", err);
      }
    );
  }

  // on team selection change event callback
  onTeamChange() {
    this.selectedQueues = [];
    this.getAllQueuedChats(this.selectedTeam);
  }

  toggleSorting() {
    // Toggle the sorting order
    this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
  }
  // filter data for all queues and if multiple are selected
  filterData() {
    try {
      this.filteredData = [];
      if (this.selectedQueues.length == 0) {
        this.filteredData = this.queuedChatList;
      } else {
        this.selectedQueues.forEach((data) => {
          this.queuedChatList.forEach((chat) => {
            if (data.queueId == chat.queueId) this.filteredData.push(chat);
          });
        });
      }

      // Sort the filteredData array in descending order by waitingSince property
      for (let data of this.filteredData) {
        data.chats.sort((a, b) => {
          if (this.sortOrder === "asc") {
            return a.waitingSince - b.waitingSince;
          } else {
            return b.waitingSince - a.waitingSince;
          }
        });
      }
    } catch (err) {
      console.error("[filterData] Error :", err);
    }
  }

  onItemSelect(item: any) {
    // this.getAllQueuedChats(this.selectedTeam);
  }
  OnItemDeSelect(item: any) {
    // this.getAllQueuedChats(this.selectedTeam);
  }
  onSelectAll(items: any) {
    // this.getAllQueuedChats(this.selectedTeam);
  }
  onDeSelectAll(items: any) {
    // this.getAllQueuedChats(this.selectedTeam);
  }
  ngOnDestroy(): void {
    if (this.timerSubscription) this.timerSubscription.unsubscribe();
  }

  // reQueue(templateRef): void {
  //   const dialogRef = this.dialog.open(templateRef, {
  //     width: "480px"
  //   });
  //   dialogRef.afterClosed().subscribe((result) => {
  //   });
  // }

  // closeChat() {
  //   const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
  //     width: "490px",
  //     panelClass: "confirm-dialog",
  //     data: {
  //       header: this._translateService.instant("snackbar.Close-Topic"),
  //       message: this._translateService.instant("snackbar.sure-to-close-this-topic")
  //     }
  //   });
  //   dialogRef.afterClosed().subscribe((result) => {});
  // }
}
