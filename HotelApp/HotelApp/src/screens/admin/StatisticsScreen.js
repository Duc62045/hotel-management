import { CommonActions } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/apiClient';

export default function StatisticsScreen({ navigation }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await apiClient.get('/statistics');
                setStats(res.data);
            } catch {
                Alert.alert('Lỗi', 'Không có quyền truy cập hoặc lỗi kết nối');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('role');
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            })
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.welcome}>{stats?.message}</Text>

            <View style={styles.cardRow}>
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Tổng doanh thu</Text>
                    <Text style={styles.cardValue}>
                        {stats?.total_revenue?.toLocaleString('vi-VN')} ₫
                    </Text>
                </View>
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Tổng đặt phòng</Text>
                    <Text style={styles.cardValue}>{stats?.total_bookings}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    welcome: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a2e',
        marginBottom: 24,
        textAlign: 'center',
    },
    cardRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
    },
    cardLabel: { fontSize: 13, color: '#666', marginBottom: 8 },
    cardValue: { fontSize: 22, fontWeight: 'bold', color: '#4f46e5' },
    logoutButton: {
        backgroundColor: '#ef4444',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 'auto',
    },
    logoutText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});