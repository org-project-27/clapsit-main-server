import { Controller } from '#types/controller';
import { Request, Response } from 'express';
import { $callToAction, $sendResponse } from '#helpers/methods';
import apiMessageKeys from '~/assets/constants/apiMessageKeys';
import statusCodes from '~/assets/constants/statusCodes';
import { $logged } from '~/assets/helpers/logHelpers';
import pth from 'path';

class ObjectController extends Controller {
    constructor(request: Request, response: Response) {
        super(request, response);
        this.actions['GET']['/'] = this.findObject;
    }
    public findObject = async () => {
        try {
            const { id } = this.request.params;
            if (!id) {
                return $sendResponse.failed({}, this.response, apiMessageKeys.PARAM_REQUIRED, statusCodes.BAD_REQUEST);
            }

            let object = await this.database.objects.findUnique({
                where: { id: id }
            });

            if (!object) {
                return $sendResponse.failed({}, this.response, apiMessageKeys.OBJECT_NOT_FOUND, statusCodes.NOT_FOUND);
            }

            let path = object.path;
            let file = this.cdn.getObject(path);

            if (!file) {
                $logged(`File not found: ${path}`, false, { from: 'cdn', file: path });
                return $sendResponse.failed({}, this.response, apiMessageKeys.OBJECT_NOT_FOUND, statusCodes.NOT_FOUND);
            }

            return this.response.sendFile(pth.resolve(file));
        } catch (error) {
            $logged(
                `Object finding progress failed\n${error}`,
                false,
                { file: __filename.split('/src')[1], payload: this.request.params },
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

export default $callToAction(ObjectController);
