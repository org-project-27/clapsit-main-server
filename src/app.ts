import 'module-alias/register';
import createHttpError from 'http-errors';
import useragent from 'express-useragent';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';

import HttpCodes from '#assets/constants/statusCodes';
import indexRouter from '#routes/index';
import apiRouter from '#routes/api';
import cdnRouter from '#routes/cdn';
import checkServiceSecretKey from '~/middlewares/checkServiceSecretKey';
import checkDatabaseConnection from '~/db/checkDatabaseConnection';
import { $loggedForMorgan } from '#helpers/logHelpers';
dotenv.config();
const app = express();
// #AREA - view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
// #AREA - for catching IP address
app.enable('trust proxy');

// #AREA - Logging settings
const customLogStream = {
  write: (message: string) => $loggedForMorgan(message),
};
app.use(logger('combined', { stream: customLogStream }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(useragent.express());

// #AREA - for accept post request data within the request body
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// #AREA - access static files
app.use(express.static('public'));

// #AREA - cors settings
app.use(
  cors({
    origin: process.env.ACCEPTABLE_CORS_ORIGIN,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: HttpCodes.NO_CONTENT,
  })
);

// #AREA - routes
// app.use('/', checkServiceSecretKey, indexRouter);

// #AREA - init
checkDatabaseConnection
  .then(async () => {
    app.use('/api', apiRouter);
    app.use('/cdn', cdnRouter);
  })
  .catch(async (err: any) => {
    app.use('/api', function (req, res, next) {
      next(createHttpError(HttpCodes.SERVICE_UNAVAILABLE));
    });
    throw err;
  })
  .finally(() => {
    // #AREA - catch 404 and forward to error handler
    app.use(function (req, res, next) {
      next(createHttpError(HttpCodes.NOT_FOUND));
    });

    // #AREA - error handler
    app.use(function (err: any, req, res: any) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || HttpCodes.INTERNAL_SERVER_ERROR);
      res.render('error');
    });
  });
export default app;