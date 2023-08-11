import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import {
  MatAutocompleteModule,
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDatepickerModule,
  MatDialogModule,
  MatDrawer,
  MatExpansionModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatNativeDateModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatRadioModule,
  MatSelectModule,
  MatSidenavModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  MatTableModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
  MatPaginatorModule
} from "@angular/material";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { CommonModule } from "@angular/common";
import { NgCircleProgressModule } from "ng-circle-progress";
import { HttpClientModule } from "@angular/common/http";
import { RemoveUnderscorePipe } from "./pipes/underScore.pipe";
import { NgxLinkifyjsModule } from "ngx-linkifyjs";
import { ibsformatPipe } from "./pipes/ibsFormat.pipe";
import { getSenderNamePipe } from "./pipes/getSenderName.pipe";
import { TableModule } from "primeng/table";
import { SliderModule } from "primeng/slider";
import { CalendarModule } from "primeng/calendar";
import { DialogModule } from "primeng/dialog";
import { MultiSelectModule } from "primeng/multiselect";
import { ContextMenuModule } from "primeng/contextmenu";
import { DropdownModule } from "primeng/dropdown";
import { ButtonModule } from "primeng/button";
import { ToastModule } from "primeng/toast";
import { InputTextModule } from "primeng/inputtext";
import { ProgressBarModule } from "primeng/progressbar";
import { FileUploadModule } from "primeng/fileupload";
import { ToolbarModule } from "primeng/toolbar";
import { RatingModule } from "primeng/rating";
import { RadioButtonModule } from "primeng/radiobutton";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { InputTextareaModule } from "primeng/inputtextarea";
import { OwlDateTimeModule, OwlNativeDateTimeModule } from "ng-pick-datetime";
import { SearchPipe } from "./pipes/search.pipe";
import { sentenceCasePipe } from "./pipes/sentenceCase.pipe";
import { convertToFormDataPipe } from "./pipes/convertToFormData.pipe";
import { getFirstTwoLettersPipe } from "./pipes/getFirstTwoLetters.pipe";
import { NgxMatDatetimePickerModule, NgxMatNativeDateModule, NgxMatTimepickerModule } from "ngx-mat-datetime-picker";
import { AngularMultiSelectModule } from "angular2-multiselect-dropdown";
import { NgScrollbarModule } from "ngx-scrollbar";
import { getMRDSwitchesPipe } from "./pipes/getMRDSwitchs.pipe";
import { fetchLabelsPipe } from "./pipes/fetchLabels.pipe";
import { columnsFilterClass } from "./pipes/columnsFilter.pipe";
import { MomentModule } from "ngx-moment";
import { filterPullModeRequestsPipe } from "./pipes/filterPullModeReqsts.pipe";
import { channelLogoPipe } from "./pipes/getChannelLogo.pipe";
import { activeConversationPipe } from "./pipes/getActiveConversationData.pipe";
import { isAlreadyJoinedPipe } from "./pipes/isAlreadyJoined.pipe";
import { webChannelDataPipe } from "./pipes/webChannelData.pipe";
import { getFileUrlPipe } from "./pipes/getFileUrl.pipe";
import { NgxDocViewerModule } from "ngx-doc-viewer";
import { sanitizePipe } from "./pipes/sanitize.pipe";
import { DownloadDirective } from "../download.directive";
import { getFileExtPipe } from "./pipes/getFileExt.pipe";
import { getFormattedBytesPipe } from "./pipes/formatBytes.pipe";
import { getReferredMessagePipe } from "./pipes/getReferredMsg.pipe";
import { spaceInArrayPipe } from "./pipes/spaceInArray.pipe";
import { isPIIPipe } from "./pipes/isPII.pipe";
import { channelNamePipe } from "./pipes/getChannelLogoByName.pipe";
import { NgxTimerModule } from "ngx-timer";
import { getSenderIdPipe } from "./pipes/getSenderId.pipe";
import { AuthPipe } from "./pipes/auth.pipe";
import { TableFilterPipe } from "./pipes/table.pipe";
import { timeDurationPipe } from "./pipes/timeDuration.pipe";
import { timeDurationFromParticipantPipe } from "./pipes/timeDurationFromParticipant.pipe";
import { getCheckedChannelSessionPipe } from "./pipes/getCheckedChannelSession.pipe";
import { TranslateModule } from "@ngx-translate/core";
import { filterAgentParticipantClass } from "./pipes/filterAgents.pipe";
import { SliceFilterPipe } from "./pipes/slice-filter.pipe";
import { checkConferenceCallPipe } from "./pipes/checkConferenceCall.pipe";
import { getCustomerAniPipe } from "./pipes/getCustomerAni.pipe";
import { checkOutboundCallPipe } from "./pipes/checkOutboundCall.pipe";
import { checkConsultCallPipe } from "./pipes/checkConsultCall.pipe";
import { filterSeenByAnnouncementsPipe } from "./pipes/filterSeenByAnnouncements.pipe";
import { getIVRTrailPipe } from "./pipes/getIVRTrail.pipe";
import {SearchSuggestionsPipe} from './pipes/searchSuggestions.pipe';
import { CustomDatePipe } from './pipes/customdatetime.pipe';

