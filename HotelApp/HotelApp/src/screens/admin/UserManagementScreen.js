import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import apiClient from '../../api/apiClient';

const ROLE_COLOR = {
    'super admin': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    'admin':       { bg: '#ede9fe', text: '#5b21b6', border: '#7c3aed' },
    'moderator':   { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
    'lễ tân':      { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
    'customer':    { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' },
};

const ROLE_ICON = {
    'super admin': '👑',
    'admin':       '🛡️',
    'moderator':   '⚡',
    'lễ tân':      '🏨',
    'customer':    '👤',
};

function RoleBadge({ roleName }) {
    const key = (roleName || '').toLowerCase();
    const style = ROLE_COLOR[key] || { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' };
    const icon = ROLE_ICON[key] || '👤';
    return (
        <View style={[styles.badge, { backgroundColor: style.bg, borderColor: style.border }]}>
            <Text style={[styles.badgeText, { color: style.text }]}>
                {icon} {roleName}
            </Text>
        </View>
    );
}

export default function UserManagementScreen({ navigation }) {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalUser, setModalUser] = useState(null);
    const [changingRole, setChangingRole] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                apiClient.get('/admin/users'),
                apiClient.get('/admin/roles'),
            ]);
            setUsers(usersRes.data || []);
            setRoles(rolesRes.data || []);
        } catch (err) {
            Alert.alert('Lỗi', 'Không thể tải dữ liệu. Kiểm tra quyền truy cập.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const unsub = navigation.addListener('focus', fetchData);
        return unsub;
    }, [navigation]);

    const handleChangeRole = async (userId, newRoleId, newRoleName) => {
        setChangingRole(true);
        try {
            const res = await apiClient.put(`/admin/users/${userId}/role`, { role_id: newRoleId });
            Alert.alert('✅ Thành công', res.data.message);
            setModalUser(null);
            fetchData();
        } catch (err) {
            Alert.alert('Lỗi', err.response?.data?.detail || 'Không thể thay đổi quyền.');
        } finally {
            setChangingRole(false);
        }
    };

    const handleDeleteUser = (user) => {
        Alert.alert(
            '⚠️ Xác nhận xóa',
            `Bạn có chắc muốn xóa tài khoản "${user.username}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiClient.delete(`/admin/users/${user.id}`);
                            Alert.alert('✅', `Đã xóa tài khoản ${user.username}`);
                            fetchData();
                        } catch (err) {
                            Alert.alert('Lỗi', err.response?.data?.detail || 'Không thể xóa.');
                        }
                    },
                },
            ]
        );
    };

    const renderUser = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <View style={styles.userInfo}>
                    <Text style={styles.username}>{item.username}</Text>
                    {item.full_name ? (
                        <Text style={styles.fullName}>{item.full_name}</Text>
                    ) : null}
                    {item.created_at ? (
                        <Text style={styles.createdAt}>
                            Tạo: {item.created_at.split('T')[0]}
                        </Text>
                    ) : null}
                </View>
                <RoleBadge roleName={item.role_name} />
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={styles.editRoleBtn}
                    onPress={() => setModalUser(item)}
                >
                    <Text style={styles.editRoleBtnText}>🔄 Đổi quyền</Text>
                </TouchableOpacity>
                {item.role_name?.toLowerCase() !== 'super admin' && (
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteUser(item)}
                    >
                        <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Quay lại</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>👥 Quản lý Người dùng</Text>
                <Text style={styles.headerSub}>
                    {users.length} tài khoản trong hệ thống
                </Text>
            </View>

            {/* Legend */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legendRow}>
                {Object.entries(ROLE_ICON).map(([key, icon]) => (
                    <View key={key} style={[styles.legendItem, { backgroundColor: ROLE_COLOR[key]?.bg }]}>
                        <Text style={{ fontSize: 12, color: ROLE_COLOR[key]?.text, fontWeight: '600' }}>
                            {icon} {key}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text style={styles.loadingText}>Đang tải danh sách...</Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderUser}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Không có người dùng nào.</Text>
                    }
                />
            )}

            {/* Role Change Modal */}
            <Modal
                visible={!!modalUser}
                transparent
                animationType="slide"
                onRequestClose={() => setModalUser(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>
                            Đổi quyền cho: {modalUser?.username}
                        </Text>
                        <Text style={styles.modalCurrent}>
                            Hiện tại: <Text style={{ fontWeight: 'bold' }}>{modalUser?.role_name}</Text>
                        </Text>

                        {roles.map(role => {
                            const isCurrentRole = role.id === modalUser?.role_id;
                            const key = role.name.toLowerCase();
                            const colors = ROLE_COLOR[key] || { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' };
                            return (
                                <TouchableOpacity
                                    key={role.id}
                                    style={[
                                        styles.roleOption,
                                        { borderColor: colors.border, backgroundColor: colors.bg },
                                        isCurrentRole && styles.roleOptionCurrent,
                                    ]}
                                    onPress={() => !isCurrentRole && handleChangeRole(modalUser.id, role.id, role.name)}
                                    disabled={isCurrentRole || changingRole}
                                >
                                    <Text style={[styles.roleOptionText, { color: colors.text }]}>
                                        {ROLE_ICON[key] || '👤'} {role.name}
                                        {isCurrentRole ? ' ← Hiện tại' : ''}
                                    </Text>
                                    {role.description ? (
                                        <Text style={styles.roleOptionDesc}>{role.description}</Text>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}

                        {changingRole && <ActivityIndicator color="#4f46e5" style={{ marginTop: 12 }} />}

                        <TouchableOpacity style={styles.modalClose} onPress={() => setModalUser(null)}>
                            <Text style={styles.modalCloseText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        gap: 4,
    },
    backBtn: { color: '#a5b4fc', fontSize: 14, fontWeight: '600', marginBottom: 4 },
    headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    headerSub: { color: '#818cf8', fontSize: 12 },
    legendRow: { paddingHorizontal: 12, paddingVertical: 10, maxHeight: 52 },
    legendItem: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        marginRight: 8,
    },
    list: { padding: 12, gap: 10 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    userInfo: { flex: 1, marginRight: 12 },
    username: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    fullName: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    createdAt: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    badgeText: { fontSize: 12, fontWeight: '700' },
    cardActions: { flexDirection: 'row', gap: 10 },
    editRoleBtn: {
        flex: 1,
        backgroundColor: '#ede9fe',
        borderRadius: 8,
        paddingVertical: 9,
        alignItems: 'center',
    },
    editRoleBtnText: { color: '#5b21b6', fontWeight: '700', fontSize: 13 },
    deleteBtn: {
        backgroundColor: '#fee2e2',
        borderRadius: 8,
        paddingVertical: 9,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    deleteBtnText: { fontSize: 16 },
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: '#6b7280', fontSize: 14 },
    emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalBox: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a3e', marginBottom: 4 },
    modalCurrent: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
    roleOption: {
        borderRadius: 12,
        borderWidth: 1.5,
        padding: 14,
        marginBottom: 10,
    },
    roleOptionCurrent: { opacity: 0.5 },
    roleOptionText: { fontSize: 15, fontWeight: '700' },
    roleOptionDesc: { fontSize: 12, color: '#6b7280', marginTop: 3 },
    modalClose: {
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    modalCloseText: { color: '#374151', fontWeight: '700', fontSize: 15 },
});
