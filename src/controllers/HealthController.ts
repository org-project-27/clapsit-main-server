import { $callToAction, $sendResponse } from "~/assets/helpers/methods";
import { Controller } from "~/assets/types/controller"
import {Request, Response} from 'express';
import { $logged } from "~/assets/helpers/logHelpers";
import apiMessageKeys from "~/assets/constants/apiMessageKeys";
import statusCodes from "~/assets/constants/statusCodes";

class HealthController extends Controller {
    constructor(request: Request, response: Response) {
        super(request, response);
        this.actions['GET']['/'] = this.healthCheck;
    }

    healthCheck = async () => {
        try {
            const availabelitySwitch = true; // #TODO: Add your health check logic here
            const isDataBaseAvailable = await this.database.$queryRaw`SELECT 1`;
            if(availabelitySwitch && isDataBaseAvailable){
                $logged(
                    `Health check: Success, Server is available`,
                    true,
                    {file: __filename.split('/src')[1]},
                    this.request.ip,
                    false
                );

                return $sendResponse.success(
                    {
                        timestamp: new Date(),
                    },
                    this.response,
                    apiMessageKeys.DONE,
                    statusCodes.OK
                );
            } else {
                $logged(
                    `Health check: Failed, Server is not available now`,
                    false,
                    {file: __filename.split('/src')[1]},
                    this.request.ip,
                    false
                );
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.SOMETHING_WENT_WRONG,
                    statusCodes.SERVICE_UNAVAILABLE
                );
            }
        } catch(error){
            $logged(
                `Health check: Error, ${error}`,
                false,
                {file: __filename.split('/src')[1]},
                this.request.ip,
                true
            );
            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.SERVICE_UNAVAILABLE
            );
        }
    }
}

export default $callToAction(HealthController);
