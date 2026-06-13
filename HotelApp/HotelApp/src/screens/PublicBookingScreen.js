import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ScrollView, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import apiClient from '../api/apiClient';

export default function PublicBookingScreen({ route, navigation }) {
    const { room } = route.params;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const toDateStr = (d) => d.toISOString().split('T')[0];

    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [checkIn, setCheckIn] = useState(toDateStr(today));
    const [checkOut, setCheckOut] = useState(toDateStr(tomorrow));
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null); // booking result

    const calcNights = () => {
        const d1 = new Date(checkIn);
        const d2 = new Date(checkOut);
        const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    };

    const calcTotal = () => calcNights() * (room.price_per_night || 0);

    const formatMoney = (v) => v.toLocaleString('vi-VN') + ' đ';

    const handleBook = async () => {
        if (!fullName.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên.');
        if (!phone.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại.');
        if (!email.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập email.');
        if (calcNights() <= 0) return Alert.alert('Ngày không hợp lệ', 'Ngày trả phòng phải sau ngày nhận.');

        setLoading(true);
        try {
            const res = await apiClient.post('/public/bookings', {
                full_name: fullName.trim(),
                phone: phone.trim(),
                email: email.trim(),
                room_id: room.id,
                check_in_date: checkIn,
                check_out_date: checkOut,
                note: note.trim() || null,
            });
            setSuccess(res.data);
        } catch (err) {
            const detail = err.response?.data?.detail || 'Không thể đặt phòng. Vui lòng thử lại.';
            Alert.alert('Lỗi đặt phòng', detail);
        } finally {
            setLoading(false);
        }
    };

    // ----- Success Screen -----
    if (success) {
        return (
            <View style={styles.successContainer}>
                <Text style={styles.successIcon}>🎉</Text>
                <Text style={styles.successTitle}>Đặt phòng thành công!</Text>
                <Text style={styles.successMsg}>{success.message}</Text>

                <View style={styles.receiptBox}>
                    <Row label="Mã đặt phòng" value={`#${success.booking_id}`} bold />
                    <Row label="Phòng" value={`${success.room_number} (${success.room_type})`} />
                    <Row label="Khách" value={success.full_name} />
                    <Row label="SĐT" value={success.phone} />
                    <Row label="Email" value={success.email} />
                    <Row label="Nhận phòng" value={success.check_in_date} />
                    <Row label="Trả phòng" value={success.check_out_date} />
                    <Row label="Số đêm" value={`${success.num_nights} đêm`} />
                    <Row label="Tổng tiền" value={formatMoney(success.total_price)} bold highlight />
                </View>

                <Text style={styles.noteSuccess}>
                    💡 Lưu mã đặt phòng này để tra cứu hoặc liên hệ lễ tân.
                </Text>

                <TouchableOpacity
                    style={styles.homeBtn}
                    onPress={() => navigation.navigate('Landing')}
                >
                    <Text style={styles.homeBtnText}>← Về trang chủ</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ----- Booking Form -----
    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backBtnText}>← Quay lại</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Đặt phòng</Text>
                </View>

                {/* Room Summary */}
                <View style={styles.roomSummary}>
                    <Text style={styles.roomSummaryTitle}>🛏️ Phòng {room.room_number}</Text>
                    <Text style={styles.roomSummaryType}>{room.type_name}</Text>
                    <Text style={styles.roomSummaryPrice}>{formatMoney(room.price_per_night)} / đêm</Text>
                    {room.description ? (
                        <Text style={styles.roomSummaryDesc}>{room.description}</Text>
                    ) : null}
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>

                    <Field label="Họ và tên *" value={fullName} onChange={setFullName} placeholder="Nguyễn Văn A" />
                    <Field label="Số điện thoại *" value={phone} onChange={setPhone} placeholder="0901234567" keyboardType="phone-pad" />
                    <Field label="Email *" value={email} onChange={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />

                    <Text style={styles.sectionTitle}>Ngày đặt phòng</Text>

                    <Field
                        label="Ngày nhận phòng (YYYY-MM-DD) *"
                        value={checkIn}
                        onChange={setCheckIn}
                        placeholder="2025-06-15"
                        keyboardType="numbers-and-punctuation"
                    />
                    <Field
                        label="Ngày trả phòng (YYYY-MM-DD) *"
                        value={checkOut}
                        onChange={setCheckOut}
                        placeholder="2025-06-17"
                        keyboardType="numbers-and-punctuation"
                    />

                    {calcNights() > 0 && (
                        <View style={styles.pricePreview}>
                            <Text style={styles.pricePreviewText}>
                                🌙 {calcNights()} đêm  ×  {formatMoney(room.price_per_night)}
                            </Text>
                            <Text style={styles.pricePreviewTotal}>
                                Tổng: {formatMoney(calcTotal())}
                            </Text>
                        </View>
                    )}

                    <Field label="Ghi chú (tùy chọn)" value={note} onChange={setNote} placeholder="Yêu cầu đặc biệt..." multiline />
                </View>

                {/* Submit */}
                <View style={styles.submitArea}>
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleBook}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitBtnText}>✅ Xác nhận đặt phòng</Text>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.privacyNote}>
                        🔒 Thông tin của bạn được bảo mật và chỉ dùng cho việc đặt phòng.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// Reusable Field component
function Field({ label, value, onChange, placeholder, keyboardType, autoCapitalize, multiline }) {
    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={[styles.input, multiline && styles.inputMulti]}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="#9ca3af"
                keyboardType={keyboardType || 'default'}
                autoCapitalize={autoCapitalize || 'words'}
                multiline={!!multiline}
                numberOfLines={multiline ? 3 : 1}
            />
        </View>
    );
}

// Receipt Row
function Row({ label, value, bold, highlight }) {
    return (
        <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>{label}</Text>
            <Text style={[
                styles.receiptValue,
                bold && styles.receiptBold,
                highlight && styles.receiptHighlight,
            ]}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4ff' },
    header: {
        backgroundColor: '#1a1a3e',
        paddingTop: 48,
        paddingBottom: 18,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    backBtn: {},
    backBtnText: { color: '#a5b4fc', fontSize: 14, fontWeight: '600' },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    roomSummary: {
        backgroundColor: '#4f46e5',
        margin: 16,
        borderRadius: 16,
        padding: 20,
    },
    roomSummaryTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    roomSummaryType: { color: '#c7d2fe', fontSize: 14, marginTop: 4 },
    roomSummaryPrice: { color: '#fde68a', fontSize: 18, fontWeight: 'bold', marginTop: 8 },
    roomSummaryDesc: { color: '#e0e7ff', fontSize: 13, marginTop: 6, lineHeight: 18 },
    form: { paddingHorizontal: 16 },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a3e',
        marginTop: 20,
        marginBottom: 12,
    },
    fieldWrap: { marginBottom: 14 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    input: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 13,
        fontSize: 15,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        color: '#111827',
    },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    pricePreview: {
        backgroundColor: '#ede9fe',
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#c4b5fd',
    },
    pricePreviewText: { fontSize: 14, color: '#5b21b6' },
    pricePreviewTotal: { fontSize: 18, fontWeight: 'bold', color: '#4f46e5', marginTop: 6 },
    submitArea: { padding: 16, paddingBottom: 40 },
    submitBtn: {
        backgroundColor: '#4f46e5',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
    privacyNote: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 12 },

    // Success
    successContainer: {
        flex: 1,
        backgroundColor: '#f0f4ff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    successIcon: { fontSize: 72, marginBottom: 16 },
    successTitle: { fontSize: 26, fontWeight: 'bold', color: '#1a1a3e', marginBottom: 8 },
    successMsg: { fontSize: 14, color: '#4f46e5', textAlign: 'center', marginBottom: 24, fontWeight: '600' },
    receiptBox: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 16,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    receiptLabel: { fontSize: 13, color: '#6b7280' },
    receiptValue: { fontSize: 13, color: '#111827', maxWidth: '60%', textAlign: 'right' },
    receiptBold: { fontWeight: 'bold', color: '#1a1a3e' },
    receiptHighlight: { color: '#4f46e5', fontSize: 15 },
    noteSuccess: {
        backgroundColor: '#fef9c3',
        borderRadius: 10,
        padding: 12,
        fontSize: 13,
        color: '#92400e',
        width: '100%',
        marginBottom: 20,
        textAlign: 'center',
    },
    homeBtn: {
        backgroundColor: '#1a1a3e',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 32,
    },
    homeBtnText: { color: '#a5b4fc', fontWeight: 'bold', fontSize: 15 },
});
