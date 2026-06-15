import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator, RefreshControl, TextInput
} from 'react-native';
import apiClient from '../../api/apiClient';

const fmtVND = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const fmtDateTime = (str) => {
    if (!str) return '—';
    try {
        const d = new Date(str);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ` +
            `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch { return str; }
};

export default function NightAuditScreen({ navigation }) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [closing, setClosing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [notes, setNotes] = useState('');

    const fetchStatus = useCallback(async () => {
        try {
            const res = await apiClient.get('/admin/night-audit/status');
            setStatus(res.data);
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể tải trạng thái Night Audit');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStatus();
    };

    const handleCloseAudit = () => {
        const today = status?.today || new Date().toISOString().split('T')[0];
        Alert.alert(
            '⚠️ Xác nhận Chốt sổ Night Audit',
            `Bạn sắp chốt sổ ngày ${today}.\n\n` +
            `Sau khi chốt, toàn bộ dữ liệu tài chính của ngày này sẽ bị KHÓA và không thể chỉnh sửa.\n\n` +
            `Hành động này không thể hoàn tác!`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận Chốt sổ',
                    style: 'destructive',
                    onPress: confirmCloseAudit,
                },
            ]
        );
    };

    const confirmCloseAudit = async () => {
        setClosing(true);
        try {
            const res = await apiClient.post('/admin/night-audit/close', {
                notes: notes || 'Chốt sổ cuối ngày',
            });
            Alert.alert(
                '✅ Chốt sổ thành công',
                `Đã khóa dữ liệu ngày ${status?.today}.\n` +
                `Doanh thu: ${fmtVND(res.data.total_revenue)}\n` +
                `Số đơn: ${res.data.total_bookings_closed} booking`,
                [{ text: 'OK', onPress: fetchStatus }]
            );
            setNotes('');
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể chốt sổ');
        } finally {
            setClosing(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1e3a5f" />
                <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
        );
    }

    const todayIsClosed = status?.today_is_closed;
    const todaySession = status?.today_session;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1e3a5f']} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🌙 Night Audit</Text>
                <Text style={styles.headerSub}>Chốt sổ cuối ngày</Text>
                <Text style={styles.headerDate}>📅 Hôm nay: {status?.today}</Text>
            </View>

            {/* Trạng thái hôm nay */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trạng thái hôm nay</Text>

                {todayIsClosed ? (
                    <View style={styles.closedCard}>
                        <Text style={styles.closedIcon}>🔒</Text>
                        <Text style={styles.closedTitle}>Đã chốt sổ</Text>
                        <Text style={styles.closedDetail}>
                            Thực hiện bởi: <Text style={styles.bold}>{todaySession?.closed_by}</Text>
                        </Text>
                        <Text style={styles.closedDetail}>
                            Lúc: <Text style={styles.bold}>{fmtDateTime(todaySession?.closed_at)}</Text>
                        </Text>
                        <View style={styles.divider} />
                        <Text style={styles.closedRevenue}>{fmtVND(todaySession?.total_revenue)}</Text>
                        <Text style={styles.closedRevenueLabel}>Doanh thu ngày ({todaySession?.total_bookings_closed} đơn)</Text>
                    </View>
                ) : (
                    <View style={styles.openCard}>
                        <Text style={styles.openIcon}>🔓</Text>
                        <Text style={styles.openTitle}>Chưa chốt sổ hôm nay</Text>
                        <Text style={styles.warningText}>
                            ⚠️ Sau khi chốt sổ, dữ liệu tài chính của ngày {status?.today} sẽ bị khóa (Read-only).
                            Không ai có thể chỉnh sửa thông tin tiền nong của ngày đã chốt.
                        </Text>
                        <TextInput
                            style={styles.notesInput}
                            placeholder="Ghi chú chốt sổ (tùy chọn)..."
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={2}
                        />
                        <TouchableOpacity
                            style={[styles.closeAuditBtn, closing && styles.disabledBtn]}
                            onPress={handleCloseAudit}
                            disabled={closing}
                        >
                            {closing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.closeAuditBtnText}>🌙 Chốt sổ ngày hôm nay</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Lịch sử Night Audit */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📋 Lịch sử chốt sổ</Text>
                {status?.history?.length === 0 ? (
                    <Text style={styles.emptyText}>Chưa có phiên nào.</Text>
                ) : (
                    status?.history?.map((item, i) => (
                        <View key={i} style={styles.historyRow}>
                            <View style={styles.historyLeft}>
                                <Text style={styles.historyDate}>{item.audit_date}</Text>
                                <Text style={styles.historyBy}>bởi {item.closed_by}</Text>
                            </View>
                            <View style={styles.historyRight}>
                                <Text style={styles.historyRevenue}>{fmtVND(item.total_revenue)}</Text>
                                <Text style={styles.historyBookings}>{item.total_bookings_closed} đơn</Text>
                            </View>
                            <View style={styles.lockedBadge}>
                                <Text style={styles.lockedText}>🔒</Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
    loadingText: { color: '#94a3b8', marginTop: 8 },
    header: { backgroundColor: '#1e293b', padding: 20, paddingTop: 50 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0' },
    headerSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
    headerDate: { fontSize: 13, color: '#93c5fd', marginTop: 6, fontWeight: '600' },
    section: { backgroundColor: '#1e293b', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#e2e8f0', marginBottom: 14 },
    closedCard: { alignItems: 'center', padding: 20, backgroundColor: '#052e16', borderRadius: 12 },
    closedIcon: { fontSize: 40, marginBottom: 8 },
    closedTitle: { fontSize: 18, fontWeight: 'bold', color: '#4ade80', marginBottom: 12 },
    closedDetail: { fontSize: 14, color: '#86efac', marginBottom: 4 },
    bold: { fontWeight: 'bold', color: '#fff' },
    divider: { height: 1, backgroundColor: '#14532d', width: '100%', marginVertical: 16 },
    closedRevenue: { fontSize: 24, fontWeight: 'bold', color: '#4ade80' },
    closedRevenueLabel: { fontSize: 12, color: '#86efac', marginTop: 4 },
    openCard: { backgroundColor: '#1c1917', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#292524' },
    openIcon: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
    openTitle: { fontSize: 16, fontWeight: 'bold', color: '#fbbf24', textAlign: 'center', marginBottom: 12 },
    warningText: { fontSize: 13, color: '#fcd34d', lineHeight: 20, marginBottom: 16, backgroundColor: '#292524', padding: 12, borderRadius: 8 },
    notesInput: { backgroundColor: '#292524', color: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14, borderWidth: 1, borderColor: '#44403c' },
    closeAuditBtn: { backgroundColor: '#1d4ed8', padding: 16, borderRadius: 10, alignItems: 'center' },
    disabledBtn: { opacity: 0.6 },
    closeAuditBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
    historyLeft: { flex: 1 },
    historyDate: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
    historyBy: { fontSize: 11, color: '#64748b' },
    historyRight: { alignItems: 'flex-end', marginRight: 12 },
    historyRevenue: { fontSize: 13, fontWeight: '700', color: '#60a5fa' },
    historyBookings: { fontSize: 11, color: '#64748b' },
    lockedBadge: { backgroundColor: '#1e3a5f', borderRadius: 6, padding: 4 },
    lockedText: { fontSize: 16 },
    emptyText: { color: '#475569', textAlign: 'center', paddingVertical: 16 },
});
