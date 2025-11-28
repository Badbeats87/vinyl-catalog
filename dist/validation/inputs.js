/**
 * Input validation utilities for releases and pricing policies
 */
export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
/**
 * Release Input Validation
 */
export function validateReleaseTitle(title) {
    if (!title || typeof title !== 'string') {
        throw new ValidationError('Release title is required and must be a string');
    }
    const trimmed = title.trim();
    if (trimmed.length === 0) {
        throw new ValidationError('Release title cannot be empty');
    }
    if (trimmed.length > 255) {
        throw new ValidationError('Release title must be 255 characters or less');
    }
    return trimmed;
}
export function validateArtistName(artist) {
    if (!artist || typeof artist !== 'string') {
        throw new ValidationError('Artist name is required and must be a string');
    }
    const trimmed = artist.trim();
    if (trimmed.length === 0) {
        throw new ValidationError('Artist name cannot be empty');
    }
    if (trimmed.length > 255) {
        throw new ValidationError('Artist name must be 255 characters or less');
    }
    return trimmed;
}
export function validateBarcode(barcode) {
    if (!barcode) {
        return undefined;
    }
    if (typeof barcode !== 'string') {
        throw new ValidationError('Barcode must be a string');
    }
    const trimmed = barcode.trim();
    if (trimmed.length === 0) {
        return undefined;
    }
    if (trimmed.length > 20) {
        throw new ValidationError('Barcode must be 20 characters or less');
    }
    // Validate barcode format (UPC/EAN: 8, 12, or 13 digits)
    if (!/^\d{8}$|^\d{12}$|^\d{13}$|^[A-Z0-9\-]+$/.test(trimmed)) {
        throw new ValidationError('Barcode must be a valid UPC/EAN or alphanumeric format');
    }
    return trimmed;
}
export function validateReleaseYear(year) {
    if (year === undefined || year === null) {
        return undefined;
    }
    if (typeof year !== 'number') {
        throw new ValidationError('Release year must be a number');
    }
    if (!Number.isInteger(year)) {
        throw new ValidationError('Release year must be an integer');
    }
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 1) {
        throw new ValidationError(`Release year must be between 1900 and ${currentYear + 1}`);
    }
    return year;
}
export function validateUrl(url, fieldName = 'URL') {
    if (!url) {
        return undefined;
    }
    if (typeof url !== 'string') {
        throw new ValidationError(`${fieldName} must be a string`);
    }
    const trimmed = url.trim();
    if (trimmed.length === 0) {
        return undefined;
    }
    try {
        new URL(trimmed);
    }
    catch {
        throw new ValidationError(`${fieldName} must be a valid URL`);
    }
    return trimmed;
}
/**
 * Pricing Policy Input Validation
 */
export function validatePolicyName(name) {
    if (!name || typeof name !== 'string') {
        throw new ValidationError('Policy name is required and must be a string');
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        throw new ValidationError('Policy name cannot be empty');
    }
    if (trimmed.length > 255) {
        throw new ValidationError('Policy name must be 255 characters or less');
    }
    return trimmed;
}
export function validateScope(scope) {
    if (!scope || !['global', 'genre', 'release'].includes(scope)) {
        throw new ValidationError('Policy scope must be one of: global, genre, release');
    }
    return scope;
}
export function validatePercentage(value, min, max, fieldName) {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value !== 'number') {
        throw new ValidationError(`${fieldName} must be a number`);
    }
    if (value < min || value > max) {
        throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
    }
    return value;
}
export function validateWeight(value, fieldName = 'Weight') {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value !== 'number') {
        throw new ValidationError(`${fieldName} must be a number`);
    }
    if (value < 0 || value > 1) {
        throw new ValidationError(`${fieldName} must be between 0 and 1`);
    }
    return value;
}
export function validateWeightSum(mediaWeight, sleeveWeight, tolerance = 0.001) {
    const sum = mediaWeight + sleeveWeight;
    if (Math.abs(sum - 1.0) > tolerance) {
        throw new ValidationError(`Media weight (${mediaWeight}) + sleeve weight (${sleeveWeight}) must equal 1.0`);
    }
}
export function validatePrice(value, fieldName = 'Price') {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value !== 'number') {
        throw new ValidationError(`${fieldName} must be a number`);
    }
    if (value < 0) {
        throw new ValidationError(`${fieldName} must be positive`);
    }
    if (value > 1000000) {
        throw new ValidationError(`${fieldName} must be less than $1,000,000`);
    }
    return value;
}
export function validateDays(value, fieldName = 'Days') {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new ValidationError(`${fieldName} must be an integer`);
    }
    if (value < 1 || value > 365) {
        throw new ValidationError(`${fieldName} must be between 1 and 365`);
    }
    return value;
}
/**
 * Generic query string validation
 */
