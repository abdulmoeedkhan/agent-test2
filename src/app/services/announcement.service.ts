import { Injectable } from "@angular/core";
import { httpService } from "./http.service";
import { sharedService } from "./shared.service";
import { cacheService } from "./cache.service";
@Injectable({
    providedIn: "root"
})
export class announcementService {
    announcementList: any = []; // contains the list which are subscribed by the agent


    constructor(private _sharedService: sharedService, private _httpService: httpService, private _cacheService: cacheService,) {
        
    }

    getAnnouncementList() {
        // const arr1 = [1, 2, 3, 4];
        //  const queryParams = `?teamIds=${arr1.join(',')}`;
        const teamIds = this._cacheService.agent.supervisedTeams.concat(this._cacheService.agent.userTeam);
        this._httpService.getAnnouncementsByTeamIds(teamIds).subscribe((data) => {
            console.log("data", data)
            this.announcementList = data.filter((item) => item.superviserId !== this._cacheService.agent.id);
            console.log(" this.announcementList====>>>",  this.announcementList)

        });
    }


    addCreatedAnnoucement(announcement) {
        if (announcement.superviserId != this._cacheService.agent.id) {
            this.announcementList.push(announcement);
        }
    }


    removeAnnoucement(announcement) {
        this.announcementList = this.announcementList.filter((item) => item.id !== announcement.id);
    }
}
