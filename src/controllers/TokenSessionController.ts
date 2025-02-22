import {Controller} from "#types/controller";
import jwt from "jsonwebtoken";
import {$logged} from "#helpers/logHelpers";
import moment from "moment";
import {Request, Response} from "express";

type CreatedForTypes = 'access_token' | 'refresh_token' | 'confirm_email' | 'reset_password';
type SecretKeysTypes = {
    [key in CreatedForTypes | 'default']: string
}
type TokenLifeTypes = {
    [key in CreatedForTypes | 'default']: number
}
export default class TokenSessionController extends Controller {
    constructor(request: Request, response: Response) {
        super(request, response);
    }
    public static tokenLifeDays: TokenLifeTypes = {
        default: 1/24,
        confirm_email: 1,
        access_token: 7,
        refresh_token: 30,
        reset_password: 1/24,
    }
    public static tokenLifeHours: TokenLifeTypes = {
        default: 24 * TokenSessionController.tokenLifeDays.default,
        confirm_email: 24 * TokenSessionController.tokenLifeDays.confirm_email,
        access_token: 24 * TokenSessionController.tokenLifeDays.access_token,
        refresh_token: 24 * TokenSessionController.tokenLifeDays.refresh_token,
        reset_password: 24 * TokenSessionController.tokenLifeDays.reset_password,
    }
    private static secretKeys: SecretKeysTypes = {
        default: process.env.ACCESS_TOKEN_SECRET || 'undefined_secret_key',
        access_token: process.env.ACCESS_TOKEN_SECRET || 'undefined_secret_key',
        confirm_email: process.env.ACCESS_TOKEN_SECRET || 'undefined_secret_key',
        refresh_token: process.env.REFRESH_TOKEN_SECRET || 'undefined_secret_key',
        reset_password: process.env.ACCESS_TOKEN_SECRET || 'undefined_secret_key',

    }
    private static dayBySeconds(day: number): number {
        return (3600 * 24) * day;
    }
    private static tokenLifeSeconds: TokenLifeTypes = {
        default: TokenSessionController.dayBySeconds(TokenSessionController.tokenLifeDays.default),
        confirm_email: TokenSessionController.dayBySeconds(TokenSessionController.tokenLifeDays.confirm_email),
        access_token: TokenSessionController.dayBySeconds(TokenSessionController.tokenLifeDays.access_token),
        refresh_token: TokenSessionController.dayBySeconds(TokenSessionController.tokenLifeDays.refresh_token),
        reset_password: TokenSessionController.dayBySeconds(TokenSessionController.tokenLifeDays.reset_password),
    }
    private static isDateExpired(date: string) {
        const now = moment();
        const dateToCheck = moment(date);

        return dateToCheck.isBefore(now);
    }
    public async create(ownerId: number, createdFor: CreatedForTypes, payload: object = {}) {
        const {secretKeys, tokenLifeSeconds} = TokenSessionController;
        const expiresIn = tokenLifeSeconds[createdFor] || tokenLifeSeconds.default;
        const expired_in = moment().add(expiresIn, 'seconds').format();

        try {
            const token = jwt.sign(payload, secretKeys[createdFor], {expiresIn});
            const existSession = await this.database.tokenSessions.findFirst({
                where: {
                    owner_id: ownerId,
                    created_for: createdFor
                }
            });
            const result = await this.database.tokenSessions.upsert({
                where: {
                    id: existSession?.id || 0,
                    owner_id: ownerId,
                    created_for: createdFor,
                },
                update: {
                    owner_id: ownerId,
                    created_for: createdFor,
                    payload,
                    expired_in,
                    token
                },
                create: {
                    owner_id: ownerId,
                    created_for: createdFor,
                    payload,
                    expired_in,
                    token
                }
            });
            $logged(
                `New token session created for "${createdFor}", (owner_id: ${ownerId})`.toUpperCase(),
                true,
                {file: __filename.split('/src')[1]},
                this.request.ip
            )
            return {
                session_id: result.id,
                token,
                expired_in
            }
        } catch (error: any) {
            $logged(
                error,
                false,
                {file: __filename.split('/src')[1]},
                this.request.ip
            )
            throw error;
        }
    }
    public async verify(createdFor: CreatedForTypes, token: string | any) {
        try {
            const {secretKeys, isDateExpired} = TokenSessionController;
            const session = await this.database.tokenSessions.findFirst({
                where: {
                    created_for: createdFor,
                    token
                }
            });
            if (session) {
                const owner = await this.database.users.findFirst({
                    where: {
                        id: session.owner_id,
                    }
                })
                if (isDateExpired(session.expired_in)) {
                    await this.kill(session.id);
                    throw new Error(`Session token expired`.toUpperCase());
                } else if(!owner){
                    await this.kill(session.id);
                    throw new Error(`Cannot find owner of session`.toUpperCase());
                }
                const payload = jwt.verify(token, secretKeys[createdFor]);
                return {session, payload};
            } else {
                throw new Error(`Invalid session token`.toUpperCase());
            }
        } catch (error: any) {
            $logged(
                error,
                false,
                {file: __filename.split('/src')[1]},
                this.request.ip
            )
            throw error;
        }
    }
    public async kill(sessionId: number) {
        try {
            await this.database.tokenSessions.findFirst({
                where: {
                    id: sessionId
                }
            }).then(async (result) => {
                if (result) {
                    await this.database.tokenSessions.delete({
                        where: {
                            id: sessionId
                        }
                    });
                }
            })
        } catch (error: any) {
            $logged(
                error,
                false,
                {file: __filename.split('/src')[1]},
                this.request.ip
            )
        }
    }
    public async dropAllExpiredSessions() {
        try {
            const {isDateExpired} = TokenSessionController;
            const sessions = await this.database.tokenSessions.findMany();
            for (const key in sessions){
                const session = sessions[key];
                if (isDateExpired(session.expired_in)) {
                    await this.kill(session.id)
                }
            }
            $logged(
                'All expired sessions dropped'.toUpperCase(),
                true,
                {file: __filename.split('/src')[1]},
                this.request.ip,
                true
            )
        } catch (error: any) {
            $logged(
                error,
                false,
                {file: __filename.split('/src')[1]},
                this.request.ip
            )
        }
    }
}