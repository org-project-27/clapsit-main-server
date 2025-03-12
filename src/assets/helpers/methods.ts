import statusCodes from '../constants/statusCodes';
import createError from 'http-errors';
import dotenv from 'dotenv';
import apiMessageKeys from '../constants/apiMessageKeys';
import { Request, Response, NextFunction } from 'express';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { $logged } from './logHelpers';

dotenv.config();
let responseDelay: number = Number(process.env.RESPONSE_DELAY || 0);

export const $sendResponse = {
    success: (data = {}, via: Response, message = apiMessageKeys.DONE, statusCode = statusCodes.OK, other = {}) => {
        const tId = setTimeout(() => {
            via.status(statusCode).send({ success: true, status: statusCode, message, data, ...other });
            clearTimeout(tId);
        }, responseDelay);
    },
    failed: (
        data = {},
        via: Response,
        message = apiMessageKeys.SOMETHING_WENT_WRONG,
        statusCode = statusCodes.BAD_REQUEST
    ) => {
        const tId = setTimeout(() => {
            via.status(statusCode).send({ success: false, status: statusCode, message, ...data });
            clearTimeout(tId);
        }, responseDelay);
    }
};

export const $callToAction = (controller: any) => {
    return (req: Request, res: Response, next: NextFunction | never) => {
        const { actions } = new controller(req, res);
        if (!!actions && !!req && !!res) {
            const { method, path } = req;
            if (actions[method] && actions[method][path]) {
                actions[method][path]({ req, res, next });
            } else {
                let originPath = '';
                let reqParams: Record<string, any> = {};

                for (let p in actions[method]) {
                    if (p.includes('/:')) {
                        let pathParts = p.split('/');
                        let reqParts = path.split('/');

                        if (pathParts.length === reqParts.length) {
                            let isMatched = true;
                            let params: Record<string, any> = {};

                            pathParts.forEach((part, i) => {
                                if (part.startsWith(':')) {
                                    params[part.replace(':', '')] = reqParts[i];
                                } else if (part !== reqParts[i]) {
                                    isMatched = false;
                                }
                            });

                            if (isMatched) {
                                originPath = p;
                                reqParams = params;
                                break;
                            }
                        }
                    }
                }

                if (originPath) {
                    actions[method][originPath]({ req, res, next, params: reqParams });
                } else next(createError(statusCodes.NOT_FOUND));
            }
        } else {
            next(createError(statusCodes.INTERNAL_SERVER_ERROR));
        }
    };
};

export const $writeToFileSafe = (data: string, filePath: string) => {
    const dir = path.dirname(filePath);

    if(existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filePath, data, 'utf8');
}

export const $uploader = (objectFor?: string) => {
    return (request: Request, response: Response, next: NextFunction) => {
        try {
            const authentication_result = JSON.parse(request.body.authentication_result);
            const { user_id } = authentication_result.payload;
            const storage = multer.diskStorage({
                destination: function (req, file, cb) {
                    const { mimetype } = file;
                    const fileType = mimetype.split('/')[0];
                    const category = ['image', 'video', 'audio'].includes(fileType) ? fileType : 'other';
                    const path = `cdn/${category}/`;

                    cb(null, path);
                },
                filename: async function (req, file, cb) {
                    const { originalname, mimetype } = file;
                    const extension = originalname.split('.').pop();
                    const id = uuidv4();
                    const path = `${id}.${extension}`;
                    const database = new PrismaClient();
                    await database.objects.create({
                        data: {
                            id,
                            name: originalname,
                            type: mimetype,
                            path,
                            user_id: user_id,
                            object_for: objectFor!
                        }
                    });
                    database.$disconnect();
                    req.body['authentication_result'] = authentication_result;
                    req.body['object_id'] = id;
                    cb(null, path);
                }
            });
            const upload = multer({ storage });
            return upload.single('file')(request, response, next);
        } catch (error) {
            $logged(
                `Multer uploading progress failed\n${error}`,
                false,
                { file: __filename.split('/src')[1], payload: request.body },
                request.ip
            );
            return $sendResponse.failed(
                {},
                response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    };
}
