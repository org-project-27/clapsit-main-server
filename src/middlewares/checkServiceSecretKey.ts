import {NextFunction, Request, Response} from "express";
import dotenv from "dotenv";
import {$logged} from "#helpers/logHelpers";

dotenv.config();
export default (req: Request, res: Response, next: NextFunction) => {
    if(!process.env.DEVELOPER_MODE){
        const secretKey = req.headers['x-secret-key'];
        if (!secretKey) {
            $logged(
                '⛔️ Unauthenticated request'.toUpperCase(),
                false,
                {from: 'X_SECRET_KEY', file: __filename.split('/src')[1]},
                req.ip
            )
            return res.status(401).json({ error: 'Service auth required' });
        }

        if (secretKey !== process.env.X_SECRET_KEY) {
            $logged(
                '⛔️ Request with invalid secret key'.toUpperCase(),
                false,
                {from: 'X_SECRET_KEY', file: __filename.split('/src')[1]},
                req.ip
            )
            return res.status(403).json({ error: 'Invalid secret key' });
        }

    }
    // If the secret key is valid, proceed to the next middleware or route handler
    next();
};