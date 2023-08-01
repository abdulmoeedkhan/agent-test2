import { HttpErrorResponse } from "@angular/common/http";
import { TranslateService } from "@ngx-translate/core";
import { of, throwError } from "rxjs";
import { InteractionsComponent } from "./interactions.component";

describe("InteractionsComponent", () => {
  let component: any;
  let _socketService: any;
  let _shareredService: any;
  let dialogMock: any;
  let _httpService: any;
  let _finneseService: any;
  let _cacheService: any;
  let _snackBarService: any;
  let _appConfigService: any;
  let snackBar: any;
  let translateService: TranslateService;
  let _sipService: any
  let channelSession = {
    channel: {
      channelConnector: {
        channelProviderConfigs: [
          { key: "FACEBOOK-API-KEY", value: "qq" },
          { key: "FACEBOOK-HOST-URL", value: "qq" }
        ]
      }
    }
  };

  describe("when only post data api returns data ", () => {
    beforeEach(async () => {
      const errorResponse = new HttpErrorResponse({
        error: "test 404 error",
        status: 404
      });

      _httpService = {
        getFBPostComments: jest.fn((postId) => {
          return throwError(() => errorResponse);
        }),
        getFBPostData: jest.fn((postId) => {
          return of(() => {
            throw HttpErrorResponse;
          });
        })
      };

      component = new InteractionsComponent(
        _shareredService,
        _cacheService,
        _socketService,
        dialogMock,
        _snackBarService,
        _appConfigService,
        _httpService,
        _finneseService,
        snackBar,
        _sipService,
        translateService,

      );
    });

    it("postComments should be null", () => {
      expect(component).toBeTruthy();
      let postId = 1;
      let selectedCommentId = 2;
      component.getFullViewPostData(channelSession, postId, selectedCommentId);
      expect(component.selectedCommentId).toBe(2);
      expect(component.postData).toBeDefined();
      expect(component.postComments).toBe(null);
    });

    it("fullPostView should be truthy", () => {
      let postId = 9;
      let selectedCommentId = 10;
      component.getFullViewPostData(channelSession, postId, selectedCommentId);
      expect(component.fullPostView).toBeTruthy();
    });
  });

  describe("when both post data and fb comments api returns data ", () => {
    beforeEach(async () => {
      _httpService = {
        getFBPostComments: jest.fn((postId) => {
          return of([{ data: "comments" }]);
        }),
        getFBPostData: jest.fn((postId) => {
          return of([{ data: "comments" }]);
        })
      };
      component = new InteractionsComponent(
        _shareredService,
        _cacheService,
        _socketService,
        dialogMock,
        _snackBarService,
        _appConfigService,
        _httpService,
        _finneseService,
        snackBar,
        _sipService,
        translateService,

      );
    });

    it("postData and postComments should be defined", () => {
      expect(component).toBeTruthy();
      let postId = 1;
      let selectedCommentId = 2;
      component.getFullViewPostData(channelSession, postId, selectedCommentId);
      expect(component.selectedCommentId).toBe(selectedCommentId);
      expect(component.postData).toBeDefined();
      expect(component.postComments).toBeDefined();
    });

    it("fullPostView should be truthy", () => {
      let postId = 9;
      let selectedCommentId = 10;
      component.getFullViewPostData(channelSession, postId, selectedCommentId);
      expect(component.fullPostView).toBeTruthy();
    });
  });

  describe("when both apis returns error", () => {
    beforeEach(async () => {
      const errorResponse = new HttpErrorResponse({
        error: "test 404 error",
        status: 404
      });
      _httpService = {
        getFBPostComments: jest.fn((postId) => {
          return throwError(() => errorResponse);
        }),
        getFBPostData: jest.fn((postId) => {
          return throwError(() => errorResponse);
        })
      };
      component = new InteractionsComponent(
        _shareredService,
        _cacheService,
        _socketService,
        dialogMock,
        _snackBarService,
        _appConfigService,
        _httpService,
        _finneseService,
        snackBar,
        _sipService,
        translateService
      );
    });

    it("Both postData and postComments should be null", () => {
      expect(component).toBeTruthy();
      let postId = 1;
      let selectedCommentId = 2;
      component.getFullViewPostData(channelSession, postId, selectedCommentId);
      expect(component.selectedCommentId).toBe(null);
      expect(component.postData).toBe(null);
      expect(component.fullPostView).toBeFalsy();
      expect(component.postComments).toBe(null);
    });

    it("fullPostView should be falsy", () => {
      let postId = 9;
      let selectedCommentId = 10;
      component.getFullViewPostData(channelSession, postId, selectedCommentId);
      expect(component.fullPostView).toBeFalsy();
    });
  });

  describe("Quoted Reply", () => {
    beforeEach(async () => {
      component = new InteractionsComponent(
        _shareredService,
        _cacheService,
        _socketService,
        dialogMock,
        _snackBarService,
        _appConfigService,
        _httpService,
        _finneseService,
        snackBar,
        _sipService,
        translateService
      );
    });

    it("replyToMessageId should be defined", () => {
      let message = {
        id: "123"
      };
      component.onQuotedReply(message);
      expect(component.replyToMessageId).toEqual(message.id);
    });
    it("quoted message should be defined", () => {
      let message = {
        id: "123"
      };
      component.onQuotedReply(message);
      expect(component.quotedMessage).toEqual(message);
    });
  });
});
