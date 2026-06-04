import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, TextInput, ScrollView, Platform, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/apiClient';
import AvailableRoomsList from '../../components/AvailableRoomsList';
import ProfileRequiredPrompt from '../../components/ProfileRequiredPrompt';
import { validateBookingDates, dmyToYmd } from '../../utils/date';

const STATUS_LABEL = {
    pending: 'Chờ check-in',
    confirmed: 'Chờ check-in',
    checked_in: 'Đang ở',
    checked_out: 'Đã trả phòng',
    cancelled: 'Đã hủy',
    no_show: 'Không đến',
};

const STATUS_COLOR = {
    pending: '#f59e0b',
    confirmed: '#f59e0b',
    checked_in: '#22c55e',
    checked_out: '#888',
    cancelled: '#ef4444',
    no_show: '#991b1b',
};

function getBookingStatusLabel(item) {
    if (item.status === 'pending' && item.payment_status !== 'paid') {
        return 'Chờ thanh toán';
    }
    return STATUS_LABEL[item.status] || item.status;
}

function getBookingStatusColor(item) {
    if (item.status === 'pending' && item.payment_status !== 'paid') {
        return '#ef4444';
    }
    return STATUS_COLOR[item.status] || '#888';
}

function isAwaitingCheckIn(item) {
    return item.status === 'pending' || item.status === 'confirmed';
}

