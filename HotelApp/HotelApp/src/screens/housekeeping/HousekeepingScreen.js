import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    FlatList, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/apiClient';

const STATUS_CONFIG = {
    available:   { label: 'Sẵn sàng',     color: '#22c55e', bg: '#f0fdf4', icon: '✅' },
    booked:      { label: 'Có khách',      color: '#3b82f6', bg: '#eff6ff', icon: '🛏' },
    cleaning:    { label: 'Đang dọn',      color: '#f59e0b', bg: '#fffbeb', icon: '🧹' },
    maintenance: { label: 'Bảo trì',       color: '#ef4444', bg: '#fef2f2', icon: '🔧' },
};

export default function HousekeepingScreen({ navigation }) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    const fetchRooms = useCallback(async () => {
        try {
            const res = await apiClient.get('/housekeeping/rooms');
            setRooms(res.data);
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể tải danh sách phòng');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchRooms(); }, [fetchRooms]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchRooms();
    }, [fetchRooms]);

    const updateRoomStatus = async (roomId, roomNumber, newStatus, reason) => {
        setUpdatingId(roomId);
        try {
            const res = await apiClient.put(`/housekeeping/rooms/${roomId}/status`, {
                status: newStatus,
                reason: reason,
            });
            Alert.alert('Thành công', res.data.message);
            fetchRooms();
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể cập nhật trạng thái');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleUpdateStatus = (room, newStatus) => {
        const statusReasons = {
            available: 'Dọn phòng hoàn tất, sẵn sàng đón khách',
            cleaning: 'Phòng cần dọn dẹp',
            maintenance: 'Phòng đang sửa chữa / bảo trì',
        };
        const labels = {
            available: 'Đánh dấu Sạch sẵn sàng',
            cleaning: 'Đánh dấu Cần dọn',
            maintenance: 'Đưa vào Bảo trì',
        };
        Alert.alert(
            labels[newStatus],
            `Phòng ${room.room_number} → ${STATUS_CONFIG[newStatus]?.label || newStatus}?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    onPress: () => updateRoomStatus(room.id, room.room_number, newStatus, statusReasons[newStatus]),
                },
            ]
        );
    };

    const handleLogout = async () => {
        await AsyncStorage.multiRemove(['token', 'role']);
        navigation.replace('StaffLogin');
    };

    const renderRoom = ({ item }) => {
        const config = STATUS_CONFIG[item.status] || { label: item.status, color: '#666', bg: '#f5f5f5', icon: '❓' };
        const isUpdating = updatingId === item.id;

        return (
            <View style={[styles.roomCard, { borderLeftColor: config.color }]}>
                <View style={styles.roomHeader}>
                    <View>
                        <Text style={styles.roomNumber}>Phòng {item.room_number}</Text>
                        <Text style={styles.roomType}>{item.type_name}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                        <Text style={styles.statusIcon}>{config.icon}</Text>
                        <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
                    </View>
                </View>

                {isUpdating ? (
                    <ActivityIndicator color="#4f46e5" style={{ marginTop: 12 }} />
                ) : (
                    <View style={styles.actionRow}>
                        {item.status !== 'available' && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}
                                onPress={() => handleUpdateStatus(item, 'available')}
                            >
                                <Text style={styles.actionBtnText}>✅ Dọn xong</Text>
                            </TouchableOpacity>
                        )}
                        {item.status !== 'cleaning' && item.status !== 'booked' && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]}
                                onPress={() => handleUpdateStatus(item, 'cleaning')}
                            >
                                <Text style={styles.actionBtnText}>🧹 Cần dọn</Text>
                            </TouchableOpacity>
                        )}
                        {item.status !== 'maintenance' && item.status !== 'booked' && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                                onPress={() => handleUpdateStatus(item, 'maintenance')}
                            >
                                <Text style={styles.actionBtnText}>🔧 Bảo trì</Text>
                            </TouchableOpacity>
                        )}
                        {item.status === 'booked' && (
                            <Text style={styles.bookedNote}>⚠️ Phòng đang có khách — không thể thay đổi</Text>
                        )}
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text style={styles.loadingText}>Đang tải danh sách phòng...</Text>
            </View>
        );
    }

    const counts = Object.keys(STATUS_CONFIG).reduce((acc, key) => {
        acc[key] = rooms.filter(r => r.status === key).length;
        return acc;
    }, {});

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🧹 Buồng phòng</Text>
                <Text style={styles.headerSub}>Housekeeping Dashboard</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <View key={key} style={[styles.statCard, { borderTopColor: cfg.color }]}>
                        <Text style={styles.statCount}>{counts[key] || 0}</Text>
                        <Text style={[styles.statLabel, { color: cfg.color }]}>{cfg.icon} {cfg.label}</Text>
                    </View>
                ))}
            </View>

            <FlatList
                data={rooms}
                keyExtractor={item => String(item.id)}
                renderItem={renderRoom}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4f46e5']} />}
                ListEmptyComponent={<Text style={styles.empty}>Không có phòng nào.</Text>}
            />

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' },
    loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
    header: {
        backgroundColor: '#1e3a5f',
        padding: 20,
        paddingTop: 50,
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: '#93c5fd', marginTop: 2 },
    statsRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, gap: 8 },
    statCard: {
        flex: 1,
        alignItems: 'center',
        borderTopWidth: 3,
        borderRadius: 8,
        padding: 8,
        backgroundColor: '#fafafa',
    },
    statCount: { fontSize: 20, fontWeight: 'bold', color: '#1e3a5f' },
    statLabel: { fontSize: 10, textAlign: 'center', marginTop: 2 },
    list: { padding: 12, gap: 10 },
    roomCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    roomNumber: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    roomType: { fontSize: 12, color: '#64748b', marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, gap: 4 },
    statusIcon: { fontSize: 14 },
    statusLabel: { fontSize: 12, fontWeight: '600' },
    actionRow: { flexDirection: 'row', marginTop: 12, gap: 8, flexWrap: 'wrap' },
    actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flex: 1 },
    actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
    bookedNote: { fontSize: 12, color: '#64748b', fontStyle: 'italic', paddingVertical: 8 },
    logoutBtn: { backgroundColor: '#ef4444', margin: 12, padding: 14, borderRadius: 10, alignItems: 'center' },
    logoutText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
});
