import {$callToAction, $sendResponse} from "#helpers/methods";
import {Request, Response} from 'express';
import {Controller} from "#types/controller";
import {validateBirthday, validateEmail, validateFullName, validatePasswordStrength, validatePhoneNumber, validRequiredFields} from "#helpers/inputValidation";
import apiMessageKeys from "#assets/constants/apiMessageKeys";
import {trimObjectValues, $filterObject} from "#helpers/generalHelpers";
import {$logged} from "#helpers/logHelpers";
import bcrypt from "bcrypt";
import statusCodes from "#assets/constants/statusCodes";
import TokenSession from "#controllers/TokenSessionController";
import {available_email_langs} from "#assets/constants/language";
import moment from "moment";
import SMTPController from "./SMTPController";

class UserController extends Controller {
    constructor(request: Request, response: Response) {
        super(request, response);

        this.actions['GET']['/auth'] = this.auth;
        this.actions['GET']['/logout'] = this.logout;
        this.actions['GET']['/confirm_email'] = this.confirmEmail;
        this.actions['GET']['/reset_password'] = this.checkResetPasswordToken;

        this.actions['POST']['/login'] = this.login;
        this.actions['POST']['/signup'] = this.signup;
        this.actions['POST']['/token'] = this.refreshToken;
        this.actions['POST']['/forgot_password'] = this.forgotPassword;
        this.actions['POST']['/reset_password'] = this.resetPassword;
        this.actions['POST']['/profile_photo'] = this.uploadProfilePhoto;
        
        this.actions['PATCH']['/preferred_lang'] = this.setPreferredLang;
        this.actions['PATCH']['/edit'] = this.editUser;
        this.actions['PATCH']['/change_password'] = this.changePassword;

        this.actions['DELETE']['/profile_photo'] = this.deleteProfilePhoto;
    }

