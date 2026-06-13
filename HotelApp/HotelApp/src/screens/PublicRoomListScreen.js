import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import apiClient from '../api/apiClient';

const STATUS_COLOR = {
    available: '#22c55e',
    booked: '#ef4444',
    cleaning: '#f59e0b',
};

const STATUS_LABEL = {
    available: '✅ Còn trống',
    booked: '❌ Đã đặt',
    cleaning: '🧹 Đang dọn',
};

export default function PublicRoomListScreen({ navigation }) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/rooms/public');
            setRooms(res.data || []);
        } catch {
            Alert.alert('Lỗi', 'Không thể tải danh sách phòng. Kiểm tra kết nối server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRooms(); }, []);

    const formatPrice = (price) =>
        price ? price.toLocaleString('vi-VN') + ' đ/đêm' : 'Liên hệ';

    const renderRoom = ({ item }) => {
        const isAvailable = String(item.status).toLowerCase() === 'available';
        return (
            <View style={[styles.roomCard, !isAvailable && styles.roomCardUnavailable]}>
                <View style={styles.roomCardTop}>
                    <View>
                        <Text style={styles.roomNumber}>Phòng {item.room_number}</Text>
                        <Text style={styles.roomType}>{item.type_name}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] || '#888' }]}>
                        <Text style={styles.badgeText}>{STATUS_LABEL[item.status] || item.status}</Text>
                    </View>
                </View>

                <View style={styles.roomCardMid}>
                    <Text style={styles.priceText}>{formatPrice(item.price_per_night)}</Text>
                    {item.description ? (
                        <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                </View>

                {isAvailable && (
                    <TouchableOpacity
                        style={styles.bookButton}
                        onPress={() => navigation.navigate('PublicBooking', { room: item })}
                    >
                        <Text style={styles.bookButtonText}>Đặt phòng ngay →</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← Quay lại</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>🏨 Danh sách phòng</Text>
                    <Text style={styles.headerSub}>Không cần đăng nhập để xem</Text>
                </View>
                <TouchableOpacity onPress={fetchRooms} style={styles.refreshBtn}>
                    <Text style={styles.refreshText}>🔄</Text>
                </TouchableOpacity>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                {Object.entries(STATUS_LABEL).map(([key, label]) => (
                    <View key={key} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: STATUS_COLOR[key] }]} />
                        <Text style={styles.legendText}>{label.replace(/^. /, '')}</Text>
                    </View>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text style={styles.loadingText}>Đang tải danh sách phòng...</Text>
                </View>
            ) : (
                <FlatList
                    data={rooms}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderRoom}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Hiện chưa có phòng nào trong hệ thống</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4ff' },
    header: {
        backgroundColor: '#1a1a3e',
        paddingTop: 48,
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: { padding: 4 },
    backBtnText: { color: '#a5b4fc', fontSize: 14, fontWeight: '600' },
    headerCenter: { alignItems: 'center', flex: 1 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    headerSub: { color: '#818cf8', fontSize: 11, marginTop: 2 },
    refreshBtn: { padding: 4 },
    refreshText: { fontSize: 20 },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        backgroundColor: '#fff',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, color: '#6b7280' },
    listContent: { padding: 16, gap: 14 },
    roomCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    roomCardUnavailable: {
        opacity: 0.65,
        backgroundColor: '#f9fafb',
    },
    roomCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    roomNumber: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    roomType: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    badge: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    roomCardMid: { marginBottom: 14 },
    priceText: { fontSize: 16, fontWeight: 'bold', color: '#4f46e5' },
    descText: { fontSize: 12, color: '#9ca3af', marginTop: 4, lineHeight: 18 },
    bookButton: {
        backgroundColor: '#4f46e5',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    bookButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: '#6b7280', fontSize: 14 },
    emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
});
