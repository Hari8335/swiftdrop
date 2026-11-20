import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AdminSearchService {
  public readonly query = signal<string>('');

  public setQuery(q: string): void {
    this.query.set(q ?? '');
  }

  public clear(): void {
    this.query.set('');
  }
}