export function validateSearchQuery(query, minLength = 1, maxLength = 100) {
    if (typeof query !== 'string') {
        throw new ValidationError('Search query must be a string');
    }
    const trimmed = query.trim();
    if (trimmed.length < minLength) {
        throw new ValidationError(`Search query must be at least ${minLength} character(s)`);
    }
    if (trimmed.length > maxLength) {
        throw new ValidationError(`Search query must not exceed ${maxLength} characters`);
    }
    return trimmed;
}
export function validateId(id, fieldName = 'ID') {
    if (!id || typeof id !== 'string') {
        throw new ValidationError(`${fieldName} is required and must be a string`);
    }
    const trimmed = id.trim();
    if (trimmed.length === 0) {
        throw new ValidationError(`${fieldName} cannot be empty`);
    }
    return trimmed;
}
export function validateLimit(limit, max = 100) {
    const l = limit ?? 50;
    if (typeof l !== 'number' || !Number.isInteger(l)) {
        throw new ValidationError('Limit must be an integer');
    }
    if (l < 1 || l > max) {
        throw new ValidationError(`Limit must be between 1 and ${max}`);
    }
    return l;
}
export function validateOffset(offset) {
    const o = offset ?? 0;
    if (typeof o !== 'number' || !Number.isInteger(o)) {
        throw new ValidationError('Offset must be an integer');
    }
    if (o < 0) {
        throw new ValidationError('Offset must be non-negative');
    }
    return o;
}
/**
 * Email validation
 */
export function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        throw new ValidationError('Email is required and must be a string');
    }
    const trimmed = email.trim();
    if (trimmed.length === 0) {
        throw new ValidationError('Email cannot be empty');
    }
    if (trimmed.length > 255) {
        throw new ValidationError('Email must be 255 characters or less');
    }
    // RFC 5322 simplified email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
        throw new ValidationError('Email must be a valid email address');
    }
    return trimmed;
}
export function validatePhone(phone) {
    if (!phone) {
        return undefined;
    }
    if (typeof phone !== 'string') {
        throw new ValidationError('Phone must be a string');
    }
    const trimmed = phone.trim();
    if (trimmed.length === 0) {
        return undefined;
    }
    if (trimmed.length > 20) {
        throw new ValidationError('Phone must be 20 characters or less');
    }
    // Allow various phone formats: +1-234-567-8900, 1234567890, +1 (234) 567-8900, etc.
    if (!/^[\d\s\-\+\(\)]+$/.test(trimmed)) {
        throw new ValidationError('Phone must contain only digits, spaces, hyphens, parentheses, or plus sign');
    }
    return trimmed;
}
export function validateQuantity(quantity, fieldName = 'Quantity') {
    if (quantity === undefined || quantity === null) {
        throw new ValidationError(`${fieldName} is required`);
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
        throw new ValidationError(`${fieldName} must be an integer`);
    }
    if (quantity < 1 || quantity > 1000) {
        throw new ValidationError(`${fieldName} must be between 1 and 1000`);
    }
    return quantity;
}
//# sourceMappingURL=inputs.js.map