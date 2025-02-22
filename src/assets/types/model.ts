import { Url } from "node:url"

export interface DefaultModelClass {
    model: any,
    methods: any,
    includes: any,
    requiredFields: any,
}

export type BrandsDataType = {
    name: string,
    website: string,
    logo: string,
    bio: string,
}

export type PlaceListDataType = {
    name: string,
    type: number,
    address: string,
    city: string,
    state: string,
    zip_code: string,
    phone: string,
    email: string,
    opening_hours: string,
}