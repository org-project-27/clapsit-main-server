import e from "express";
import moment from "moment";

export function validateUrl(URL = '') {
    const urlPattern = /^(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9]+(?:\.[a-zA-Z]{2,})+(?:\/.*)?$/;
    return urlPattern.test(URL);
}

export function validateEmail(input = '') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(input);
}

export function validateFullName(input = '') {
    const fullNamePattern = /^[\p{L}\s']+$/u;
    return fullNamePattern.test(input) && input.length > 2;
}

export function validateLength(input = '', limit = {min: 2, max: 255}) {
    if(input && limit.max > limit.min){
        if(input.length < limit.min){
            return false
        } 
        return input.length < limit.max;

    }
    return null;
}

export function validateBirthday(input = '') {
    if (input) {
        if(!moment(input, 'YYYY-MM-DD').isValid()) return false;

        const ageLimit = 18;
        const [inputYear, inputMonth, inputDay] = input.split('-').map(Number);
        const [year, month, day] = moment().format('YYYY-MM-DD').split('-').map(Number);

        if (year - inputYear < ageLimit) {
            return false;
        } else if(year - inputYear == ageLimit) {
            if(month < inputMonth) {
                return false;
            } else if(month == inputMonth) {
                return day >= inputDay;
            } else {
                return true;
            }
        } else {
            return true;
        }
    } else { return false }
}

export function validRequiredFields(requiredFields: string[], payload: any){
    return (requiredFields.filter((item: string) => !payload[item]));
}

export function validatePhoneNumber(input: string) {
    input = input.replaceAll(' ', '').trim();
    var regex = /^(\+\d{1,3})?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
    return (input.length >= 9 && input.length <= 15 && regex.test(input));
}

export function validatePasswordStrength(passwordString: any) {
    let strength = 0;
    if(passwordString){
        // Criteria for password strength
        const hasLowercase = /[a-z]/.test(passwordString);
        const hasUppercase = /[A-Z]/.test(passwordString);
        const hasNumbers = /\d/.test(passwordString);
        const hasSpecialChars = /\W/.test(passwordString);
        const isLongEnough = passwordString.length >= 8;

        // Increase strength for each met criteria
        if (hasLowercase) strength++;
        if (hasUppercase) strength++;
        if (hasNumbers) strength++;
        if (hasSpecialChars) strength++;
        if (isLongEnough) strength++;

        // Classify strength
        if (strength <= 2) {
            return 1;
        } else if (strength <= 4) {
            return 2;
        } else {
            return 3;
        }
    }
    return 0;
}

export function validatePlaceName(placeName: string | any){
    if (!validateLength(placeName, { min: 2, max: 255 })) {
        return false;
    }
    // #TODO: Add more validation
    return true;
}

export function validateZipCode(zip_code: string | any) {
    if (!validateLength(zip_code, { min: 3, max: 20 })) {
        return false;
    }
    // #TODO: Add more validation
    return true;
}

export function validateAddress(address: string | any) {
    if (!validateLength(address, { min: 3, max: 255 })) {
        return false;
    }
    // #TODO: Add more validation
    return true;
}

export function validateCity(city: string | any) {
    if (!validateLength(city, { min: 3, max: 100 })) {
        return false;
    }
    // #TODO: Add more validation
    return true;
}

export function validateState(state: string | any) {
    if (!validateLength(state, { min: 3, max: 100 })) {
        return false;
    }
    // #TODO: Add more validation
    return true;
}

export function validatePhone(phone: string | any) {
    if (!validateLength(phone, { min: 4, max: 20 })) {
        return false;
    }
    // #TODO: Add more validation
    return true;
}

export function validateOpeningHours(hours: string | any) {
    const pattern = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;
    const match = hours.match(pattern);
    
    if (!match) {
        return false;
    }

    const startHour = parseInt(match[1], 10);
    const startMinute = parseInt(match[2], 10);
    const endHour = parseInt(match[3], 10);
    const endMinute = parseInt(match[4], 10);

    if (startHour < endHour || (startHour === endHour && startMinute < endMinute)) {
        return true;
    }
    return false;
}

export function validateBrandName(brandName: string | any){
    if (!validateLength(brandName, { min: 2, max: 255 })) {
        return false;
    }
    // #TODO: Add more validation
    return true;
}