    public auth = async () => {
        try {
            const authentication_result = JSON.parse(this.reqBody.authentication_result);
            const {user_id} = authentication_result.payload;
            let user = await this.database.users.findFirst({
                where: {
                    id: user_id
                },
                include: {
                    UserDetails: true,
                }
            });
            if (!user) {
                $logged(
                    `Auth progress failed`,
                    false,
                    {file: __filename.split('/src')[1], user_id},
                    this.request.ip,
                    true
                );
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.INVALID_TOKEN,
                    statusCodes.FORBIDDEN
                )
            }
            let details = user.UserDetails || {};
            user = $filterObject(user, ['fullname', 'email']);
            details = $filterObject(details, ['user_id'], { reverse: true });
            return $sendResponse.success({
                user_id,
                details: {
                    ...user,
                    ...details
                },
            }, this.response, apiMessageKeys.DONE, statusCodes.OK);
        } catch (error: any) {
            $logged(
                `Auth progress failed:\n${error}`,
                false,
                {file: __filename.split('/src')[1]},
                this.request.ip,
                true
            );
            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            )
        }
    };
    public logout = async () => {
        try {
            const sessions = new TokenSession(this.request, this.response);
            const authentication_result = JSON.parse(this.reqBody.authentication_result);
            const {session} = authentication_result;
            await sessions.kill(session.id);
            await this.database.tokenSessions.findFirst({
                where: {
                    owner_id: session.owner_id,
                    created_for: 'refresh_token'
                }
            }).then(async (refreshTokenSession: any) => {
                if (refreshTokenSession) await sessions.kill(refreshTokenSession.id);
            });
            $logged(
                `LOGOUT REQUEST`,
                true,
                {file: __filename.split('/src')[1], user_id: session.owner_id},
                this.request.ip, true
            );
            return $sendResponse.success({}, this.response)
        } catch (error: any) {
            $logged(
                `Logout progress failed:\n${error}`,
                false,
                {file: __filename.split('/src')[1]}
            );
            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            )
        }
    }
    public confirmEmail = async () => {
        try {
            // step #1: Check required fields
            const required_fields = validRequiredFields(['token'], this.reqQuery);
            if (required_fields.length) {
                return $sendResponse.failed(
                    {required_fields},
                    this.response,
                    apiMessageKeys.SOMETHING_WENT_WRONG,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            } else if (this.reqQuery.token) {
                const sessions = new TokenSession(this.request, this.response);
                // step #2 Verify confirm email token
                await sessions.verify(
                    'confirm_email',
                    this.reqQuery.token
                ).then(async (result) => {
                    const payload: any = result.payload;
                    const session: any = result.session;
                    // step #3: Check there is an email like that
                    const emailExist = await this.database.users.findFirst({
                        where: {
                            id: session.owner_id,
                            email: payload.email
                        }
                    });
                    if (emailExist) {
                        await this.database.userDetails.update({
                            where: {
                                user_id: session.owner_id,
                            },
                            data: {
                                email_registered: true
                            }
                        }).then(async () => {
                            await sessions.kill(session.id);
                            return $sendResponse.success(
                                {},
                                this.response,
                                apiMessageKeys.EMAIL_SUCCESSFULLY_CONFIRMED,
                                statusCodes.ACCEPTED
                            );
                        })
                    } else {
                        throw new Error(`There is no register data ${payload.email} for user_id:${session.owner_id}`);
                    }
                }).catch((error: any) => {
                    $logged(
                        `Email confirming progress failed:\n${error}`,
                        false,
                        {file: __filename.split('/src')[1]},
                        this.request.ip, true
                    );

                    return $sendResponse.failed(
                        {},
                        this.response,
                        apiMessageKeys.LINK_EXPIRED,
                        statusCodes.FORBIDDEN
                    )
                });

            }
        } catch (error: any) {
            $logged(
                `Email confirming progress failed:\n${error}`,
                false,
                {file: __filename.split('/src')[1]},
                this.request.ip, true
            );

            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            )
        }
    }
    public checkResetPasswordToken = async () => {
        try {
            // step #1: Check required fields
            const required_fields = validRequiredFields(['token'], this.reqQuery);
            if (required_fields.length) {
                return $sendResponse.failed(
                    {required_fields},
                    this.response,
                    apiMessageKeys.SOMETHING_WENT_WRONG,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            } else if (this.reqQuery.token) {
                const sessions = new TokenSession(this.request, this.response);
                // step #2 Verify reset password token
                await sessions.verify(
                    'reset_password',
                    this.reqQuery.token
                ).then(async (result) => {
                    const payload: any = result.payload;
                    const session: any = result.session;
                    // step #3: Check there is a user like that
                    const targetUser = await this.database.users.findFirst({
                        where: {
                            password: payload.key,
                            id: session.owner_id
                        }
                    });
                    if (targetUser) {
                        return $sendResponse.success(
                            {},
                            this.response,
                            apiMessageKeys.DONE,
                            statusCodes.ACCEPTED
                        );
                    } else {
                        //await sessions.kill(session.id);
                        throw new Error(`There is no registered user with user_id:${session.owner_id}`);
                    }
                }).catch((error: any) => {
                    $logged(
                        `Verify reset password progress failed:\n${error}`,
                        false,
                        {file: __filename.split('/src')[1]}
                    );

                    return $sendResponse.failed(
                        {},
                        this.response,
                        apiMessageKeys.LINK_EXPIRED,
                        statusCodes.FORBIDDEN
                    );
                });

            }
        } catch (error: any) {
            $logged(
                `Check reset password progress failed:\n${error}`,
                false,
                {file: __filename.split('/src')[1]}
            );

            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            )
        }
    }
    public login = async () => {
        const payload = trimObjectValues(this.reqBody);
        try {
            // step #1: Check required fields is filled
            const validationRequiredFields = validRequiredFields(['email', 'password'], payload);
            if (validationRequiredFields.length) {
                return $sendResponse.failed(
                    {required_fields: validationRequiredFields},
                    this.response,
                    apiMessageKeys.USER_LOGIN_PROGRESS_FAILED,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }

            // step #2: Validate email string
            if (!validateEmail(payload.email)) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.INVALID_EMAIL,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }

            // step #3: Validate password strength
            if (validatePasswordStrength(payload.password) < 2) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.INVALID_PASSWORD,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }

            // step #4: Check email is exist
            const existUser = await this.database.users.findFirst({where: {email: payload.email}});
            if (!existUser || !existUser.id) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.EMAIL_OR_PASSWORD_INCORRECT,
                    statusCodes.UNAUTHORIZED
                );
            }

            // step #5: Check hashed password
            const bcryptResult = await bcrypt.compare(payload.password, existUser.password);
            if (!bcryptResult) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.EMAIL_OR_PASSWORD_INCORRECT,
                    statusCodes.UNAUTHORIZED
                );
            }
            // step #6: Create access token
            const session = new TokenSession(this.request, this.response);
            const access_token = await session.create(
                existUser.id,
                'access_token',
                {user_id: existUser.id}
            );
            const refresh_token = await session.create(
                existUser.id,
                'refresh_token',
                {user_id: existUser.id, access_token_session: access_token.session_id}
            );
            $logged(`NEW LOGIN FROM USER_ID: ${existUser.id}`,
                true,
                {file: __filename.split('/src')[1]},
                this.request.ip, true);
            return $sendResponse.success(
                {
                    access_token: access_token.token,
                    refresh_token: refresh_token.token,
                    expires_in: access_token.expired_in
                },
                this.response,
                apiMessageKeys.USER_SUCCESSFULLY_LOGIN,
                statusCodes.OK
            );
        } catch (error: any) {
            $logged(
                `Login progress failed:\n${error}`,
                false,
                {file: __filename.split('/src')[1]},
                this.request.ip, true
            );
            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            )
        }
    }
    public signup = async () => {
        const payload = trimObjectValues(this.reqBody);
        const sessions = new TokenSession(this.request, this.response);
        try {
            // step #1: Check required fields is filled
            const validationRequiredFields = validRequiredFields(['email', 'fullname', 'password'], payload);
            if (validationRequiredFields.length) {
                return $sendResponse.failed(
                    {required_fields: validationRequiredFields},
                    this.response,
                    apiMessageKeys.USER_REGISTRATION_FAILED,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }

            // step #2: Validate email string
            if (!validateEmail(payload.email)) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.INVALID_EMAIL,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }

            // step #3: Check is email already exist
            const emailExist = await this.database.users.findFirst({
                where: {
                    email: payload.email
                }
            });

            if (emailExist) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.EMAIL_IS_EXIST,
                    statusCodes.CONFLICT
                );
            }

            // step #4: Validate password strength
            if (validatePasswordStrength(payload.password) < 2) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.INVALID_PASSWORD,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }

            // step #5: Validate fullname string
            if (!validateFullName(payload.fullname)) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.INVALID_FULLNAME,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }

            const hash_password = await bcrypt.hash(
                payload.password,
                Number(process.env.HASH_LIMIT) || 10
            );

            await this.database.users.create({
                data: {
                    fullname: payload.fullname,
                    email: payload.email,
                    password: hash_password,
                    register_date: moment().format('DD.MM.YYYY:HH:mm:ss'),
                    UserDetails: {
                        create: {
                            email_registered: false,
                            preferred_lang: payload.preferred_lang
                        }
                    }
                }
            }).then(async (result: any) => {
                const {token} = await sessions.create(
                    result.id,
                    'confirm_email',
                    {
                        email: result.email
                    });

                const appDomain: any = process.env.APP_BRAND_DOMAIN;
                const confirm_link: any = `www.${appDomain.toLowerCase()}/confirm_email?token=${token}`;

                const smtp = new SMTPController(this.request, this.response);
                const email = await smtp.sendEmailByUserId(result.id, 'noreply');
                
                await email?.confirmEmail({
                    confirm_link,
                    confirm_link_life_hour: TokenSession.tokenLifeHours.confirm_email
                }).then(() => {
                    $logged(
                        `\n🛎️ NEW USER REGISTERED "${result.fullname} | ${result.email}"\n`,
                        true,
                        {file: __filename.split('/src')[1], user_id: result.id},
                        this.request.ip,
                        true
                    );
    
                    return $sendResponse.success(
                        {},
                        this.response,
                        apiMessageKeys.USER_SUCCESSFULLY_REGISTERED,
                        statusCodes.CREATED,
                        {count: result.id}
                    );
                }).catch((error: any) => {
                    throw error;
                })
                
            }).catch((error: any) => {
                $logged(
                    `Registration progress failed\n${error}`,
                    false,
                    {file: __filename.split('/src')[1], payload},
                    this.request.ip,
                    true
                );

                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.USER_REGISTRATION_FAILED,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            })

        } catch (error: any) {
            $logged(
                `Registration progress failed:\n${error}`,
                false,
                {file: __filename.split('/src')[1]},
                this.request.ip,
                true
            );

            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            )
        }
    }
    public refreshToken = () => {
        this.response.send('refreshToken SERVICE')
    }
    public forgotPassword = async () => {
        try {
            // step #1: Check required field
            const required_fields = validRequiredFields(['email'], this.reqBody);
            if (required_fields.length) {
                return $sendResponse.failed(
                    {required_fields},
                    this.response,
                    apiMessageKeys.SOMETHING_WENT_WRONG,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }
            // step #2: Validate email string
            if (!validateEmail(this.reqBody.email)) {
                return $sendResponse.failed(
                    {required_fields},
                    this.response,
                    apiMessageKeys.INVALID_EMAIL,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }
            // step #3: Check email is exist on db
            const emailExist: any = await this.database.users.findFirst({
                where: {
                    email: this.reqBody.email
                },
                include: {
                    UserDetails: true
                }
            });
            if (!emailExist || !emailExist.UserDetails) {
                return $sendResponse.success(
                    {},
                    this.response,
                    apiMessageKeys.PASSWORD_RESET_LINK_WILL_SENT,
                    statusCodes.OK
                );
            }

            // step #4: Creat and send confirm link
            const sessions = new TokenSession(this.request, this.response);
            const {token} = await sessions.create(
                emailExist.id,
                'reset_password',
                {
                    key: emailExist.password
                }
            );
            const appDomain: any = process.env.APP_BRAND_DOMAIN;
            const reset_link = `www.${appDomain.toLowerCase()}/reset_password?token=${token}`;

            const smtp = new SMTPController(this.request, this.response);
            const email = await smtp.sendEmailByUserId(emailExist.id, 'noreply');

            await email?.resetPassword({
                reset_link,
                reset_link_life_hour: TokenSession.tokenLifeHours.reset_password,
            }).then(() => {
                $logged(
                    `🔑 Reset password request for email -> ${this.reqBody.email}`,
                    true,
                    {file: __filename.split('/src')[1], user_id: emailExist.id, email: this.reqBody.email},
                    this.request.ip,
                    true
                );
                return $sendResponse.success(
                    {},
                    this.response,
                    apiMessageKeys.PASSWORD_RESET_LINK_WILL_SENT,
                    statusCodes.OK
                );
            }).catch((error: any) => {
                throw error;
            })
        } catch (error: any) {
            $logged(
                `Forgot password progress failed:\n${error}`,
                false,
                {file: __filename.split('/src')[1]},
                this.request.ip,
                true
            );
            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            )
        }
    }
    public resetPassword = async () => {
        try {
            // step #1: Check required fields
            const required_fields = validRequiredFields(['new_password', 'token'], this.reqBody);
            if (required_fields.length) {
                return $sendResponse.failed(
                    {required_fields},
                    this.response,
                    apiMessageKeys.SOMETHING_WENT_WRONG,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }
            // step #2: Validate password strength
            if (validatePasswordStrength(this.reqBody.new_password) < 2) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.INVALID_PASSWORD,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }

            const sessions = new TokenSession(this.request, this.response);
            // step #3 Verify reset password token
            await sessions.verify(
                'reset_password',
                this.reqBody.token
            )
                .then(async (result) => {
                const payload: any = result.payload;
                const session: any = result.session;
                // step #3: Check there is a user like that
                const targetUser: any = await this.database.users.findFirst({
                    where: {
                        password: payload.key,
                        id: session.owner_id
                    },
                    include: {
                        UserDetails: true
                    }
                });
                if (targetUser) {
                    // this is make the link is one time reachable link
                    const hash_password = await bcrypt.hash(
                        this.reqBody.new_password,
                        Number(process.env.HASH_LIMIT) || 10
                    );
                    await this.database.users.update({
                        where: {
                            id: targetUser.id
                        },
                        data: {
                            password: hash_password
                        }
                    }).then(async () => {
                        $logged(
                            `🔐 Password changed for -> email: ${targetUser.email}`,
                            true,
                            {file: __filename.split('/src')[1], user_id: targetUser.id},
                            this.request.ip,
                            true
                        );
                        const smtp = new SMTPController(this.request, this.response);
                        const email = await smtp.sendEmailByUserId(targetUser.id, 'noreply');
                        await email?.passwordUpdated({
                            update_date: moment().format('YYYY-MM-DD HH:mm:ss'),
                            browser: this.request.useragent?.browser || '--',
                            os: this.request.useragent?.os || '--',
                            platform: this.request.useragent?.platform || '--',
                        }).then(() => {
                            return $sendResponse.success(
                                {},
                                this.response,
                                apiMessageKeys.PASSWORD_SUCCESSFULLY_CHANGED,
                                statusCodes.OK
                            );
                        }).catch((error: any) => {
                            throw error;
                        });
                    }).catch((error: any) => {
                        $logged(
                            `Password changing failed for.\n${error}`,
                            false,
                            {file: __filename.split('/src')[1], user_id: targetUser.id},
                            this.request.ip,
                            true
                        );
                        throw error;
                    }).finally(async () => await sessions.kill(session.id));
                } else {
                    throw new Error(`User cannot found at this moment`);
                }
            })
                .catch((error: any) => {
                $logged(
                    `Verify reset password progress failed:\n${error}`,
                    false,
                    {file: __filename.split('/src')[1]},
                );

                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.LINK_EXPIRED,
                    statusCodes.FORBIDDEN
                );
            });
        } catch (error: any) {
            $logged(
                `Check reset password progress failed:\n${error}`,
                false,
                {file: __filename.split('/src')[1]}
            );

            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            )
        }
    }
    public setPreferredLang = async () => {
        try {
            const authentication_result = JSON.parse(this.reqBody.authentication_result);
            const {user_id} = authentication_result.payload;
            const required_fields = validRequiredFields(['lang'], this.reqBody);
            if (required_fields.length) {
                return $sendResponse.failed(
                    {required_fields},
                    this.response,
                    apiMessageKeys.SOMETHING_WENT_WRONG,
                    statusCodes.UNPROCESSABLE_ENTITY
                )
            }
            const {lang} = this.reqBody;
            if (!available_email_langs.includes(lang)) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.SOMETHING_WENT_WRONG,
                    statusCodes.UNPROCESSABLE_ENTITY
                )
            }

            await this.database.userDetails.update({
                where: {
                    user_id,
                },
                data: {
                    preferred_lang: lang
                }
            })

            return $sendResponse.success({}, this.response);

        } catch (error: any) {
            $logged(
                `Set preferred language progress failed:\n${error}`,
                false,
                {file: __filename.split('/src')[1]}
            );
            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            )
        }
    }

    public editUser = async () => {
        try {
            const authentication_result = JSON.parse(this.reqBody.authentication_result);
            const { user_id } = authentication_result.payload;
            const body = this.reqBody;
            delete body.authentication_result;
            const fields = ['bio', 'birthday', 'fullname', 'phone'];
            const bodyFields = Object.keys(body);

            if (!bodyFields.length || !bodyFields.every((field) => fields.includes(field))) {
                return $sendResponse.failed({}, this.response, apiMessageKeys.INVALID_BODY, statusCodes.UNPROCESSABLE_ENTITY);
            }

            if(bodyFields.find(field => field == 'birthday')) {
                if (!validateBirthday(body['birthday'])) {
                    return $sendResponse.failed({}, this.response, apiMessageKeys.INVALID_BIRTHDAY, statusCodes.UNPROCESSABLE_ENTITY);
                }    

                body['birthday'] = new Date(body['birthday'])
            }

            if (bodyFields.find((field) => field == 'bio')) {
                if (!body['bio']) {
                    body['bio'] = '';
                }

                if (body['bio'].length > 500) {
                    return $sendResponse.failed({}, this.response, apiMessageKeys.INVALID_BRAND_BIO_SIZE, statusCodes.UNPROCESSABLE_ENTITY);
                }
            }

            if (bodyFields.find((field) => field == 'phone')) {
                if (!validatePhoneNumber(body['phone'])) {
                    return $sendResponse.failed({}, this.response, apiMessageKeys.INVALID_PHONE, statusCodes.UNPROCESSABLE_ENTITY);
                }

                // TODO: Send SMS verification code
            }

            if (bodyFields.find((field) => field == 'fullname')) {
                if (!validateFullName(body['fullname'])) {
                    return $sendResponse.failed({}, this.response, apiMessageKeys.INVALID_FULLNAME, statusCodes.UNPROCESSABLE_ENTITY);
                }
            }

            await this.database.userDetails.update({
                where: { user_id },
                data: {
                    bio: body['bio'], birthday: body['birthday'], phone: body['phone']
                }
            });

            await this.database.users.update({
                where: { id: user_id },
                data: { fullname: body['fullname'] }
            });

            return $sendResponse.success({}, this.response);

        } catch (error: any) {
            $logged(`Edit user progress failed:\n${error}`, false, { file: __filename.split('/src')[1] });

            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    public uploadProfilePhoto = async () => {
        try {
            const object_id = this.reqBody.object_id;

            if(!object_id) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.OBJECT_NOT_FOUND,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }

            const { user_id } = this.reqBody.authentication_result.payload;

            const oldObject = await this.database.objects.findFirst({
                where: { object_for: 'profile_photo', user_id, id: { not: object_id } }
            });

            const newObject = await this.database.objects.findUnique({
                where: { id: object_id }
            });

            if (!newObject) {
                $logged(`Object not found: ${object_id}`, false, { from: 'user/updateProfilePhoto', object_id });
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.SOMETHING_WENT_WRONG,
                    statusCodes.INTERNAL_SERVER_ERROR
                );
            }

            if(oldObject) {
                const oldPath = oldObject.path;
                this.cdn.deleteObject(oldPath);
                await this.database.objects.delete({
                    where: { id: oldObject.id }
                });
            }

            await this.database.userDetails.update({
                where: { user_id },
                data: { profile_photo_id: object_id }
            })

            $sendResponse.success(
                {
                    filename: newObject.name,
                    object_id
                },
                this.response
            );
        } catch (error) {
            $logged(
                `Object updating progress failed\n${error}`,
                false,
                { file: __filename.split('/src')[1], payload: this.reqBody },
                this.request.ip
            );
            return $sendResponse.failed(
                { error },
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    public deleteProfilePhoto = async () => {
        try {
            const authentication_result = JSON.parse(this.reqBody.authentication_result);
            const { user_id } = authentication_result.payload;
            
            const details = await this.database.userDetails.findFirst({
                where: { user_id },
                select: { profile_photo_id: true }
            });

            if(!details) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.USER_NOT_FOUND,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }

            if(details.profile_photo_id) {
                const object = await this.database.objects.findUnique({
                    where: { id: details.profile_photo_id }
                });

                if(object) {
                    this.cdn.deleteObject(object.path);
                    await this.database.objects.delete({
                        where: { id: object.id }
                    });
                }

                await this.database.userDetails.update({
                    where: { user_id },
                    data: { profile_photo_id: null }
                });
            }

            return $sendResponse.success({}, this.response);

            
        } catch (error) {
            $logged(
                `Object deleting progress failed\n${error}`,
                false,
                { file: __filename.split('/src')[1], payload: this.reqBody },
                this.request.ip
            );
            return $sendResponse.failed(
                { error },
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    public changePassword = async () => {
        try {
            const authentication_result = JSON.parse(this.reqBody.authentication_result);
            const { user_id } = authentication_result.payload;
            const required_fields = validRequiredFields(['old_password', 'new_password'], this.reqBody);
            if (required_fields.length) {
                return $sendResponse.failed(
                    {required_fields},
                    this.response,
                    apiMessageKeys.SOMETHING_WENT_WRONG,
                    statusCodes.UNPROCESSABLE_ENTITY
                )
            }

            const existUser = await this.database.users.findFirst({
                where: { id: user_id }, 
                include: { UserDetails: true }
            });

            if(!existUser) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.USER_NOT_FOUND,
                    statusCodes.NOT_FOUND
                );
            }

            const payload = this.reqBody;
            const bcryptResult = await bcrypt.compare(payload.old_password, existUser.password);
            if (!bcryptResult) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.OLD_PASSWORD_INCORRECT,
                    statusCodes.UNAUTHORIZED
                );
            }

            if (payload.old_password === payload.new_password) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.PASSWORDS_ARE_SAME,
                    statusCodes.CONFLICT
                );
            }

            if (validatePasswordStrength(payload.new_password) < 2) {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.INVALID_PASSWORD,
                    statusCodes.UNPROCESSABLE_ENTITY
                );
            }

            const hash_password = await bcrypt.hash(
                payload.new_password,
                Number(process.env.HASH_LIMIT) || 10
            );

            await this.database.users
                .update({
                    where: { id: user_id },
                    data: { password: hash_password }
                })
                .then(async () => {
                    $logged(
                        `🔐 Password changed for -> email: ${existUser.email}`,
                        true,
                        { file: __filename.split('/src')[1], user_id: existUser.id },
                        this.request.ip,
                        true
                    );
                    const smtp = new SMTPController(this.request, this.response);
                    const email = await smtp.sendEmailByUserId(existUser.id, 'noreply');
                    
                    await email?.passwordUpdated({
                        update_date: moment().format('YYYY-MM-DD HH:mm:ss'),
                        browser: this.request.useragent?.browser || '--',
                        os: this.request.useragent?.os || '--',
                        platform: this.request.useragent?.platform || '--'
                    }).then(() => {
                        return $sendResponse.success(
                            {},
                            this.response,
                            apiMessageKeys.PASSWORD_SUCCESSFULLY_CHANGED,
                            statusCodes.OK
                        );
                    }).catch((error: any) => {
                        throw error;
                    });
                })
                .catch((error: any) => {
                    $logged(
                        `Password changing failed for.\n${error}`,
                        false,
                        { file: __filename.split('/src')[1], user_id: existUser.id },
                        this.request.ip,
                        true
                    );
                    throw error;
                })

        } catch (error: any) {
            $logged(
                `Change password progress failed:\n${error}`,
                false,
                {file: __filename.split('/src')[1]}
            );
            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            )
        }
    }
}

export default $callToAction(UserController)
