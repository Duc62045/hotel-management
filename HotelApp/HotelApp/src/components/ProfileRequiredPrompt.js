import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ProfileRequiredPrompt({ onUpdateProfile, compact = false }) {
    if (compact) {
        return (
            <View style={styles.compactBox}>
                <Text style={styles.compactTitle}>Cần cập nhật hồ sơ trước khi đặt phòng</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={onUpdateProfile}>
                    <Text style={styles.primaryButtonText}>Cập nhật hồ sơ ngay</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.iconCircle}>
                <Text style={styles.iconText}>!</Text>
            </View>
            <Text style={styles.title}>Chưa thể đặt phòng</Text>
            <Text style={styles.description}>
                Tài khoản của bạn chưa có hồ sơ khách hàng. Vui lòng cập nhật thông tin bên dưới để tiếp tục đặt phòng.
            </Text>

            <View style={styles.checklist}>
                <Text style={styles.checkItem}>• Số điện thoại</Text>
                <Text style={styles.checkItem}>• Số CCCD / CMND</Text>
                <Text style={styles.checkItem}>• Họ và tên (tùy chọn)</Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={onUpdateProfile}>
                <Text style={styles.primaryButtonText}>Cập nhật hồ sơ ngay</Text>
            </TouchableOpacity>

            <Text style={styles.note}>
                Sau khi lưu hồ sơ, quay lại màn hình này để đặt phòng.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff7ed',
        borderRadius: 16,
        padding: 24,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#fdba74',
        alignItems: 'center',
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#f97316',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    iconText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#9a3412',
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: '#7c2d12',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 16,
    },
    checklist: {
        alignSelf: 'stretch',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#fed7aa',
    },
    checkItem: {
        fontSize: 14,
        color: '#444',
        marginBottom: 6,
    },
    primaryButton: {
        backgroundColor: '#ea580c',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 10,
        alignSelf: 'stretch',
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    note: {
        marginTop: 14,
        fontSize: 12,
        color: '#a16207',
        textAlign: 'center',
    },
    compactBox: {
        backgroundColor: '#fef3c7',
        borderRadius: 10,
        padding: 14,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#fcd34d',
    },
    compactTitle: {
        fontSize: 13,
        color: '#92400e',
        marginBottom: 10,
        fontWeight: '600',
    },
});
