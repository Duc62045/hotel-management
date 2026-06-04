import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, FlatList
} from 'react-native';
import apiClient from '../api/apiClient';
import { validateBookingDates, dmyToYmd } from '../utils/date';

export default function AvailableRoomsList({ checkIn, checkOut, onCheckInChange, onCheckOutChange, selectedRoomId, onSelectRoom }) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        const validation = validateBookingDates(checkIn, checkOut);
        if (!validation.valid) {
            Alert.alert('Lỗi', validation.error);
            return;
        }
        setLoading(true);
        setSearched(true);
        try {
            const res = await apiClient.get('/rooms/available', {
                params: { 
                    check_in: dmyToYmd(checkIn), 
                    check_out: dmyToYmd(checkOut) 
                },
            });
            setRooms(res.data || []);
        } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.detail || 'Không thể tìm phòng trống');
            setRooms([]);
        } finally {
            setLoading(false);
        }
    };

    const renderRoom = ({ item }) => {
        const selected = selectedRoomId === String(item.id);
        return (
            <TouchableOpacity
                style={[styles.roomItem, selected && styles.roomItemSelected]}
                onPress={() => onSelectRoom(item)}
            >
                <View>
                    <Text style={styles.roomNumber}>Phòng {item.room_number}</Text>
                    <Text style={styles.roomMeta}>ID: {item.id} · Loại: {item.type_id}</Text>
                </View>
                {selected && <Text style={styles.selectedMark}>✓ Đã chọn</Text>}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Tìm phòng trống</Text>
            <TextInput
                style={styles.input}
                placeholder="Ngày nhận (DD/MM/YYYY)"
                value={checkIn}
                onChangeText={onCheckInChange}
            />
            <TextInput
                style={styles.input}
                placeholder="Ngày trả (DD/MM/YYYY)"
                value={checkOut}
                onChangeText={onCheckOutChange}
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.searchButtonText}>Tìm phòng trống</Text>
                )}
            </TouchableOpacity>

            {searched && !loading && (
                rooms.length > 0 ? (
                    <FlatList
                        data={rooms}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderRoom}
                        style={styles.list}
                        scrollEnabled={false}
                    />
                ) : (
                    <Text style={styles.emptyText}>Không có phòng trống trong khoảng thời gian này</Text>
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 8 },
    title: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    searchButton: {
        backgroundColor: '#6366f1',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    searchButtonText: { color: '#fff', fontWeight: '600' },
    list: { maxHeight: 200 },
    roomItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    roomItemSelected: {
        borderColor: '#4f46e5',
        backgroundColor: '#eef2ff',
    },
    roomNumber: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
    roomMeta: { fontSize: 12, color: '#666', marginTop: 2 },
    selectedMark: { color: '#4f46e5', fontWeight: '600', fontSize: 12 },
    emptyText: { textAlign: 'center', color: '#888', fontSize: 13, paddingVertical: 8 },
});
