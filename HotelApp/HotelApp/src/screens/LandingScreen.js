import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    StatusBar, SafeAreaView,
} from 'react-native';

export default function LandingScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a3e" />

            {/* Header / Hero */}
            <View style={styles.hero}>
                <Text style={styles.hotelIcon}>🏨</Text>
                <Text style={styles.hotelName}>Grand Palace Hotel</Text>
                <Text style={styles.tagline}>Nơi mỗi khoảnh khắc đều trở nên đặc biệt</Text>
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Bạn muốn làm gì?</Text>
                <View style={styles.dividerLine} />
            </View>

            {/* Buttons */}
            <View style={styles.buttonArea}>
                {/* Public: Xem & Đặt phòng */}
                <TouchableOpacity
                    style={styles.primaryButton}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('PublicRooms')}
                >
                    <Text style={styles.primaryIcon}>🛏️</Text>
                    <View style={styles.buttonTextBlock}>
                        <Text style={styles.primaryButtonTitle}>Xem & Đặt phòng</Text>
                        <Text style={styles.primaryButtonSub}>
                            Không cần đăng nhập — chỉ cần SĐT &amp; Email
                        </Text>
                    </View>
                    <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>

                {/* Staff: Đăng nhập */}
                <TouchableOpacity
                    style={styles.secondaryButton}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('StaffLogin')}
                >
                    <Text style={styles.secondaryIcon}>🔐</Text>
                    <View style={styles.buttonTextBlock}>
                        <Text style={styles.secondaryButtonTitle}>Đăng nhập nhân viên</Text>
                        <Text style={styles.secondaryButtonSub}>
                            Dành cho Admin &amp; Lễ tân
                        </Text>
                    </View>
                    <Text style={[styles.arrow, { color: '#4f46e5' }]}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>© 2025 Grand Palace Hotel Management System</Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a3e',
        justifyContent: 'space-between',
    },
    hero: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    hotelIcon: {
        fontSize: 72,
        marginBottom: 16,
    },
    hotelName: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 14,
        color: '#a5b4fc',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 28,
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#3b3b6e',
    },
    dividerText: {
        color: '#818cf8',
        fontSize: 13,
        marginHorizontal: 12,
        fontWeight: '500',
    },
    buttonArea: {
        paddingHorizontal: 24,
        gap: 14,
        marginBottom: 20,
    },
    primaryButton: {
        backgroundColor: '#4f46e5',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    primaryIcon: { fontSize: 32 },
    primaryButtonTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    primaryButtonSub: {
        fontSize: 12,
        color: '#c7d2fe',
        marginTop: 3,
    },
    secondaryButton: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 2,
        borderColor: '#e0e7ff',
    },
    secondaryIcon: { fontSize: 32 },
    secondaryButtonTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#1a1a3e',
    },
    secondaryButtonSub: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 3,
    },
    buttonTextBlock: {
        flex: 1,
    },
    arrow: {
        fontSize: 26,
        color: '#fff',
        fontWeight: 'bold',
    },
    footer: {
        textAlign: 'center',
        color: '#4b5563',
        fontSize: 11,
        paddingBottom: 16,
    },
});
