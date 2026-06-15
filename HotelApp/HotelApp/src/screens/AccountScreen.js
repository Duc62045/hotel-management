import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

const ROLE_LABEL = {
    'super admin':  '👑 Chủ khách sạn (Super Admin)',
    admin:          '👔 Quản lý (Admin)',
    moderator:      '🎯 Điều phối viên (Moderator)',
    'lễ tân':       '🛎️ Lễ tân',
    receptionist:   '🛎️ Lễ tân',
    housekeeping:   '🧹 Buồng phòng (Housekeeping)',
    'kế toán':      '📊 Kế toán',
    customer:       '🏨 Khách hàng',
    guest:          '🏨 Khách hàng',
};

// Menu điều hướng theo role
const ROLE_MENUS = {
    'super admin': [
        { label: '🏠 Quản lý phòng',          route: 'RoomList',        color: '#4f46e5' },
        { label: '📊 Thống kê',                route: 'Statistics',      color: '#0891b2' },
        { label: '👥 Quản lý nhân sự',         route: 'UserManagement',  color: '#7c3aed' },
        { label: '✅ Duyệt yêu cầu',           route: 'Approvals',       color: '#059669' },
        { label: '🌙 Night Audit',             route: 'NightAudit',      color: '#1d4ed8' },
        { label: '📋 Nhật ký hành động',       route: 'AuditLog',        color: '#b45309' },
    ],
    admin: [
        { label: '🏠 Quản lý phòng',          route: 'RoomList',        color: '#4f46e5' },
        { label: '📊 Thống kê',                route: 'Statistics',      color: '#0891b2' },
        { label: '👥 Quản lý nhân sự',         route: 'UserManagement',  color: '#7c3aed' },
        { label: '✅ Duyệt yêu cầu',           route: 'Approvals',       color: '#059669' },
        { label: '🌙 Night Audit',             route: 'NightAudit',      color: '#1d4ed8' },
        { label: '📋 Nhật ký hành động',       route: 'AuditLog',        color: '#b45309' },
    ],
    moderator: [
        { label: '🛎️ Đặt phòng',              route: 'Booking',         color: '#4f46e5' },
        { label: '👤 Khách hàng',              route: 'Customer',        color: '#059669' },
        { label: '✅ Duyệt yêu cầu',           route: 'Approvals',       color: '#7c3aed' },
        { label: '🌙 Night Audit',             route: 'NightAudit',      color: '#1d4ed8' },
    ],
    'lễ tân': [
        { label: '🛎️ Đặt phòng',              route: 'Booking',         color: '#4f46e5' },
        { label: '👤 Khách hàng',              route: 'Customer',        color: '#059669' },
        { label: '📤 Gửi yêu cầu',            route: 'Approvals',       color: '#b45309' },
    ],
    housekeeping: [
        { label: '🧹 Buồng phòng',             route: 'Housekeeping',    color: '#0d9488' },
    ],
    'kế toán': [
        { label: '📊 Báo cáo tài chính',       route: 'Accountant',      color: '#0891b2' },
        { label: '🌙 Night Audit',             route: 'NightAudit',      color: '#1d4ed8' },
    ],
    customer: [
        { label: '📋 Đơn đặt phòng của tôi',  route: 'MyBookings',      color: '#4f46e5' },
        { label: '👤 Hồ sơ cá nhân',          route: 'MyProfile',       color: '#059669' },
    ],
    guest: [
        { label: '📋 Đơn đặt phòng của tôi',  route: 'MyBookings',      color: '#4f46e5' },
        { label: '👤 Hồ sơ cá nhân',          route: 'MyProfile',       color: '#059669' },
    ],
};

export default function AccountScreen({ navigation }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await apiClient.get('/me');
                setUser(res.data);
            } catch {
                Alert.alert('Lỗi', 'Không thể tải thông tin tài khoản');
            } finally {
                setLoading(false);
            }
        };
        fetchMe();
    }, []);

    const handleLogout = async () => {
        await AsyncStorage.multiRemove(['token', 'role']);
        navigation.replace('Landing');
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    const roleKey = user?.role_name?.toLowerCase() || 'guest';
    const menus = ROLE_MENUS[roleKey] || ROLE_MENUS.guest;

    return (
        <ScrollView style={styles.container}>
            {/* Profile Card */}
            <View style={styles.profileCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {(user?.full_name || user?.username || '?')[0].toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.fullName}>{user?.full_name || user?.username}</Text>
                <Text style={styles.username}>@{user?.username}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{ROLE_LABEL[roleKey] || user?.role_name}</Text>
                </View>
            </View>

            {/* Quick Access Menu — điều hướng theo role */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chức năng của bạn</Text>
                <View style={styles.menuGrid}>
                    {menus.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.menuItem, { borderLeftColor: item.color }]}
                            onPress={() => navigation.navigate(item.route)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Text style={[styles.menuArrow, { color: item.color }]}>›</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Account Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
                {[
                    { label: 'Tên đăng nhập', value: user?.username },
                    { label: 'Họ và tên', value: user?.full_name || '—' },
                    { label: 'Vai trò', value: ROLE_LABEL[roleKey] || user?.role_name },
                    { label: 'ID tài khoản', value: `#${user?.id}` },
                ].map((row, i) => (
                    <View key={i} style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{row.label}</Text>
                        <Text style={styles.infoValue}>{row.value}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    profileCard: {
        backgroundColor: '#1e3a5f',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
    fullName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    username: { fontSize: 13, color: '#93c5fd', marginBottom: 12 },
    roleBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    roleText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    menuGrid: { gap: 8 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        padding: 14,
        borderLeftWidth: 4,
    },
    menuLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
    menuArrow: { fontSize: 22, fontWeight: 'bold' },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoLabel: { fontSize: 14, color: '#666' },
    infoValue: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', maxWidth: '60%', textAlign: 'right' },
    logoutButton: {
        backgroundColor: '#ef4444',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 30,
    },
    logoutText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
