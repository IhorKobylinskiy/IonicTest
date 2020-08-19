import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
export interface IGetItemsParams {
    subredditId: string;
    limit: number;
    count: number;
    before?: string;
    after?: string;
}

export interface IGetItemParams {
    postId: string;
}

type TRequireAtLeastOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>>
    & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
}[Keys];

export type TGetItemsParams = TRequireAtLeastOne<IGetItemsParams, 'before' | 'after'>;

@Injectable()
export class RedditHttpService {

    private basePath = environment.httpDataUrl;

    constructor(
        private http: HttpClient
    ) { }

    getItemsBefore(params: TGetItemsParams) {
        return this.http.get(`${this.basePath}/r/${params.subredditId}?before=${params.before}&limit=${params.limit}`);
    }

    getItemsAfter(params: TGetItemsParams) {
        return this.http.get(`${this.basePath}/r/${params.subredditId}?after=${params.after}&limit=${params.limit}`);
    }

    getCurrentItem(postId) {
        return this.http.get(`${environment.corsApiHost}/${this.basePath}/by_id/${postId}.json`);
    }
}
