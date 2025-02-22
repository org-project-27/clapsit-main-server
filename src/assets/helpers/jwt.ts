import jwt, {Secret} from 'jsonwebtoken';
import {config} from 'dotenv';

config();

// @ts-ignore
const JWT_ACCESS_TOKEN_SECRET: Secret = process.env.ACCESS_TOKEN_SECRET;
const JWT_ACCESS_TOKEN_LIFE: number = Number(process.env.ACCESS_TOKEN_LIFE);

export const $createTokenSession = () => {

}