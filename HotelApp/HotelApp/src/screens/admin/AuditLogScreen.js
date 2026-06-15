import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    FlatList, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import apiClient from '../../api/apiClient';

const ACTION_CONFIG = {
    CANCEL_BOOKING:    { icon: '❌', label: 'Hủy booking',      color: '#ef4444', bg: '#fef2f2' },
    CHANGE_ROOM_STATUS:{ icon: '🔄', label: 'Đổi trạng thái phòng', color: '#f59e0b', bg: '#fffbeb' },
    CHANGE_ROLE:       { icon: '👤', label: 'Đổi vai trò',      color: '#8b5cf6', bg: '#f5f3ff' },
    NIGHT_AUDIT_CLOSE: { icon: '🌙', label: 'Chốt sổ đêm',      color: '#3b82f6', bg: '#eff6ff' },
    CLOSE_WORK_SHIFT:  { icon: '🕐', label: 'Đóng ca',          color: '#0d9488', bg: '#f0fdfa' },
    DELETE_USER:       { icon: '🗑️', label: 'Xóa người dùng',  color: '#ef4444', bg: '#fef2f2' },
};

const fmtDateTime = (str) => {
    if (!str) return '—';
    try {
        const d = new Date(str);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ` +
            `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch { return str; }
};

const parseJson = (str) => {
    if (!str) return null;
    try { return JSON.parse(str); } catch { return str; }
};

export default function AuditLogScreen({ navigation }) {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLogs = useCallback(async () => {
        try {
            const res = await apiClient.get('/admin/audit-log?limit=50');
            setLogs(res.data.logs || []);
            setTotal(res.data.total || 0);
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể tải nhật ký');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const onRefresh = () => { setRefreshing(true); fetchLogs(); };

    const renderLog = ({ item }) => {
        const cfg = ACTION_CONFIG[item.action] || {
            icon: '📝', label: item.action, color: '#64748b', bg: '#f8fafc'
        };
        const oldVal = parseJson(item.old_value);
        const newVal = parseJson(item.new_value);

        return (
            <View style={[styles.logCard, { borderLeftColor: cfg.color }]}>
                {/* Header */}
                <View style={styles.logHeader}>
                    <View style={[styles.actionBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={styles.actionIcon}>{cfg.icon}</Text>
                        <Text style={[styles.actionLabel, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.logTime}>{fmtDateTime(item.created_at)}</Text>
                </View>

                {/* Who */}
                <View style={styles.logRow}>
                    <Text style={styles.logMeta}>👤 <Text style={styles.bold}>{item.username || 'system'}</Text></Text>
                    {item.entity_type && (
                        <Text style={styles.logMeta}>
                            🎯 {item.entity_type} #{item.entity_id}
                        </Text>
                    )}
                </View>

                {/* Old → New values */}
                {(oldVal || newVal) && (
                    <View style={styles.valuesContainer}>
                        {oldVal && (
                            <View style={[styles.valueBox, styles.oldValueBox]}>
                                <Text style={styles.valueLabel}>Trước</Text>
                                <Text style={styles.valueText} numberOfLines={3}>
                                    {typeof oldVal === 'object'
                                        ? Object.entries(oldVal).map(([k, v]) => `${k}: ${v}`).join('\n')
                                        : String(oldVal)}
                                </Text>
                            </View>
                        )}
                        {newVal && (
                            <View style={[styles.valueBox, styles.newValueBox]}>
                                <Text style={styles.valueLabel}>Sau</Text>
                                <Text style={styles.valueText} numberOfLines={3}>
                                    {typeof newVal === 'object'
                                        ? Object.entries(newVal).map(([k, v]) => `${k}: ${v}`).join('\n')
                                        : String(newVal)}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Reason */}
                {item.reason && (
                    <Text style={styles.reason}>💬 Lý do: {item.reason}</Text>
                )}

                {/* IP */}
                {item.ip_address && (
                    <Text style={styles.ip}>🌐 IP: {item.ip_address}</Text>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1e40af" />
                <Text style={styles.loadingText}>Đang tải nhật ký...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📋 Audit Trail</Text>
                <Text style={styles.headerSub}>Nhật ký hành động hệ thống • {total} bản ghi</Text>
            </View>

            <FlatList
                data={logs}
                keyExtractor={item => String(item.id)}
                renderItem={renderLog}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1e40af']} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyText}>Chưa có bản ghi nhật ký nào.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
    loadingText: { color: '#64748b', marginTop: 8 },
    header: { backgroundColor: '#1e3a5f', padding: 20, paddingTop: 50 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 12, color: '#93c5fd', marginTop: 2 },
    list: { padding: 12, gap: 10 },
    logCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 3,
    },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    actionBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
    actionIcon: { fontSize: 14 },
    actionLabel: { fontSize: 12, fontWeight: '700' },
    logTime: { fontSize: 11, color: '#94a3b8' },
    logRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    logMeta: { fontSize: 12, color: '#475569' },
    bold: { fontWeight: '700', color: '#1e293b' },
    valuesContainer: { flexDirection: 'row', gap: 8, marginVertical: 8 },
    valueBox: { flex: 1, borderRadius: 6, padding: 8 },
    oldValueBox: { backgroundColor: '#fef2f2' },
    newValueBox: { backgroundColor: '#f0fdf4' },
    valueLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase' },
    valueText: { fontSize: 11, color: '#374151', fontFamily: 'monospace', lineHeight: 16 },
    reason: { fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
    ip: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 50, marginBottom: 12 },
    emptyText: { color: '#94a3b8', fontSize: 15 },
});
