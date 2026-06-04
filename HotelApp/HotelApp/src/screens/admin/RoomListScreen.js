import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/apiClient';

const STATUS_COLOR = {
    available: '#22c55e',
    booked: '#f59e0b',
    cleaning: '#3b82f6',
};

const STATUS_LABEL = {
    available: 'Trống',
    booked: 'Đã đặt',
    cleaning: 'Đang dọn',
};

export default function RoomListScreen({ navigation }) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [roomNumber, setRoomNumber] = useState('');
    const [typeId, setTypeId] = useState('');
    const [cleaningId, setCleaningId] = useState(null);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/rooms');
            setRooms(res.data);
        } catch {
            Alert.alert('Lỗi', 'Không thể tải danh sách phòng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
        const unsubscribe = navigation.addListener('focus', fetchRooms);
        return unsubscribe;
    }, [navigation]);

    const handleAddRoom = async () => {
        if (!roomNumber || !typeId) {
            Alert.alert('Lỗi', 'Vui lòng nhập số phòng và loại phòng');
            return;
        }
        try {
            await apiClient.post('/rooms', {
                room_number: roomNumber,
                type_id: parseInt(typeId),
            });
            setRoomNumber('');
            setTypeId('');
            fetchRooms();
            Alert.alert('Thành công', 'Đã thêm phòng mới');
        } catch {
            Alert.alert('Lỗi', 'Không thể thêm phòng');
        }
    };

    const handleCleanRoom = async (roomId) => {
        setCleaningId(roomId);
        try {
            const res = await apiClient.put(`/rooms/${roomId}/clean`);
            Alert.alert('Thành công', res.data?.message || 'Phòng đã sẵn sàng');
            fetchRooms();
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể cập nhật phòng');
        } finally {
            setCleaningId(null);
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('role');
        navigation.replace('Login');
    };

    const renderRoom = ({ item }) => (
        <View style={styles.roomCard}>
            <View style={{ flex: 1 }}>
                <Text style={styles.roomNumber}>Phòng {item.room_number}</Text>
                <Text style={styles.roomType}>Loại phòng ID: {item.type_id}</Text>
            </View>
            <View style={styles.roomActions}>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] || '#888' }]}>
                    <Text style={styles.badgeText}>{STATUS_LABEL[item.status] || item.status}</Text>
                </View>
                {item.status === 'cleaning' && (
                    <TouchableOpacity
                        style={styles.cleanButton}
                        onPress={() => handleCleanRoom(item.id)}
                        disabled={cleaningId === item.id}
                    >
                        {cleaningId === item.id ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.cleanButtonText}>Dọn xong</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity
                    style={styles.statsButton}
                    onPress={() => navigation.navigate('Statistics')}
                >
                    <Text style={styles.statsButtonText}>Xem thống kê →</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Account')}>
                    <Text style={styles.accountLink}>Tài khoản</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                <Text style={styles.formTitle}>Thêm phòng mới</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Số phòng (vd: 101)"
                    value={roomNumber}
                    onChangeText={setRoomNumber}
                />
                <TextInput
                    style={styles.input}
                    placeholder="ID loại phòng (vd: 1)"
                    value={typeId}
                    onChangeText={setTypeId}
                    keyboardType="numeric"
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddRoom}>
                    <Text style={styles.addButtonText}>Thêm phòng</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.listTitle}>Danh sách phòng ({rooms.length})</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={rooms}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderRoom}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8,
    },
    statsButton: { padding: 8 },
    statsButtonText: { color: '#4f46e5', fontWeight: '600' },
    accountLink: { color: '#4f46e5', fontWeight: '600', fontSize: 13 },
    logoutButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    logoutText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    form: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    formTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12, color: '#1a1a2e' },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        fontSize: 14,
    },
    addButton: {
        backgroundColor: '#4f46e5',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButtonText: { color: '#fff', fontWeight: '600' },
    listTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10, color: '#1a1a2e' },
    roomCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    roomActions: { alignItems: 'flex-end', gap: 8 },
    roomNumber: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
    roomType: { fontSize: 13, color: '#666', marginTop: 2 },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    cleanButton: {
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
    },
    cleanButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
