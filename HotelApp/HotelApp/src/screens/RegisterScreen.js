import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import apiClient from '../api/apiClient';

export default function RegisterScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState('');

    const handleRegister = async () => {
        setErrorText('');

        // 1. Kiểm tra nhập thiếu
        const missingFields = [];
        if (!username.trim()) missingFields.push('Tên đăng nhập');
        if (!email.trim()) missingFields.push('Email');
        if (!password) missingFields.push('Mật khẩu');

        if (missingFields.length > 0) {
            setErrorText(`Vui lòng điền đầy đủ: ${missingFields.join(', ')}`);
            return;
        }

        // 2. Kiểm tra định dạng tên đăng nhập
        if (username.trim().length < 4) {
            setErrorText('Tên đăng nhập phải có ít nhất 4 ký tự.');
            return;
        }
        if (/\s/.test(username)) {
            setErrorText('Tên đăng nhập không được chứa khoảng trắng.');
            return;
        }

        // 3. Kiểm tra định dạng Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setErrorText('Email không đúng định dạng (Ví dụ: example@gmail.com).');
            return;
        }

        // 4. Kiểm tra độ mạnh Mật khẩu (Password Policy)
        const passwordErrors = [];
        if (password.length < 8) {
            passwordErrors.push('Ít nhất 8 ký tự (Hiện tại: ' + password.length + ')');
        }
        if (!/[A-Z]/.test(password)) {
            passwordErrors.push('Chứa ít nhất 1 chữ in hoa (A-Z)');
        }
        if (!/[a-z]/.test(password)) {
            passwordErrors.push('Chứa ít nhất 1 chữ in thường (a-z)');
        }
        if (!/\d/.test(password)) {
            passwordErrors.push('Chứa ít nhất 1 chữ số (0-9)');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/`~]/.test(password)) {
            passwordErrors.push('Chứa ít nhất 1 ký tự đặc biệt (!@#...)');
        }

        if (passwordErrors.length > 0) {
            setErrorText(`Mật khẩu chưa đủ mạnh:\n- ${passwordErrors.join('\n- ')}`);
            return;
        }

        setLoading(true);
        try {
            await apiClient.post('/register', {
                username: username.trim(),
                password: password,
                email: email.trim(),
                full_name: fullName.trim(),
                role_id: 2
            });

            Alert.alert('Thành công', 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.');
            navigation.navigate('Login');
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
                        if (field === 'email') fieldFriendly = 'Email: ';
                        return `${fieldFriendly}${msg}`;
                    }).join('\n');
                } else {
                    errorMsg = JSON.stringify(detail);
                }
            }
            setErrorText(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Đăng ký Tài khoản</Text>
            <Text style={styles.subtitle}>Tạo tài khoản mới để đặt phòng</Text>

            <TextInput
                style={styles.input}
                placeholder="Tên đăng nhập (*)"
                value={username}
                onChangeText={(text) => {
                    setUsername(text);
                    setErrorText('');
                }}
                autoCapitalize="none"
            />
            <Text style={styles.hintText}>* Tối thiểu 4 ký tự, không chứa khoảng trắng.</Text>

            <TextInput
                style={styles.input}
                placeholder="Mật khẩu (*)"
                value={password}
                onChangeText={(text) => {
                    setPassword(text);
                    setErrorText('');
                }}
                secureTextEntry
            />
            <Text style={styles.hintText}>* Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số, ký tự đặc biệt (!@#...).</Text>

            <TextInput
                style={styles.input}
                placeholder="Email (*)"
                value={email}
                onChangeText={(text) => {
                    setEmail(text);
                    setErrorText('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <Text style={styles.hintText}>* Định dạng chuẩn (Ví dụ: example@gmail.com).</Text>

            <TextInput
                style={styles.input}
                placeholder="Họ và tên (Tùy chọn)"
                value={fullName}
                onChangeText={(text) => {
                    setFullName(text);
                    setErrorText('');
                }}
            />

            {errorText ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorText}</Text>
                </View>
            ) : null}

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Đăng ký ngay</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Đã có tài khoản? Quay lại Đăng nhập</Text>
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
        marginBottom: 32,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    hintText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: -4,
        marginBottom: 16,
        paddingLeft: 4,
        lineHeight: 16,
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
        lineHeight: 20,
        textAlign: 'left',
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#22c55e',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8,
        elevation: 2,
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
