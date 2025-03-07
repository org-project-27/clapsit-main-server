import statusCodes from '#assets/constants/statusCodes';
import apiMessageKeys from '#assets/constants/apiMessageKeys';
import { $sendResponse } from '#helpers/methods';
import { NextFunction, Request, Response } from 'express';
import TokenSessionController from '#controllers/TokenSessionController';
import { $logged } from '#helpers/logHelpers';
import { PrismaClient } from '@prisma/client';

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    const sessions = new TokenSessionController(req, res);
    const db = new PrismaClient();
    if (token == null) {
      return $sendResponse.failed({}, res, apiMessageKeys.AUTH_REQUIRED, statusCodes.FORBIDDEN);
    }

    const result = await sessions.verify('access_token', token);

    if (!result) {
      return $sendResponse.failed({}, res, apiMessageKeys.INVALID_TOKEN, statusCodes.UNAUTHORIZED);
    }
    const user = await db.userDetails.findUnique({ where: { user_id: result.session.owner_id } });
    if (user) {
      if (!user.email_registered) {
        return $sendResponse.failed({}, res, apiMessageKeys.EMAIL_CONFIRM_REQUIRED, statusCodes.FORBIDDEN);
      }
    } else {
      return $sendResponse.failed({}, res, apiMessageKeys.USER_NOT_FOUND, statusCodes.FORBIDDEN);
    }
    req.body['authentication_result'] = JSON.stringify(result);
    next();
  } catch (error: any) {
    $logged(error, false, { file: __filename.split('/src')[1] });
    return $sendResponse.failed({ error }, res, apiMessageKeys.INVALID_TOKEN, statusCodes.UNAUTHORIZED);
  }
};
