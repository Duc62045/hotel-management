import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import apiClient from '../api/apiClient';

export default function ForgotPasswordScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailNotRegistered, setEmailNotRegistered] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleEmailChange = (value) => {
        setEmail(value);
        setEmailNotRegistered(false);
        setSuccessMessage('');
    };

    const handleSendRecoveryEmail = async () => {
        if (!email) {
            Alert.alert('Lỗi', 'Vui lòng nhập email');
            return;
        }
        setLoading(true);
        setEmailNotRegistered(false);
        setSuccessMessage('');
        try {
            const res = await apiClient.post('/auth/forgot-password', { email });
            if (res.data.email_sent) {
                setSuccessMessage(res.data.message || 'Đã gửi email khôi phục. Vui lòng kiểm tra hộp thư (cả mục Spam).');
            } else {
                Alert.alert(
                    'Chưa gửi được email',
                    `${res.data.message || ''}\n\nLink test:\n${res.data.reset_debug_link || ''}`
                );
            }
        } catch (error) {
            const status = error.response?.status;
            const detail = error.response?.data?.detail || '';
            const isNotFound =
                status === 404 ||
                detail.toLowerCase().includes('chưa đăng ký') ||
                detail.toLowerCase().includes('không tìm thấy');

            if (isNotFound) {
                setEmailNotRegistered(true);
            } else {
                Alert.alert('Lỗi', detail || 'Không thể gửi email khôi phục');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Quên mật khẩu</Text>
            <Text style={styles.subtitle}>Nhập email đã đăng ký để nhận link khôi phục tài khoản</Text>

            <TextInput
                style={[styles.input, emailNotRegistered && styles.inputError]}
                placeholder="Email"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            {emailNotRegistered && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorTitle}>Email chưa đăng ký</Text>
                    <Text style={styles.errorText}>
                        Địa chỉ <Text style={styles.emailHighlight}>{email}</Text> chưa có trong hệ thống.
                        Vui lòng kiểm tra lại hoặc tạo tài khoản mới.
                    </Text>
                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={styles.registerButtonText}>Đăng ký tài khoản mới</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!!successMessage && (
                <View style={styles.successBox}>
                    <Text style={styles.successTitle}>Đã gửi email</Text>
                    <Text style={styles.successText}>{successMessage}</Text>
                </View>
            )}

            <TouchableOpacity style={styles.button} onPress={handleSendRecoveryEmail} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gửi email khôi phục</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backText}>Quay lại đăng nhập</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#1a1a2e',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        color: '#666',
        marginBottom: 24,
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
    inputError: {
        borderColor: '#ef4444',
        borderWidth: 2,
        backgroundColor: '#fef2f2',
    },
    errorBox: {
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#b91c1c',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#7f1d1d',
        lineHeight: 22,
        marginBottom: 14,
    },
    emailHighlight: {
        fontWeight: '700',
        color: '#991b1b',
    },
    registerButton: {
        backgroundColor: '#ef4444',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    registerButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    successBox: {
        backgroundColor: '#ecfdf5',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    successTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#047857',
        marginBottom: 6,
    },
    successText: {
        fontSize: 14,
        color: '#065f46',
        lineHeight: 20,
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
    backButton: {
        marginTop: 14,
        alignItems: 'center',
    },
    backText: {
        color: '#4f46e5',
        fontWeight: '600',
        fontSize: 14,
    },
});
