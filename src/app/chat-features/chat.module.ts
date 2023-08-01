import { NgModule } from "@angular/core";

import { SharedModule } from "../shared/shared.module";
import { ChatRoutingModule } from "./chat-routing.module";

import { ChatsComponent } from "./chats/chats.component";
import { InteractionsComponent } from "./interactions/interactions.component";
import { CustomerInfoComponent } from "./customer-info/customer-info.component";
import { AgmCoreModule } from "@agm/core";
import { VgCoreModule } from "videogular2/compiled/src/core/core";
import { VgControlsModule } from "videogular2/compiled/src/controls/controls";
import { VgOverlayPlayModule } from "videogular2/compiled/src/overlay-play/overlay-play";
import { VgBufferingModule } from "videogular2/compiled/src/buffering/buffering";
import { WrapUpFormComponent } from "./wrap-up-form/wrap-up-form.component";
import {HighlightModule} from 'ngx-highlightjs';


@NgModule({
  declarations: [ChatsComponent, InteractionsComponent, CustomerInfoComponent, WrapUpFormComponent],
  imports: [
    AgmCoreModule.forRoot({
      apiKey: "AIzaSyA_dm2C9FEp26nXSEjfN9G76juYi-CtiLE"
    }),
    SharedModule,
    ChatRoutingModule,
    VgCoreModule,
    VgControlsModule,
    VgOverlayPlayModule,
    VgBufferingModule,
    HighlightModule
  ],
  entryComponents: [WrapUpFormComponent]
})
export class ChatModule {}
