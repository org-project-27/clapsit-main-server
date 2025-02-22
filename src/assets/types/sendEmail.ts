export type PasswordUpdatedEmailPayloadTypes = {
    full_name: string | null,
    update_date: string | null,
    browser: string | null,
    os: string | null,
    platform: string | null
}

export type ConfirmEmailEmailPayloadTypes = {
    full_name: string | null,
    confirm_link: string | null,
    confirm_link_life_hour: number | null
}

export type ResetPasswordEmailPayloadTypes = {
    full_name: string | null,
    reset_link: string | null,
    reset_link_life_hour: number | null
}