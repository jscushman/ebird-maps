import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ApiKeyService {
  private getApiKeyUrl =
    'https://api.jscushman.com/queryRecentNearbyNotableEbirdApi/getApiKey';

  constructor(private http: HttpClient) {}

  getApiKey(target: string) {
    const params = new HttpParams().set('target', target);
    return this.http.get<string>(this.getApiKeyUrl, {
      params,
    });
  }
}
