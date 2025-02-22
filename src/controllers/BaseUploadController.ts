import { Controller } from '#types/controller';
import { $logged } from '~/assets/helpers/logHelpers';
import { Request, Response, NextFunction } from 'express';
import { $callToAction, $sendResponse } from '#helpers/methods';
import apiMessageKeys from '~/assets/constants/apiMessageKeys';
import statusCodes from '#assets/constants/statusCodes';

class BaseUploadController extends Controller {
    constructor(request: Request, response: Response) {
        super(request, response);
        this.actions['POST']['/upload'] = this.upload;
        this.actions['PUT']['/update/:id'] = this.update;
        this.actions['DELETE']['/delete/:id'] = this.delete;
    }

    public upload = async () => {
        try {
            const object_id = this.reqBody.object_id;
            if (!object_id) {
                return $sendResponse.failed(
                    {
                        requiredField: ['file']
                    },
                    this.response,
                    apiMessageKeys.SOMETHING_WENT_WRONG,
                    statusCodes.INTERNAL_SERVER_ERROR
                );
            }
            const object = await this.database.objects.findUnique({
                where: { id: object_id }
            });

            if (!object) {
                $logged(`Object not found: ${object_id}`, false, { from: 'uploader/upload', object_id });
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.SOMETHING_WENT_WRONG,
                    statusCodes.INTERNAL_SERVER_ERROR
                );
            }

            $sendResponse.success(
                {
                    filename: object.name,      
                    object_id
                },
                this.response
            );
        } catch (error) {
            $logged(
                `Object uploading progress failed\n${error}`,
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
    };

    public update = async ({ params }: { params: Record<string, any> }) => {
        try {
            const id = params.id;
            const object_id = this.reqBody.object_id;
            const { user_id } = this.reqBody.authentication_result.payload;

            if (!id) {
                $logged(`Object not found: ${object_id}`, false, { from: 'upload/update', object_id });
                return $sendResponse.failed({}, this.response, apiMessageKeys.PARAM_REQUIRED, statusCodes.BAD_REQUEST);
            }

            const oldObject = await this.database.objects.findUnique({
                where: { id, user_id }
            });

            if (!oldObject) {
                $logged(`Object not found: ${id}`, false, { from: 'upload/update', object_id });
                return $sendResponse.failed({}, this.response, apiMessageKeys.OBJECT_NOT_FOUND, statusCodes.NOT_FOUND);
            }

            const newObject = await this.database.objects.findUnique({
                where: { id: object_id }
            });

            if (!newObject) {
                $logged(`Object not found: ${object_id}`, false, { from: 'upload/update', object_id });
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.SOMETHING_WENT_WRONG,
                    statusCodes.INTERNAL_SERVER_ERROR
                );
            }

            const oldPath = oldObject.path;
            this.cdn.deleteObject(oldPath);
            await this.database.objects.delete({
                where: { id }
            });

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
    };

    public delete = async ({ params }: { params: Record<string, any> }) => {
        try {
            const id = params.id;
            const { user_id } = JSON.parse(this.reqBody.authentication_result);

            if (!id) {
                $logged(`Object not found: ${id}`, false, { from: 'uploader/delete', id });
                return $sendResponse.failed({}, this.response, apiMessageKeys.PARAM_REQUIRED, statusCodes.BAD_REQUEST);
            }

            const object = await this.database.objects.findUnique({
                where: { id, user_id }
            });

            if (!object) {
                $logged(`Object not found: ${id}`, false, { from: 'upload', id });
                return $sendResponse.failed({}, this.response, apiMessageKeys.OBJECT_NOT_FOUND, statusCodes.NOT_FOUND);
            }

            const path = object.path;
            this.cdn.deleteObject(path);
            await this.database.objects.delete({
                where: { id }
            });

            $sendResponse.success({}, this.response);
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
    };
}

export default $callToAction(BaseUploadController);
