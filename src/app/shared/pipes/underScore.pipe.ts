import { Pipe, PipeTransform } from "@angular/core";

@Pipe({ name: "removeUnderscore", pure: true })
export class RemoveUnderscorePipe implements PipeTransform {
  transform(value: any, args?: any): any {
    if (value) {
      return value.replace(/_/g, " ").toUpperCase();
    } else {
      return "";
    }
  }
}
