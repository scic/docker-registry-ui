import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import 'rxjs/Rx';
import { Observable } from 'rxjs/Observable';
import * as _ from 'lodash';

import { Repository, RepositoryWithTags, Manifest, ManifestMetadata } from './repository.model';
import { AppConfig } from '../app.config';

@Injectable()
export class RepositoryService {

  constructor(private http: HttpClient, private appConfig: AppConfig) { }

  repositories(): Observable<Repository[]> {
    const url = `${this.appConfig.getRegistryHost()}/v2/_catalog?n=1000`;
    return this.http.get(url)
      .map(data => _.get(data, 'repositories'))
      .map(data => this.parseRepositories(data))
      .catch(this.handleError);
  }

  tags(repository: Repository): Observable<RepositoryWithTags> {
    const url = `${this.appConfig.getRegistryHost()}/v2/${repository.name}/tags/list`;
    return this.http.get<RepositoryWithTags>(url)
      .catch(this.handleError);
  }

  manifest(manifest: Manifest): Observable<Manifest> {
    const url = `${this.appConfig.getRegistryHost()}/v2/${manifest.name}/manifests/${manifest.tag}`;
    return this.http.get<ManifestMetadata>(url)
      .map(data => _.get(data, 'history'))
      .map(data => this.addManifestHistory(manifest, data))
      .catch(this.handleError);
  }

  private parseRepositories = (repositories: Repository[]) => {
    return repositories.map(e => this.parseRepository(e));
  }

  private parseRepository(data: any): Repository {
    return {
      name: data
    };
  }

  private addManifestHistory(manifest: Manifest, history: any): Manifest {
    if (history.length > 0) {
      const lastHistoryLayer = JSON.parse(_.get(history[0], 'v1Compatibility'));
      manifest.metadata = lastHistoryLayer;
      manifest.metadata.labels = _.get(lastHistoryLayer, 'config.Labels');
      manifest.metadata.author = lastHistoryLayer.author || (manifest.metadata.labels && manifest.metadata.labels['maintainer']);
    }
    return manifest;
  }

  private handleError(error: HttpErrorResponse): Observable<any> {
    return Observable.throw(`Failed to fetch registry catalog: ${error.message}`);
  }
}