@NgModule({
  declarations: [
    getFormattedBytesPipe,
    timeDurationFromParticipantPipe,
    timeDurationPipe,
    getMRDSwitchesPipe,
    RemoveUnderscorePipe,
    isAlreadyJoinedPipe,
    ibsformatPipe,
    getSenderNamePipe,
    getIVRTrailPipe,
    SearchPipe,
    SearchSuggestionsPipe,
    sentenceCasePipe,
    convertToFormDataPipe,
    getFirstTwoLettersPipe,
    fetchLabelsPipe,
    columnsFilterClass,
    filterPullModeRequestsPipe,
    filterSeenByAnnouncementsPipe,
    channelLogoPipe,
    activeConversationPipe,
    webChannelDataPipe,
    getFileUrlPipe,
    sanitizePipe,
    DownloadDirective,
    getFileExtPipe,
    getReferredMessagePipe,
    spaceInArrayPipe,
    isPIIPipe,
    channelNamePipe,
    getSenderIdPipe,
    AuthPipe,
    CustomDatePipe,
    TableFilterPipe,
    getCheckedChannelSessionPipe,
    filterAgentParticipantClass,
    SliceFilterPipe,
    checkConferenceCallPipe,
    getCustomerAniPipe,
    checkOutboundCallPipe,
    checkConsultCallPipe
  ],
  imports: [
    NgxDocViewerModule,
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatCheckboxModule,
    MatButtonModule,
    MatRadioModule,
    ReactiveFormsModule,
    MatListModule,
    MatSnackBarModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatTabsModule,
    MatSelectModule,
    MatInputModule,
    MatTooltipModule,
    FormsModule,
    MatExpansionModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    CommonModule,
    NgxMatDatetimePickerModule,
    NgxMatNativeDateModule,
    NgxMatTimepickerModule,
    MomentModule,
    NgCircleProgressModule.forRoot({
      radius: 100,
      outerStrokeWidth: 16,
      innerStrokeWidth: 8,
      outerStrokeColor: "#78C000",
      innerStrokeColor: "#3f51b5",
      animationDuration: 0
    }),
    HttpClientModule,
    NgxLinkifyjsModule.forRoot(),
    TableModule,
    CalendarModule,
    SliderModule,
    DialogModule,
    MultiSelectModule,
    ContextMenuModule,
    DropdownModule,
    ButtonModule,
    ToastModule,
    InputTextModule,
    ProgressBarModule,
    HttpClientModule,
    FileUploadModule,
    ToolbarModule,
    RatingModule,
    FormsModule,
    RadioButtonModule,
    ConfirmDialogModule,
    InputTextareaModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
    AngularMultiSelectModule,
    NgScrollbarModule,
    NgxTimerModule,
    TranslateModule
  ],
  exports: [
    NgxTimerModule,
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatDrawer,
    MatCheckboxModule,
    MatButtonModule,
    MatRadioModule,
    ReactiveFormsModule,
    MatListModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatProgressBarModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatSelectModule,
    MatTooltipModule,
    FormsModule,
    MatExpansionModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    DragDropModule,
    CommonModule,
    NgCircleProgressModule,
    HttpClientModule,
    RemoveUnderscorePipe,
    filterPullModeRequestsPipe,
    filterSeenByAnnouncementsPipe,
    NgxLinkifyjsModule,
    ibsformatPipe,
    TableModule,
    CalendarModule,
    SliderModule,
    DialogModule,
    MultiSelectModule,
    ContextMenuModule,
    DropdownModule,
    ButtonModule,
    ToastModule,
    InputTextModule,
    ProgressBarModule,
    HttpClientModule,
    FileUploadModule,
    ToolbarModule,
    RatingModule,
    FormsModule,
    RadioButtonModule,
    ConfirmDialogModule,
    InputTextareaModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
    NgxMatDatetimePickerModule,
    NgxMatNativeDateModule,
    NgxMatTimepickerModule,
    SearchPipe,
    SearchSuggestionsPipe,
    getSenderNamePipe,
    getIVRTrailPipe,
    sentenceCasePipe,
    convertToFormDataPipe,
    getFirstTwoLettersPipe,
    AngularMultiSelectModule,
    NgScrollbarModule,
    getMRDSwitchesPipe,
    fetchLabelsPipe,
    columnsFilterClass,
    MomentModule,
    channelLogoPipe,
    activeConversationPipe,
    isAlreadyJoinedPipe,
    webChannelDataPipe,
    getFileUrlPipe,
    sanitizePipe,
    NgxDocViewerModule,
    DownloadDirective,
    getFileExtPipe,
    getFormattedBytesPipe,
    getReferredMessagePipe,
    spaceInArrayPipe,
    isPIIPipe,
    channelNamePipe,
    getSenderIdPipe,
    timeDurationPipe,
    AuthPipe,
    CustomDatePipe,
    getCheckedChannelSessionPipe,
    timeDurationFromParticipantPipe,
    TranslateModule,
    filterAgentParticipantClass,
    SliceFilterPipe,
    checkConferenceCallPipe,
    checkOutboundCallPipe,
    getCustomerAniPipe,
    checkConsultCallPipe,
    MatPaginatorModule,
    TableFilterPipe
  ]
})
export class SharedModule {}