export default function MyBookingsScreen({ navigation }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [needsProfile, setNeedsProfile] = useState(false);
    const [roomId, setRoomId] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

    const goToProfile = () => {
        setShowProfileModal(false);
        navigation.navigate('MyProfile');
    };

    const promptUpdateProfile = () => {
        setNeedsProfile(true);
        if (Platform.OS === 'web') {
            setShowProfileModal(true);
        } else {
            Alert.alert(
                'Cần cập nhật hồ sơ',
                'Bạn cần nhập SĐT và CCCD trước khi đặt phòng.',
                [
                    { text: 'Để sau', style: 'cancel' },
                    { text: 'Cập nhật hồ sơ', onPress: goToProfile },
                ]
            );
        }
    };

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/my-bookings');
            const msg = res.data.message || '';
            setMessage(msg);
            if (res.data.bookings) {
                setBookings(res.data.bookings);
                setNeedsProfile(false);
            } else {
                setBookings([]);
                setNeedsProfile(msg.includes('chưa cập nhật'));
            }
        } catch {
            Alert.alert('Lỗi', 'Không thể tải lịch sử đặt phòng');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('MyProfile')}>
                        <Text style={styles.headerLink}>Hồ sơ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Account')}>
                        <Text style={styles.headerLink}>Tài khoản</Text>
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation]);

    useEffect(() => {
        fetchBookings();
        const unsubscribe = navigation.addListener('focus', fetchBookings);
        return unsubscribe;
    }, [navigation, fetchBookings]);

    const handleSelectRoom = (room) => {
        setRoomId(String(room.id));
    };

    const handleBookRoom = async () => {
        if (needsProfile) {
            promptUpdateProfile();
            return;
        }
        if (!roomId) {
            Alert.alert('Lỗi', 'Vui lòng chọn phòng');
            return;
        }
        const validation = validateBookingDates(checkIn, checkOut);
        if (!validation.valid) {
            Alert.alert('Lỗi', validation.error);
            return;
        }
        setBookingLoading(true);
        try {
            const res = await apiClient.post('/app/bookings', {
                room_id: parseInt(roomId),
                check_in_date: dmyToYmd(checkIn),
                check_out_date: dmyToYmd(checkOut),
            });
            setRoomId('');
            setCheckIn('');
            setCheckOut('');
            fetchBookings();
            
            // Chuyển hướng sang Màn hình Thanh toán ảo
            if (res.data && res.data.booking) {
                navigation.navigate('Payment', {
                    bookingId: res.data.booking.id,
                    amount: res.data.booking.total_price
                });
            } else {
                Alert.alert('Thành công', 'Đặt phòng thành công!');
            }
        } catch (e) {
            const detail = e.response?.data?.detail;
            if (typeof detail === 'string' && detail.includes('cập nhật hồ sơ')) {
                setNeedsProfile(true);
                promptUpdateProfile();
            } else {
                Alert.alert('Lỗi', detail || 'Không thể đặt phòng');
            }
        } finally {
            setBookingLoading(false);
        }
    };

    const handleCancelBooking = (bookingId) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Bạn có chắc muốn hủy đơn đặt phòng này?')) {
                executeCancel(bookingId);
            }
        } else {
            Alert.alert('Xác nhận', 'Bạn có chắc muốn hủy đơn đặt phòng này?', [
                { text: 'Không', style: 'cancel' },
                {
                    text: 'Hủy đơn',
                    style: 'destructive',
                    onPress: () => executeCancel(bookingId),
                },
            ]);
        }
    };

    const executeCancel = async (bookingId) => {
        try {
            await apiClient.put(`/bookings/${bookingId}/cancel`);
            if (Platform.OS === 'web') {
                window.alert('Đơn đặt phòng đã được hủy');
            } else {
                Alert.alert('Đã hủy', 'Đơn đặt phòng đã được hủy');
            }
            fetchBookings();
        } catch (e) {
            const errorMsg = e.response?.data?.detail || 'Không thể hủy đơn';
            if (Platform.OS === 'web') {
                window.alert('Lỗi: ' + errorMsg);
            } else {
                Alert.alert('Lỗi', errorMsg);
            }
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('role');
        navigation.replace('Login');
    };

    const renderBooking = ({ item }) => (
        <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
                <Text style={styles.bookingRoom}>Phòng #{item.room_id}</Text>
                <View style={[styles.badge, { backgroundColor: getBookingStatusColor(item) }]}>
                    <Text style={styles.badgeText}>{getBookingStatusLabel(item)}</Text>
                </View>
            </View>
            <Text style={styles.bookingDate}>
                {item.check_in_date} → {item.check_out_date}
            </Text>
            <Text style={styles.bookingPrice}>
                {item.total_price?.toLocaleString('vi-VN')} ₫
            </Text>
            <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 13, color: item.payment_status === 'paid' ? '#16a34a' : '#ef4444', fontWeight: 'bold' }}>
                    {item.payment_status === 'paid' ? '✅ Đã thanh toán' : '❌ Chưa thanh toán'}
                </Text>
            </View>
            {isAwaitingCheckIn(item) && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    {item.payment_status !== 'paid' && (
                        <TouchableOpacity
                            style={[styles.cancelButton, { flex: 1, backgroundColor: '#dbeafe' }]}
                            onPress={() => navigation.navigate('Payment', {
                                bookingId: item.id,
                                amount: item.total_price
                            })}
                        >
                            <Text style={[styles.cancelButtonText, { color: '#2563eb' }]}>Thanh toán ngay</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.cancelButton, { flex: 1 }]}
                        onPress={() => handleCancelBooking(item.id)}
                    >
                        <Text style={styles.cancelButtonText}>Hủy đơn</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {needsProfile ? (
                    <ProfileRequiredPrompt onUpdateProfile={goToProfile} />
                ) : (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Đặt phòng</Text>

                        <AvailableRoomsList
                            checkIn={checkIn}
                            checkOut={checkOut}
                            onCheckInChange={setCheckIn}
                            onCheckOutChange={setCheckOut}
                            selectedRoomId={roomId}
                            onSelectRoom={handleSelectRoom}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="ID phòng (hoặc chọn từ danh sách trên)"
                            value={roomId}
                            onChangeText={setRoomId}
                            keyboardType="numeric"
                        />

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleBookRoom}
                            disabled={bookingLoading}
                        >
                            {bookingLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Đặt phòng</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={styles.historyTitle}>Lịch sử đặt phòng</Text>
                {loading ? (
                    <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 20 }} />
                ) : bookings.length > 0 ? (
                    bookings.map((item) => (
                        <View key={item.id.toString()}>
                            {renderBooking({ item })}
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>{message || 'Chưa có đơn đặt phòng nào'}</Text>
                )}
            </ScrollView>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>

            <Modal
                visible={showProfileModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowProfileModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ProfileRequiredPrompt onUpdateProfile={goToProfile} />
                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => setShowProfileModal(false)}
                        >
                            <Text style={styles.modalCloseText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    scrollContent: { padding: 16, paddingBottom: 90 },
    headerActions: { flexDirection: 'row', gap: 16, marginRight: 16 },
    headerLink: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        maxWidth: 420,
        width: '100%',
        alignSelf: 'center',
    },
    modalClose: {
        marginTop: 12,
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    modalCloseText: {
        color: '#666',
        fontWeight: '600',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 12 },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        fontSize: 14,
    },
    button: {
        backgroundColor: '#4f46e5',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: { color: '#fff', fontWeight: '600' },
    historyTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 10 },
    bookingCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    bookingRoom: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
    bookingDate: { fontSize: 13, color: '#666', marginBottom: 4 },
    bookingPrice: { fontSize: 14, fontWeight: '600', color: '#4f46e5' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    cancelButton: {
        marginTop: 10,
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
    },
    cancelButtonText: { color: '#ef4444', fontWeight: '600', fontSize: 13 },
    emptyText: { textAlign: 'center', color: '#888', marginTop: 20, fontSize: 14 },
    logoutButton: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        backgroundColor: '#ef4444',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    logoutText: { color: '#fff', fontWeight: '600' },
});
