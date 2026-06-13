import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, Alert, ActivityIndicator, Image,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import apiClient from '../../api/apiClient';

const AMENITY_OPTIONS = [
    'WiFi', 'TV', 'Minibar', 'Điều hòa', 'Bồn tắm',
    'Ban công', 'Két an toàn', 'Máy pha cà phê', 'Tủ lạnh', 'View biển',
];

export default function RoomEditScreen({ route, navigation }) {
    const { room } = route.params;

    const [imageUrl, setImageUrl] = useState(room.image_url || '');
    const [description, setDescription] = useState(room.description || '');
    const [selectedAmenities, setSelectedAmenities] = useState(room.amenities || []);
    const [typeName, setTypeName] = useState(room.type_name || '');
    const [pricePerNight, setPricePerNight] = useState(
        room.price_per_night ? String(room.price_per_night) : ''
    );
    const [typeDesc, setTypeDesc] = useState('');
    const [loading, setLoading] = useState(false);
    const [previewError, setPreviewError] = useState(false);

    const toggleAmenity = (item) => {
        setSelectedAmenities(prev =>
            prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item]
        );
    };

    const handleSave = async () => {
        if (!imageUrl.trim() && !description.trim()) {
            Alert.alert('Lưu ý', 'Bạn chưa nhập ảnh hoặc mô tả nào. Vẫn lưu?', [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Lưu', onPress: doSave },
            ]);
            return;
        }
        doSave();
    };

    const doSave = async () => {
        setLoading(true);
        try {
            const payload = {
                image_url: imageUrl.trim() || null,
                description: description.trim() || null,
                amenities: selectedAmenities,
                type_name: typeName.trim() || null,
                price_per_night: pricePerNight ? parseFloat(pricePerNight) : null,
                type_description: typeDesc.trim() || null,
            };
            await apiClient.put(`/admin/rooms/${room.id}`, payload);
            Alert.alert('✅ Thành công', `Đã cập nhật thông tin phòng ${room.room_number}!`, [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (err) {
            Alert.alert('Lỗi', err.response?.data?.detail || 'Không thể lưu. Thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backBtn}>← Quay lại</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>🛏️ Chỉnh sửa phòng {room.room_number}</Text>
                </View>

                {/* Image Preview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🖼️ Ảnh phòng</Text>
                    <Text style={styles.hint}>Dán URL ảnh từ internet (jpg, png...)</Text>
                    <TextInput
                        style={styles.input}
                        value={imageUrl}
                        onChangeText={(t) => { setImageUrl(t); setPreviewError(false); }}
                        placeholder="https://example.com/room.jpg"
                        autoCapitalize="none"
                        placeholderTextColor="#9ca3af"
                    />
                    {imageUrl ? (
                        <View style={styles.previewBox}>
                            {previewError ? (
                                <View style={styles.previewError}>
                                    <Text style={styles.previewErrorText}>❌ Không tải được ảnh</Text>
                                </View>
                            ) : (
                                <Image
                                    source={{ uri: imageUrl }}
                                    style={styles.previewImage}
                                    resizeMode="cover"
                                    onError={() => setPreviewError(true)}
                                />
                            )}
                        </View>
                    ) : (
                        <View style={styles.previewEmpty}>
                            <Text style={styles.previewEmptyText}>📷 Chưa có ảnh</Text>
                        </View>
                    )}
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📝 Mô tả phòng</Text>
                    <TextInput
                        style={[styles.input, styles.inputMulti]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Phòng rộng 35m², view hồ bơi, trang bị nội thất cao cấp..."
                        multiline
                        numberOfLines={4}
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Amenities */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>✨ Tiện nghi</Text>
                    <View style={styles.amenityGrid}>
                        {AMENITY_OPTIONS.map(item => {
                            const selected = selectedAmenities.includes(item);
                            return (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.amenityTag, selected && styles.amenityTagSelected]}
                                    onPress={() => toggleAmenity(item)}
                                >
                                    <Text style={[styles.amenityText, selected && styles.amenityTextSelected]}>
                                        {selected ? '✓ ' : ''}{item}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Room Type */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🏷️ Thông tin loại phòng</Text>
                    <Text style={styles.fieldLabel}>Tên loại phòng</Text>
                    <TextInput
                        style={styles.input}
                        value={typeName}
                        onChangeText={setTypeName}
                        placeholder={room.type_name || 'Standard / VIP / Suite'}
                        placeholderTextColor="#9ca3af"
                    />
                    <Text style={styles.fieldLabel}>Giá mỗi đêm (VNĐ)</Text>
                    <TextInput
                        style={styles.input}
                        value={pricePerNight}
                        onChangeText={setPricePerNight}
                        placeholder={room.price_per_night ? String(room.price_per_night) : '500000'}
                        keyboardType="numeric"
                        placeholderTextColor="#9ca3af"
                    />
                    <Text style={styles.fieldLabel}>Mô tả loại phòng</Text>
                    <TextInput
                        style={[styles.input, styles.inputMulti]}
                        value={typeDesc}
                        onChangeText={setTypeDesc}
                        placeholder="Mô tả chung cho loại phòng này..."
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Save Button */}
                <View style={styles.saveArea}>
                    <TouchableOpacity
                        style={[styles.saveBtn, loading && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>💾 Lưu thay đổi</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4ff' },
    header: {
        backgroundColor: '#1a1a3e',
        paddingTop: 48,
        paddingBottom: 16,
        paddingHorizontal: 16,
        gap: 8,
    },
    backBtn: { color: '#a5b4fc', fontSize: 14, fontWeight: '600' },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    section: {
        backgroundColor: '#fff',
        margin: 12,
        borderRadius: 16,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a3e',
        marginBottom: 12,
    },
    hint: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
    input: {
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#f9fafb',
    },
    inputMulti: { height: 96, textAlignVertical: 'top' },
    previewBox: {
        marginTop: 12,
        borderRadius: 12,
        overflow: 'hidden',
        height: 180,
    },
    previewImage: { width: '100%', height: '100%' },
    previewError: {
        height: 180,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    previewErrorText: { color: '#dc2626', fontWeight: '600' },
    previewEmpty: {
        marginTop: 12,
        height: 120,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
    },
    previewEmptyText: { color: '#9ca3af', fontSize: 14 },
    amenityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    amenityTag: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#d1d5db',
        backgroundColor: '#f9fafb',
    },
    amenityTagSelected: {
        backgroundColor: '#ede9fe',
        borderColor: '#7c3aed',
    },
    amenityText: { fontSize: 13, color: '#6b7280' },
    amenityTextSelected: { color: '#7c3aed', fontWeight: '700' },
    saveArea: { padding: 16, paddingBottom: 40 },
    saveBtn: {
        backgroundColor: '#4f46e5',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    saveBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
