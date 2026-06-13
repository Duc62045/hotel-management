import { CommonActions } from '@react-navigation/native';
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState('');

    const goToRoleHome = async () => {
        const userRes = await apiClient.get('/me');
        const role = userRes.data.role_name?.toLowerCase()?.trim() || '';
        await AsyncStorage.setItem('role', role);

        let targetScreen = 'MyBookings';
        if (role === 'admin' || role === 'super admin' || role === 'moderator') {
            targetScreen = 'RoomList';
        } else if (role.includes('lễ tân') || role.includes('le tan') || role === 'receptionist') {
            targetScreen = 'Customer';
        } else {
            try {
                const bookingsRes = await apiClient.get('/my-bookings');
                const msg = bookingsRes.data.message || '';
                if (!bookingsRes.data.bookings && msg.includes('chưa cập nhật')) {
                    targetScreen = 'MyProfile';
                }
            } catch {
                // Giữ MyBookings nếu không kiểm tra được
            }
        }

        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: targetScreen }],
            })
        );
    };

    const handleLogin = async () => {
        setErrorText('');

        // 1. Kiểm tra nhập thiếu từng trường
        const missingFields = [];
        if (!username.trim()) missingFields.push('Tên đăng nhập');
        if (!password) missingFields.push('Mật khẩu');

        if (missingFields.length > 0) {
            setErrorText(`Vui lòng nhập đầy đủ: ${missingFields.join(' & ')}`);
            return;
        }

        setLoading(true);
        try {
            const body = new URLSearchParams();
            body.append('username', username.trim());
            body.append('password', password);

            const res = await apiClient.post('/login', body.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            if (!res.data.access_token) {
                setErrorText('Đăng nhập chưa hoàn tất, thiếu access token');
                return;
            }
            await AsyncStorage.setItem('token', res.data.access_token);
            await goToRoleHome();
        } catch (error) {
            let errorMsg = 'Không kết nối được máy chủ. Kiểm tra backend và địa chỉ API.';
            const detail = error.response?.data?.detail;

            if (detail) {
                if (typeof detail === 'string') {
                    errorMsg = detail;
                } else if (Array.isArray(detail)) {
                    errorMsg = detail.map(err => {
                        let msg = err.msg || '';
                        if (msg.startsWith('Value error, ')) {
                            msg = msg.replace('Value error, ', '');
                        }
                        const field = err.loc?.[err.loc.length - 1];
                        let fieldFriendly = '';
                        if (field === 'username') fieldFriendly = 'Tên đăng nhập: ';
                        if (field === 'password') fieldFriendly = 'Mật khẩu: ';
                        return `${fieldFriendly}${msg}`;
                    }).join('\n');
                } else {
                    errorMsg = JSON.stringify(detail);
                }
            }

            if (error.response?.status === 403) {
                setErrorText(`Tài khoản bị khóa: ${errorMsg}`);
            } else if (error.response?.status === 429) {
                setErrorText('Yêu cầu quá nhanh. Vui lòng đợi một lát trước khi thử lại.');
            } else {
                setErrorText(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Landing')}>
                <Text style={styles.backBtnText}>← Trang chủ</Text>
            </TouchableOpacity>

            <Text style={styles.staffBadge}>🔐 Khu vực Nhân viên</Text>
            <Text style={styles.title}>Quản lý Khách sạn</Text>
            <Text style={styles.subtitle}>Đăng nhập dành cho Admin & Lễ tân</Text>

            <TextInput
                style={styles.input}
                placeholder="Tên đăng nhập"
                value={username}
                onChangeText={(text) => {
                    setUsername(text);
                    setErrorText('');
                }}
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                value={password}
                onChangeText={(text) => {
                    setPassword(text);
                    setErrorText('');
                }}
                secureTextEntry
            />

            {errorText ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorText}</Text>
                </View>
            ) : null}

            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Đăng nhập</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.linkText}>Quên mật khẩu?</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#f0f4ff',
    },
    backBtn: { marginBottom: 16 },
    backBtnText: { color: '#4f46e5', fontSize: 14, fontWeight: '600' },
    staffBadge: {
        textAlign: 'center',
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#1a1a3e',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        color: '#666',
        marginBottom: 32,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    errorContainer: {
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#fca5a5',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#4f46e5',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: '#4f46e5',
        fontSize: 14,
        fontWeight: '500',
    },
});
