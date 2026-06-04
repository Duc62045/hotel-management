import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import apiClient from '../../api/apiClient';

export default function MyProfileScreen({ navigation }) {
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [idCard, setIdCard] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSaveProfile = async () => {
        if (!phone || !idCard) {
            Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại và CCCD');
            return;
        }
        setLoading(true);
        try {
            await apiClient.post('/my-profile', {
                full_name: fullName,
                phone: phone,
                id_card: idCard,
            });
            Alert.alert('Thành công', 'Hồ sơ đã được lưu! Bạn có thể đặt phòng ngay bây giờ.');
            navigation.replace('MyBookings');
        } catch (e) {
            const msg = e.response?.data?.detail;
            if (msg === 'Bạn đã có hồ sơ cá nhân rồi.') {
                Alert.alert('Thông báo', msg);
                navigation.replace('MyBookings');
            } else {
                Alert.alert('Lỗi', msg || 'Không thể lưu hồ sơ');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Cập nhật hồ sơ cá nhân</Text>
                <Text style={styles.subtitle}>
                    Bạn cần điền CCCD và số điện thoại trước khi đặt phòng.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Họ và tên (không bắt buộc)"
                    value={fullName}
                    onChangeText={setFullName}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Số điện thoại"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Số CCCD"
                    value={idCard}
                    onChangeText={setIdCard}
                    keyboardType="numeric"
                    secureTextEntry
                />

                <Text style={styles.secureNote}>
                    🔒 CCCD của bạn được mã hóa trước khi lưu vào hệ thống
                </Text>

                <TouchableOpacity style={styles.button} onPress={handleSaveProfile} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Lưu hồ sơ</Text>}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
    subtitle: { fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 20 },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        fontSize: 14,
    },
    secureNote: {
        fontSize: 12,
        color: '#22c55e',
        marginBottom: 16,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#4f46e5',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});