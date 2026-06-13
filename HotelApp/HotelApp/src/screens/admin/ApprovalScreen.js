import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import apiClient from '../../api/apiClient';

const STATUS_COLOR = {
    pending: '#f59e0b',
    approved: '#22c55e',
    rejected: '#ef4444',
};
const STATUS_LABEL = {
    pending: '⏳ Chờ duyệt',
    approved: '✅ Đã duyệt',
    rejected: '❌ Từ chối',
};
const ACTION_LABEL = {
    cancel_booking: '🚫 Hủy đặt phòng',
    change_room: '🔄 Đổi phòng',
    refund: '💸 Hoàn tiền',
    other: '📝 Khác',
};

export default function ApprovalScreen({ navigation }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [decidingId, setDecidingId] = useState(null);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/manager/approval-requests');
            setRequests(res.data || []);
        } catch {
            Alert.alert('Lỗi', 'Không thể tải danh sách yêu cầu.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
        const unsub = navigation.addListener('focus', fetchRequests);
        return unsub;
    }, [navigation]);

    const decide = async (reqId, decision) => {
        const word = decision === 'approved' ? 'Duyệt' : 'Từ chối';
        Alert.alert(`${word} yêu cầu?`, `Bạn có chắc muốn ${word.toLowerCase()} yêu cầu #${reqId}?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: word,
                style: decision === 'rejected' ? 'destructive' : 'default',
                onPress: async () => {
                    setDecidingId(reqId);
                    try {
                        const res = await apiClient.put(`/manager/approval-requests/${reqId}`, {
                            decision,
                            note: null,
                        });
                        Alert.alert('✅', res.data.message);
                        fetchRequests();
                    } catch (err) {
                        Alert.alert('Lỗi', err.response?.data?.detail || 'Không thể xử lý.');
                    } finally {
                        setDecidingId(null);
                    }
                },
            },
        ]);
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.actionType}>
                        {ACTION_LABEL[item.action_type] || item.action_type}
                    </Text>
                    <Text style={styles.requestId}>Yêu cầu #{item.id}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '20', borderColor: STATUS_COLOR[item.status] }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                        {STATUS_LABEL[item.status] || item.status}
                    </Text>
                </View>
            </View>

            {item.reason ? (
                <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Lý do:</Text>
                    <Text style={styles.reasonText}>{item.reason}</Text>
                </View>
            ) : null}

            <View style={styles.metaRow}>
                <Text style={styles.meta}>Người yêu cầu ID: {item.requester_id}</Text>
                {item.target_id ? <Text style={styles.meta}>Đối tượng ID: {item.target_id}</Text> : null}
                {item.created_at ? (
                    <Text style={styles.meta}>{new Date(item.created_at).toLocaleString('vi-VN')}</Text>
                ) : null}
            </View>

            {item.status === 'pending' && (
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => decide(item.id, 'approved')}
                        disabled={decidingId === item.id}
                    >
                        {decidingId === item.id ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.approveBtnText}>✅ Duyệt</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => decide(item.id, 'rejected')}
                        disabled={decidingId === item.id}
                    >
                        <Text style={styles.rejectBtnText}>❌ Từ chối</Text>
                    </TouchableOpacity>
                </View>
            )}

            {item.status !== 'pending' && item.note ? (
                <Text style={styles.noteText}>Ghi chú: {item.note}</Text>
            ) : null}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Quay lại</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>⚡ Duyệt Yêu cầu</Text>
                <Text style={styles.headerSub}>
                    {requests.filter(r => r.status === 'pending').length} yêu cầu đang chờ
                </Text>
            </View>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text style={styles.loadingText}>Đang tải yêu cầu...</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyIcon}>🎉</Text>
                            <Text style={styles.emptyText}>Không có yêu cầu nào đang chờ duyệt!</Text>
                        </View>
                    }
                    onRefresh={fetchRequests}
                    refreshing={loading}
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
    },
    backBtn: { color: '#a5b4fc', fontSize: 14, fontWeight: '600', marginBottom: 6 },
    headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    headerSub: { color: '#818cf8', fontSize: 12, marginTop: 4 },
    list: { padding: 12, gap: 12 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    actionType: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    requestId: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    statusText: { fontSize: 12, fontWeight: '700' },
    reasonBox: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    reasonLabel: { fontSize: 12, color: '#6b7280', marginBottom: 3 },
    reasonText: { fontSize: 13, color: '#374151' },
    metaRow: { gap: 2, marginBottom: 12 },
    meta: { fontSize: 11, color: '#9ca3af' },
    actionRow: { flexDirection: 'row', gap: 10 },
    approveBtn: {
        flex: 1,
        backgroundColor: '#22c55e',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    approveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    rejectBtn: {
        flex: 1,
        backgroundColor: '#fee2e2',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fca5a5',
    },
    rejectBtnText: { color: '#dc2626', fontWeight: 'bold', fontSize: 14 },
    noteText: { fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginTop: 8 },
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: '#6b7280', fontSize: 14 },
    emptyBox: { alignItems: 'center', marginTop: 80, gap: 12 },
    emptyIcon: { fontSize: 56 },
    emptyText: { color: '#9ca3af', fontSize: 15, textAlign: 'center' },
});
