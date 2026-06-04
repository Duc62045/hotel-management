/**
 * Date utility helper functions for HotelApp
 */

// Regex checking DD/MM/YYYY format
export const isValidDmyFormat = (str) => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    return regex.test(str);
};

// Parses DD/MM/YYYY string to local Date object (at 00:00:00)
export const parseDmy = (str) => {
    if (!str || !isValidDmyFormat(str)) return null;
    const parts = str.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS Month is 0-indexed
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    
    const dateObj = new Date(year, month, day);
    // Safety check for invalid dates like 31/02
    if (
        dateObj.getFullYear() !== year ||
        dateObj.getMonth() !== month ||
        dateObj.getDate() !== day
    ) {
        return null;
    }
    return dateObj;
};

// Converts DD/MM/YYYY string to YYYY-MM-DD for backend APIs
export const dmyToYmd = (str) => {
    const dateObj = parseDmy(str);
    if (!dateObj) return '';
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Validate check-in and check-out dates
// Rules:
// 1. Must be in DD/MM/YYYY format
// 2. Check-in must be today or in the future
// 3. Check-out must be after check-in
// 4. Must not be more than 60 days (2 months) from today
export const validateBookingDates = (checkInDmy, checkOutDmy) => {
    if (!checkInDmy || !checkOutDmy) {
        return { valid: false, error: 'Vui lòng điền đầy đủ ngày nhận và ngày trả phòng.' };
    }

    if (!isValidDmyFormat(checkInDmy)) {
        return { valid: false, error: 'Ngày nhận phòng phải có định dạng DD/MM/YYYY (ví dụ: 04/06/2026).' };
    }
    if (!isValidDmyFormat(checkOutDmy)) {
        return { valid: false, error: 'Ngày trả phòng phải có định dạng DD/MM/YYYY (ví dụ: 05/06/2026).' };
    }

    const checkInDate = parseDmy(checkInDmy);
    const checkOutDate = parseDmy(checkOutDmy);

    if (!checkInDate) {
        return { valid: false, error: 'Ngày nhận phòng không hợp lệ.' };
    }
    if (!checkOutDate) {
        return { valid: false, error: 'Ngày trả phòng không hợp lệ.' };
    }

    if (checkOutDate <= checkInDate) {
        return { valid: false, error: 'Ngày trả phòng phải sau ngày nhận phòng.' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
        return { valid: false, error: 'Ngày nhận phòng không thể ở quá khứ.' };
    }

    // 60 days limit (2 months)
    const maxDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    if (checkInDate > maxDate) {
        return { valid: false, error: 'Không thể đặt phòng xa quá 2 tháng kể từ hôm nay.' };
    }
    if (checkOutDate > maxDate) {
        return { valid: false, error: 'Ngày trả phòng không được xa quá 2 tháng kể từ hôm nay.' };
    }

    return { valid: true };
};
