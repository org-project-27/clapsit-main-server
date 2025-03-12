import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ContentDeliveryNetwork } from './contenDeliveryNetwork';
const database =  new PrismaClient();
type MethodType = any;

export type Methods = {
  GET: MethodType;
  POST: MethodType;
  PUT: MethodType;
  PATCH: MethodType;
  DELETE: MethodType;
};

export class Controller {
  public request: Request | any;
  public response: Response;

  public reqBody: { authentication_result: Object } | any;
  public reqQuery: Object | any;
  public reqParams: Object;
  public reqCookies: Object;

  public actions: Methods;
  public database = database;
  public cdn = new ContentDeliveryNetwork();
  constructor(request: Request, response: Response) {
    this.request = request;
    this.response = response;

    this.reqBody = request.body;
    this.reqQuery = request.query;
    this.reqParams = request.params;
    this.reqCookies = request.cookies;

    this.actions = {
      GET: {},
      POST: {},
      PUT: {},
      PATCH: {},
      DELETE: {},
    };
  }
}
