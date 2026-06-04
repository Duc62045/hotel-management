import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    Platform,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import apiClient from '../../api/apiClient';

export default function PaymentScreen({ route, navigation }) {
    const { bookingId, amount } = route.params;
    const [loading, setLoading] = useState(true);

    const baseUrl = apiClient.defaults.baseURL || 'http://127.0.0.1:8000';
    const checkoutUrl = `${baseUrl}/mock-bank/checkout?booking_id=${bookingId}&amount=${amount}`;

    const handlePaymentResult = (data) => {
        if (!data || !data.status) return;

        const isSuccess = data.status === 'success';
        const msg = isSuccess 
            ? 'Thanh toán thành công! Đơn đặt phòng đã được xác nhận.' 
            : `Thanh toán thất bại: ${data.reason === 'insufficient_balance' ? 'Số dư tài khoản không đủ.' : data.reason === 'account_not_found' ? 'Tài khoản không tồn tại.' : data.reason === 'invalid_credentials' ? 'Sai mật khẩu Internet Banking.' : data.reason === 'invalid_otp' ? 'Mã OTP không đúng.' : 'Giao dịch thất bại.'}`;

        if (Platform.OS === 'web') {
            window.alert(msg);
            navigation.goBack();
        } else {
            Alert.alert(
                isSuccess ? 'Thành công' : 'Thất bại',
                msg,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }
    };

    // Web iframe postMessage listener
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleMessage = (event) => {
                try {
                    // event.data can be a stringified JSON from our mock-bank script
                    const data = JSON.parse(event.data);
                    if (data && data.status) {
                        handlePaymentResult(data);
                    }
                } catch (e) {
                    // Ignore non-JSON messages from other browser extensions
                }
            };
            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }
    }, [navigation]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>← Quay lại</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cổng thanh toán ảo</Text>
            </View>

            {Platform.OS === 'web' ? (
                <iframe
                    src={checkoutUrl}
                    style={styles.iframe}
                    onLoad={() => setLoading(false)}
                />
            ) : (
                <View style={{ flex: 1 }}>
                    <WebView
                        source={{ uri: checkoutUrl }}
                        onLoadStart={() => setLoading(true)}
                        onLoadEnd={() => setLoading(false)}
                        onMessage={(event) => {
                            try {
                                const data = JSON.parse(event.nativeEvent.data);
                                handlePaymentResult(data);
                            } catch (e) {
                                console.log('Error parsing native message:', e);
                            }
                        }}
                        style={{ flex: 1 }}
                    />
                </View>
            )}

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text style={styles.loadingText}>Đang tải cổng thanh toán...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f6f8',
    },
    header: {
        height: 56,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingHorizontal: 16,
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#f3f4f6',
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        marginRight: 72, // balance the backButton width roughly to center the title
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    iframe: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderWidth: 0,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '600',
    },
});
