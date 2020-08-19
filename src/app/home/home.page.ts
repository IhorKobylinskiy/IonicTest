import {Component, ViewChild, OnDestroy, OnInit, AfterViewInit} from '@angular/core';
import { AlertController } from '@ionic/angular';
import { RedditHttpService } from '../services/reddit.service';
import { TGetItemsParams } from '../services/reddit.service';
import { environment } from '../../environments/environment';
import { Observable, concat, pipe, Subscription, zip } from 'rxjs';
import { map } from 'rxjs/operators';
import { IPageInfo } from 'ngx-virtual-scroller';

export type TRedditDataStreams = Observable<any> | Array<Observable<any>>;
export type TDirections = 'up' | 'down';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy{
  numberOfLoadedPosts: number;
  dataList: any[] = [];
  startPostIndex = 0;
  postId: undefined | string;
  subredditId: undefined | string;
  dataSubscription: undefined | Subscription;
  dataBeforeSubscription: undefined | Subscription;
  dataAfterSubscription: undefined | Subscription;
  initialDataLoaded = false;
  latestBeforeLoadedIndex = 0;
  @ViewChild('scroll', {static: false}) scroll;

  constructor(
      public alertController: AlertController,
      private redditHttpService: RedditHttpService,
  ) {

  }

  ngOnInit() {
    this.showAlert();
  }

  ngAfterViewInit() {
  }

  private getItemsBefore(params: TGetItemsParams) {
    return this.redditHttpService.getItemsBefore(params);
  }

  private getItemsAfter(params: TGetItemsParams) {
    return this.redditHttpService.getItemsAfter(params);
  }
  private getCurrentItem(postId: string){
    return this.redditHttpService.getCurrentItem(postId);
  }

  async showAlert() {
    const alert = await this.alertController.create({
      inputs: [
        {
          placeholder: 'subreddit',
          name: 'subreddit',
          type: 'text',
          value: 'aww.json'
        },
        {
          placeholder: 'referece post id',
          name: 'referecedPostId',
          type: 'text',
          value: 't3_ic082m'
        }],
      buttons: [
        {
          text: 'Ok',
          handler: (alertData) => {
            const params = {
              subredditId: alertData.subreddit,
              limit: environment.postsLimitBeforeAfter,
              count: this.dataList.length
            };
            this.postId = alertData.referecedPostId;
            this.subredditId = alertData.subreddit;
            this.setInitialDataList([
              this.getItemsBefore(
                  Object.assign({}, params, {before: alertData.referecedPostId})
              ),
              this.getCurrentItem(alertData.referecedPostId),
              this.getItemsAfter(
                  Object.assign({}, params, {after: alertData.referecedPostId})
              )
            ]);
          }
        }
      ]
    });
    await alert.present();
  }
  private setDataList(data: Observable<any>, dirrection: TDirections, scrollToCurrent = false){
    let dataSource;
    dataSource = data.pipe(
        map((res: any) => {
          const result: any = res?.data?.children;
          return result;
        })
    );
    if (dirrection === 'up'){
      this.dataBeforeSubscription = dataSource.subscribe((res: any[]) => {
        this.dataList = [...res.map(i => i.data), ...this.dataList];
        this.scroll.scrollToIndex(10, undefined,
                 undefined, 0, () => {
        });
      }, err => {
        console.log(err);
      });
    } else {
      this.dataAfterSubscription = dataSource.subscribe((res: any[]) => {
        this.dataList = [...this.dataList, ...res.map(i => i.data)];
        if (scrollToCurrent){
          this.scrollToCurrent(this.dataList);
        }
      }, err => {
        console.log(err);
      });
    }
  }

  private setInitialDataList(data: TRedditDataStreams){
    let dataSource;
    dataSource = zip(data[0], data[1], data[2]).pipe(
        map((res: any) => {
          const result1: any = res[0]?.data?.children;
          const result2: any = res[1]?.data?.children;
          const result3: any = res[2]?.data?.children;
          return result1.concat(result2).concat(result3);
        })
    );
    this.dataSubscription = dataSource.subscribe((res: any[]) => {
      this.dataList = [...res.map(i => i.data)];
      if (!this.initialDataLoaded) {
        if (this.scroll.viewPortInfo.endIndex === -1){
          const params = {
            subredditId: this.subredditId,
            limit: environment.postsLimitBeforeAfter,
            count: this.dataList.length
          };
          this.setDataList(
              this.getItemsAfter(
                  Object.assign({}, params, {after: this.postId})
              ), 'down', true
          );
        } else {
          this.scrollToCurrent(this.dataList);
        }

      }
    }, err => {
      console.log(err);
    });
  }

  private scrollToCurrent(dataList: any[]){
    this.startPostIndex = this.dataList.findIndex((item) => {
      return item.name === this.postId;
    });
    this.scroll.scrollToIndex(this.startPostIndex, undefined, undefined, 0, () => {
      this.initialDataLoaded = true;
    });
  }

  loadBefore(event: IPageInfo) {
    if (this.initialDataLoaded && event.startIndex === 0) {
      const params = {
        subredditId: this.subredditId,
        limit: environment.postsLimitBeforeAfter,
        count: this.dataList.length
      };
      this.setDataList(
          this.getItemsBefore(
              Object.assign({}, params, {before: this.postId})
          ), 'up'
      );
    }
  }

  loadAfter(event: IPageInfo) {
    if (this.initialDataLoaded && event.endIndex === this.dataList.length - 1) {
      const params = {
        subredditId: this.subredditId,
        limit: environment.postsLimitBeforeAfter,
        count: this.dataList.length
      };
      this.setDataList(
        this.getItemsAfter(
            Object.assign({}, params, {after: this.postId})
        ), 'down'
      );
    }
  }

  openInBrowser(url: string){
    window.open(url, '_system', 'location=yes');
    return false;
  }

  ngOnDestroy(){
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.dataBeforeSubscription) {
      this.dataBeforeSubscription.unsubscribe();
    }
    if (this.dataAfterSubscription) {
      this.dataAfterSubscription.unsubscribe();
    }
  }

}
