import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

const ROLE_LABEL = {
    admin: 'Quản trị viên',
    'lễ tân': 'Lễ tân',
    receptionist: 'Lễ tân',
    guest: 'Khách hàng',
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
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('role');
        navigation.replace('Login');
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    const roleKey = user?.role_name?.toLowerCase() || '';

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Thông tin tài khoản</Text>

                <View style={styles.row}>
                    <Text style={styles.label}>Tên đăng nhập</Text>
                    <Text style={styles.value}>{user?.username}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Họ và tên</Text>
                    <Text style={styles.value}>{user?.full_name || '—'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Vai trò</Text>
                    <Text style={styles.value}>{ROLE_LABEL[roleKey] || user?.role_name}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>ID tài khoản</Text>
                    <Text style={styles.value}>{user?.id}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 20 },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    label: { fontSize: 14, color: '#666' },
    value: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', maxWidth: '60%', textAlign: 'right' },
    logoutButton: {
        backgroundColor: '#ef4444',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    logoutText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
