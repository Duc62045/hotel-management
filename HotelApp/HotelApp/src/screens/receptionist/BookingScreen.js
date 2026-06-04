import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ScrollView, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/apiClient';
import AvailableRoomsList from '../../components/AvailableRoomsList';
import { validateBookingDates, dmyToYmd } from '../../utils/date';

export default function BookingScreen({ navigation, route }) {
    const [customerId, setCustomerId] = useState(route.params?.customerId || '');
    const [roomId, setRoomId] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [loading, setLoading] = useState(false);
    const [bookingId, setBookingId] = useState('');
    const [cleanRoomId, setCleanRoomId] = useState('');
    const [bookingDetail, setBookingDetail] = useState(null);

    useEffect(() => {
        if (route.params?.customerId) {
            setCustomerId(route.params.customerId);
        }
    }, [route.params?.customerId]);

    const handleSelectRoom = (room) => {
        setRoomId(String(room.id));
    };

    const handleCreateBooking = async () => {
        if (!customerId || !roomId) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ ID khách hàng và chọn phòng');
            return;
        }
        const validation = validateBookingDates(checkIn, checkOut);
        if (!validation.valid) {
            Alert.alert('Lỗi', validation.error);
            return;
        }
        setLoading(true);
        try {
            const res = await apiClient.post('/bookings', {
                customer_id: parseInt(customerId),
                room_id: parseInt(roomId),
                check_in_date: dmyToYmd(checkIn),
                check_out_date: dmyToYmd(checkOut),
            });
            Alert.alert(
                'Thành công',
                `Đặt phòng thành công! Tổng tiền: ${res.data.total_price?.toLocaleString('vi-VN') || res.data.booking?.total_price?.toLocaleString('vi-VN')} ₫`
            );
            setRoomId('');
            setCheckIn('');
            setCheckOut('');
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể đặt phòng');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchBooking = async () => {
        if (!bookingId) {
            Alert.alert('Lỗi', 'Vui lòng nhập ID đơn');
            return;
        }
        setLoading(true);
        try {
            const res = await apiClient.get(`/bookings/${bookingId}`);
            setBookingDetail(res.data);
        } catch (e) {
            setBookingDetail(null);
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không tìm thấy đơn đặt phòng');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        if (!bookingId) return;
        setLoading(true);
        try {
            await apiClient.put(`/bookings/${bookingId}/check-in`);
            Alert.alert('Thành công', 'Nhận phòng thành công!');
            handleSearchBooking(); 
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể nhận phòng');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOut = async () => {
        if (!bookingId) return;
        setLoading(true);
        try {
            const res = await apiClient.put(`/bookings/${bookingId}/check-out`);
            Alert.alert('Thành công', res.data?.message || 'Trả phòng thành công!');
            handleSearchBooking();
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể trả phòng');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!bookingId) return;
        setLoading(true);
        try {
            await apiClient.put(`/bookings/${bookingId}/cancel`);
            Alert.alert('Thành công', 'Đơn đặt phòng đã được hủy và phòng đã giải phóng!');
            handleSearchBooking(); 
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể hủy đơn');
        } finally {
            setLoading(false);
        }
    };

    const handleNoShow = async () => {
        if (!bookingId) return;
        setLoading(true);
        try {
            await apiClient.put(`/bookings/${bookingId}/no-show`);
            Alert.alert('Thành công', 'Đã đánh dấu khách không đến và giải phóng phòng trống!');
            handleSearchBooking(); 
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể cập nhật trạng thái đơn');
        } finally {
            setLoading(false);
        }
    };

    const handleCleanRoom = async () => {
        if (!cleanRoomId) {
            Alert.alert('Lỗi', 'Vui lòng nhập ID phòng cần dọn');
            return;
        }
        try {
            const res = await apiClient.put(`/rooms/${cleanRoomId}/clean`);
            Alert.alert('Thành công', res.data?.message || 'Phòng đã sẵn sàng đón khách');
            setCleanRoomId('');
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể cập nhật trạng thái phòng');
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('role');
        navigation.replace('Login');
    };
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#f59e0b';     
            case 'confirmed': return '#22c55e';   
            case 'checked_in': return '#3b82f6';  
            case 'checked_out': return '#64748b'; 
            case 'cancelled': return '#ef4444';   
            case 'no_show': return '#991b1b';     
            default: return '#666';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return '⏳ Chờ nhận phòng';
            case 'confirmed': return '✅ Đăng ký thành công';
            case 'checked_in': return '🛏 Đang lưu trú';
            case 'checked_out': return '🚪 Đã trả phòng';
            case 'cancelled': return '❌ Đã hủy đơn';
            case 'no_show': return '🚫 Không đến (No-show)';
            default: return status;
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tạo đơn đặt phòng</Text>
                <TextInput
                    style={styles.input}
                    placeholder="ID khách hàng"
                    value={customerId}
                    onChangeText={setCustomerId}
                    keyboardType="numeric"
                />

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
                    placeholder="ID phòng (hoặc chọn từ danh sách)"
                    value={roomId}
                    onChangeText={setRoomId}
                    keyboardType="numeric"
                />

                <TouchableOpacity style={styles.button} onPress={handleCreateBooking} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đặt phòng</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quản lý đơn đặt phòng</Text>
                
                <View style={styles.searchRow}>
                    <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="Nhập ID đơn đặt phòng"
                        value={bookingId}
                        onChangeText={setBookingId}
                        keyboardType="numeric"
                    />
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearchBooking} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Tra cứu</Text>}
                    </TouchableOpacity>
                </View>

                {bookingDetail && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Đơn số #{bookingDetail.id}</Text>
                        <View style={styles.cardRow}>
                            <Text style={styles.cardLabel}>Khách hàng:</Text>
                            <Text style={styles.cardValue}>{bookingDetail.customer_name}</Text>
                        </View>
                        <View style={styles.cardRow}>
                            <Text style={styles.cardLabel}>Phòng:</Text>
                            <Text style={styles.cardValue}>{bookingDetail.room_number}</Text>
                        </View>
                        <View style={styles.cardRow}>
                            <Text style={styles.cardLabel}>Trạng thái:</Text>
                            <Text style={[styles.cardValue, { fontWeight: 'bold', color: getStatusColor(bookingDetail.status) }]}>
                                {getStatusText(bookingDetail.status)}
                            </Text>
                        </View>
                        <View style={styles.cardRow}>
                            <Text style={styles.cardLabel}>Tổng tiền:</Text>
                            <Text style={[styles.cardValue, { color: '#ef4444', fontWeight: 'bold' }]}>
                                {bookingDetail.total_price?.toLocaleString('vi-VN')} ₫
                            </Text>
                        </View>

                        <View style={[styles.actionRow, { marginTop: 15 }]}>
                            <TouchableOpacity 
                                style={[
                                    styles.actionButton, 
                                    { 
                                        backgroundColor: '#22c55e', 
                                        opacity: (bookingDetail.status === 'pending' || bookingDetail.status === 'confirmed') ? 1 : 0.4 
                                    }
                                ]} 
                                onPress={handleCheckIn}
                                disabled={loading || (bookingDetail.status !== 'pending' && bookingDetail.status !== 'confirmed')}
                            >
                                <Text style={styles.buttonText}>Nhận phòng</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[
                                    styles.actionButton, 
                                    { 
                                        backgroundColor: '#3b82f6', 
                                        opacity: bookingDetail.status === 'checked_in' ? 1 : 0.4 
                                    }
                                ]} 
                                onPress={handleCheckOut}
                                disabled={loading || bookingDetail.status !== 'checked_in'}
                            >
                                <Text style={styles.buttonText}>Trả phòng</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[
                                    styles.actionButton, 
                                    { 
                                        backgroundColor: '#ef4444', 
                                        opacity: (bookingDetail.status === 'pending' || bookingDetail.status === 'confirmed') ? 1 : 0.4 
                                    }
                                ]} 
                                onPress={handleCancel}
                                disabled={loading || (bookingDetail.status !== 'pending' && bookingDetail.status !== 'confirmed')}
                            >
                                <Text style={styles.buttonText}>Hủy đơn</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[
                                    styles.actionButton, 
                                    { 
                                        backgroundColor: '#991b1b', 
                                        opacity: (bookingDetail.status === 'pending' || bookingDetail.status === 'confirmed') ? 1 : 0.4 
                                    }
                                ]} 
                                onPress={handleNoShow}
                                disabled={loading || (bookingDetail.status !== 'pending' && bookingDetail.status !== 'confirmed')}
                            >
                                <Text style={styles.buttonText}>Không đến</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dọn phòng xong</Text>
                <Text style={styles.hint}>Sau khi trả phòng, phòng ở trạng thái "cleaning". Nhập ID phòng để đánh dấu sẵn sàng.</Text>
                <TextInput
                    style={styles.input}
                    placeholder="ID phòng cần dọn"
                    value={cleanRoomId}
                    onChangeText={setCleanRoomId}
                    keyboardType="numeric"
                />
                <TouchableOpacity style={[styles.button, { backgroundColor: '#0ea5e9' }]} onPress={handleCleanRoom}>
                    <Text style={styles.buttonText}>Hoàn tất dọn phòng</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Đăng xuất khỏi tài khoản Lễ tân</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 12 },
    hint: { fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 18 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 14 },
    button: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: '600', fontSize: 12, textAlign: 'center' },
    actionRow: { flexDirection: 'row', gap: 6 },
    actionButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    logoutButton: { backgroundColor: '#ef4444', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 30 },
    logoutText: { color: '#fff', fontWeight: '600' },
    searchRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
    searchButton: { backgroundColor: '#4f46e5', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    cardLabel: { color: '#64748b', fontSize: 14 },
    cardValue: { color: '#334155', fontSize: 14 },
});