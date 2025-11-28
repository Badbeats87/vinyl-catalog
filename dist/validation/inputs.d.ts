/**
 * Input validation utilities for releases and pricing policies
 */
export declare class ValidationError extends Error {
    constructor(message: string);
}
/**
 * Release Input Validation
 */
export declare function validateReleaseTitle(title: string | undefined): string;
export declare function validateArtistName(artist: string | undefined): string;
export declare function validateBarcode(barcode: string | undefined): string | undefined;
export declare function validateReleaseYear(year: number | undefined): number | undefined;
export declare function validateUrl(url: string | undefined, fieldName?: string): string | undefined;
/**
 * Pricing Policy Input Validation
 */
export declare function validatePolicyName(name: string | undefined): string;
export declare function validateScope(scope: string | undefined): 'global' | 'genre' | 'release';
export declare function validatePercentage(value: number | undefined, min: number, max: number, fieldName: string): number | undefined;
export declare function validateWeight(value: number | undefined, fieldName?: string): number | undefined;
export declare function validateWeightSum(mediaWeight: number, sleeveWeight: number, tolerance?: number): void;
export declare function validatePrice(value: number | undefined, fieldName?: string): number | undefined;
export declare function validateDays(value: number | undefined, fieldName?: string): number | undefined;
/**
 * Generic query string validation
 */
export declare function validateSearchQuery(query: string, minLength?: number, maxLength?: number): string;
export declare function validateId(id: string | undefined, fieldName?: string): string;
export declare function validateLimit(limit: number | undefined, max?: number): number;
export declare function validateOffset(offset: number | undefined): number;
/**
 * Email validation
 */
export declare function validateEmail(email: string | undefined): string;
export declare function validatePhone(phone: string | undefined): string | undefined;
export declare function validateQuantity(quantity: number | undefined, fieldName?: string): number;
//# sourceMappingURL=inputs.d.ts.map