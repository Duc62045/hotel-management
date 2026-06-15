import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/apiClient';

const fmtVND = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
        .format(amount || 0);

const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch { return dateStr; }
};

export default function AccountantScreen({ navigation }) {
    const [report, setReport] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loadingReport, setLoadingReport] = useState(true);
    const [loadingTx, setLoadingTx] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [rptRes, txRes] = await Promise.all([
                apiClient.get('/accountant/revenue-report'),
                apiClient.get('/accountant/transactions?limit=20'),
            ]);
            setReport(rptRes.data);
            setTransactions(txRes.data.transactions || []);
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể tải báo cáo');
        } finally {
            setLoadingReport(false);
            setLoadingTx(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    const handleLogout = async () => {
        await AsyncStorage.multiRemove(['token', 'role']);
        navigation.replace('StaffLogin');
    };

    const getTxStatusColor = (status) => {
        switch (status) {
            case 'completed': return '#22c55e';
            case 'pending': return '#f59e0b';
            case 'failed': return '#ef4444';
            default: return '#64748b';
        }
    };

    const getTxStatusLabel = (status) => {
        switch (status) {
            case 'completed': return '✅ Thành công';
            case 'pending': return '⏳ Đang xử lý';
            case 'failed': return '❌ Thất bại';
            default: return status;
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0891b2']} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📊 Kế toán</Text>
                <Text style={styles.headerSub}>Báo cáo tài chính & Đối soát</Text>
            </View>

            {loadingReport ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#0891b2" />
                    <Text style={styles.loadingText}>Đang tải báo cáo...</Text>
                </View>
            ) : report ? (
                <>
                    {/* Doanh thu */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>💰 Doanh thu</Text>
                        <View style={styles.revenueGrid}>
                            <View style={[styles.revenueCard, { backgroundColor: '#0891b2' }]}>
                                <Text style={styles.revenueLabel}>Tổng doanh thu</Text>
                                <Text style={styles.revenueAmount}>{fmtVND(report.revenue.total_all_time)}</Text>
                            </View>
                            <View style={[styles.revenueCard, { backgroundColor: '#0d9488' }]}>
                                <Text style={styles.revenueLabel}>Tháng này</Text>
                                <Text style={styles.revenueAmount}>{fmtVND(report.revenue.this_month)}</Text>
                            </View>
                            <View style={[styles.revenueCard, { backgroundColor: '#7c3aed' }]}>
                                <Text style={styles.revenueLabel}>Hôm nay</Text>
                                <Text style={styles.revenueAmount}>{fmtVND(report.revenue.today)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Booking stats */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📋 Thống kê đặt phòng</Text>
                        <View style={styles.statsGrid}>
                            {[
                                { label: 'Tổng đặt phòng', value: report.bookings.total, color: '#1e40af' },
                                { label: 'Đã hoàn tất', value: report.bookings.checked_out, color: '#15803d' },
                                { label: 'Đang hoạt động', value: report.bookings.active, color: '#b45309' },
                                { label: 'Đã hủy', value: report.bookings.cancelled, color: '#b91c1c' },
                            ].map((item, i) => (
                                <View key={i} style={[styles.statCard, { borderLeftColor: item.color }]}>
                                    <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
                                    <Text style={styles.statLabel}>{item.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Công suất phòng */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🏨 Công suất phòng (Occupancy)</Text>
                        <View style={styles.occupancyCard}>
                            <View style={styles.occupancyRow}>
                                <Text style={styles.occupancyLabel}>Tổng phòng</Text>
                                <Text style={styles.occupancyValue}>{report.occupancy.total_rooms} phòng</Text>
                            </View>
                            <View style={styles.occupancyRow}>
                                <Text style={styles.occupancyLabel}>Đang có khách</Text>
                                <Text style={styles.occupancyValue}>{report.occupancy.occupied_rooms} phòng</Text>
                            </View>
                            <View style={[styles.occupancyRow, styles.occupancyHighlight]}>
                                <Text style={styles.occupancyLabel}>Tỷ lệ lấp đầy</Text>
                                <Text style={[styles.occupancyValue, { color: '#0891b2', fontWeight: 'bold' }]}>
                                    {report.occupancy.occupancy_rate_percent}%
                                </Text>
                            </View>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${report.occupancy.occupancy_rate_percent}%` }]} />
                            </View>
                        </View>
                    </View>

                    {/* Night Audit gần đây */}
                    {report.recent_night_audits?.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>🌙 Night Audit gần đây</Text>
                            {report.recent_night_audits.map((audit, i) => (
                                <View key={i} style={styles.auditRow}>
                                    <View>
                                        <Text style={styles.auditDate}>{fmtDate(audit.date)}</Text>
                                        <Text style={styles.auditBy}>bởi {audit.closed_by}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.auditRevenue}>{fmtVND(audit.revenue)}</Text>
                                        <Text style={styles.auditBookings}>{audit.bookings_closed} đơn</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </>
            ) : null}

            {/* Giao dịch gần đây */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>💳 Giao dịch gần đây</Text>
                {loadingTx ? (
                    <ActivityIndicator color="#0891b2" />
                ) : transactions.length === 0 ? (
                    <Text style={styles.emptyText}>Chưa có giao dịch nào.</Text>
                ) : (
                    transactions.map((tx, i) => (
                        <View key={i} style={styles.txCard}>
                            <View style={styles.txRow}>
                                <Text style={styles.txRef}>#{tx.transaction_ref?.slice(-8)}</Text>
                                <Text style={[styles.txStatus, { color: getTxStatusColor(tx.status) }]}>
                                    {getTxStatusLabel(tx.status)}
                                </Text>
                            </View>
                            <View style={styles.txRow}>
                                <Text style={styles.txInfo}>Booking #{tx.booking_id}</Text>
                                <Text style={styles.txAmount}>{fmtVND(tx.amount)}</Text>
                            </View>
                            <Text style={styles.txDate}>{fmtDate(tx.created_at)}</Text>
                        </View>
                    ))
                )}
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    centered: { alignItems: 'center', padding: 30 },
    loadingText: { color: '#64748b', marginTop: 8 },
    header: { backgroundColor: '#0c4a6e', padding: 20, paddingTop: 50 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: '#7dd3fc', marginTop: 2 },
    section: { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0c4a6e', marginBottom: 14 },
    revenueGrid: { gap: 10 },
    revenueCard: { borderRadius: 10, padding: 14 },
    revenueLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
    revenueAmount: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCard: { flex: 1, minWidth: '45%', borderLeftWidth: 3, backgroundColor: '#f8fafc', borderRadius: 8, padding: 12 },
    statValue: { fontSize: 22, fontWeight: 'bold' },
    statLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
    occupancyCard: { backgroundColor: '#f0f9ff', borderRadius: 10, padding: 14 },
    occupancyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e0f2fe' },
    occupancyHighlight: { borderBottomWidth: 0 },
    occupancyLabel: { fontSize: 14, color: '#475569' },
    occupancyValue: { fontSize: 14, color: '#0f172a' },
    progressBar: { height: 8, backgroundColor: '#e0f2fe', borderRadius: 4, marginTop: 10 },
    progressFill: { height: 8, backgroundColor: '#0891b2', borderRadius: 4 },
    auditRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    auditDate: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
    auditBy: { fontSize: 11, color: '#64748b' },
    auditRevenue: { fontSize: 14, fontWeight: '700', color: '#0891b2' },
    auditBookings: { fontSize: 11, color: '#64748b' },
    txCard: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 8 },
    txRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    txRef: { fontSize: 13, fontWeight: '600', color: '#334155', fontFamily: 'monospace' },
    txStatus: { fontSize: 12, fontWeight: '600' },
    txInfo: { fontSize: 12, color: '#64748b' },
    txAmount: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
    txDate: { fontSize: 11, color: '#94a3b8' },
    emptyText: { color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },
    logoutBtn: { backgroundColor: '#ef4444', margin: 12, marginTop: 16, padding: 14, borderRadius: 10, alignItems: 'center' },
    logoutText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
