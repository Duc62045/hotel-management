import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/apiClient';

export default function CustomerScreen({ navigation }) {
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [idCard, setIdCard] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchId, setSearchId] = useState('');
    const [customerDetail, setCustomerDetail] = useState(null);

    const handleCreateCustomer = async () => {
        if (!fullName || !phone || !idCard) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
            return;
        }
        setLoading(true);
        try {
            const res = await apiClient.post('/customers', {
                full_name: fullName,
                phone: phone,
                id_card: idCard,
            });
            const newId = res.data.id;
            Alert.alert('Thành công', `Đã thêm khách hàng (ID: ${newId})`, [
                {
                    text: 'Đặt phòng ngay',
                    onPress: () => navigation.navigate('Booking', { customerId: String(newId) }),
                },
                { text: 'OK' },
            ]);
            setFullName('');
            setPhone('');
            setIdCard('');
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể thêm khách hàng');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchCustomer = async () => {
        if (!searchId) return;
        try {
            const res = await apiClient.get(`/customers/${searchId}`);
            setCustomerDetail(res.data);
        } catch {
            Alert.alert('Không tìm thấy', 'Không có khách hàng với ID này');
            setCustomerDetail(null);
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('role');
        navigation.replace('Login');
    };

    return (
        <ScrollView style={styles.container}>
            {/* Form thêm khách */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thêm khách hàng mới</Text>
                <TextInput style={styles.input} placeholder="Họ và tên" value={fullName} onChangeText={setFullName} />
                <TextInput style={styles.input} placeholder="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <TextInput style={styles.input} placeholder="Số CCCD" value={idCard} onChangeText={setIdCard} keyboardType="numeric" />
                <TouchableOpacity style={styles.button} onPress={handleCreateCustomer} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Thêm khách hàng</Text>}
                </TouchableOpacity>
            </View>

            {/* Tìm kiếm khách */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tìm khách hàng theo ID</Text>
                <View style={styles.row}>
                    <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="Nhập ID khách hàng"
                        value={searchId}
                        onChangeText={setSearchId}
                        keyboardType="numeric"
                    />
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearchCustomer}>
                        <Text style={styles.buttonText}>Tìm</Text>
                    </TouchableOpacity>
                </View>

                {customerDetail && (
                    <View style={styles.resultCard}>
                        <Text style={styles.resultName}>{customerDetail.full_name}</Text>
                        <Text style={styles.resultInfo}>ID: {customerDetail.id}</Text>
                        <Text style={styles.resultInfo}>SĐT: {customerDetail.phone}</Text>
                        <Text style={styles.resultInfo}>CCCD (đã giải mã): {customerDetail.id_card}</Text>
                        <TouchableOpacity
                            style={styles.useForBookingButton}
                            onPress={() => navigation.navigate('Booking', {
                                customerId: String(customerDetail.id),
                            })}
                        >
                            <Text style={styles.useForBookingText}>Dùng ID này để đặt phòng →</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => navigation.navigate('Booking')}
                >
                    <Text style={styles.navButtonText}>Đến màn hình đặt phòng →</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
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
    row: { flexDirection: 'row', gap: 8 },
    searchButton: {
        backgroundColor: '#4f46e5',
        padding: 10,
        borderRadius: 8,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    resultCard: {
        marginTop: 12,
        backgroundColor: '#f0f4ff',
        borderRadius: 8,
        padding: 12,
    },
    resultName: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 },
    resultInfo: { fontSize: 13, color: '#444', marginBottom: 2 },
    useForBookingButton: {
        marginTop: 12,
        backgroundColor: '#4f46e5',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    useForBookingText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    navButton: {
        flex: 1,
        padding: 14,
        alignItems: 'center',
        backgroundColor: '#e0e7ff',
        borderRadius: 8,
    },
    navButtonText: { color: '#4f46e5', fontWeight: '600' },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 30,
    },
    logoutButton: {
        padding: 14,
        backgroundColor: '#ef4444',
        borderRadius: 8,
        alignItems: 'center',
    },
    logoutText: { color: '#fff', fontWeight: '600' },
});