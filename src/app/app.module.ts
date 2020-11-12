import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';

import { LoginComponent } from './login/login.component';
import { AppComponent } from './app.component';
import { NoRouteFoundComponent } from './no-route-found/no-route-found.component';
import { AppHeaderComponent } from './app-header/app-header.component';
import { SharedModule } from './shared/shared.module';
import { appConfigService } from './services/appConfig.service';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    NoRouteFoundComponent,
    AppHeaderComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CommonModule,
    BrowserAnimationsModule,
    SharedModule
  ],
  providers: [appConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: (_appConfigService: appConfigService) => () => _appConfigService.loadConfig(),
      deps: [appConfigService],
      multi: true
    }],
  exports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
