import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// ========================
// Landing (Trang chào đón)
// ========================
import LandingScreen from '../screens/LandingScreen';

// ========================
// Luồng KHÁCH CÔNG KHAI (không cần login)
// ========================
import PublicRoomListScreen from '../screens/PublicRoomListScreen';
import PublicBookingScreen from '../screens/PublicBookingScreen';

// ========================
// Luồng NHÂN VIÊN (cần login)
// ========================
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Admin screens
import RoomListScreen from '../screens/admin/RoomListScreen';
import StatisticsScreen from '../screens/admin/StatisticsScreen';
import RoomEditScreen from '../screens/admin/RoomEditScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import ApprovalScreen from '../screens/admin/ApprovalScreen';

// Receptionist screens
import CustomerScreen from '../screens/receptionist/CustomerScreen';
import BookingScreen from '../screens/receptionist/BookingScreen';

// Guest screens
import MyProfileScreen from '../screens/guest/MyProfileScreen';
import MyBookingsScreen from '../screens/guest/MyBookingsScreen';
import PaymentScreen from '../screens/guest/PaymentScreen';

// Shared
import AccountScreen from '../screens/AccountScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Landing">

                {/* ======================== */}
                {/* TRANG CHÀO ĐÓN          */}
                {/* ======================== */}
                <Stack.Screen
                    name="Landing"
                    component={LandingScreen}
                    options={{ headerShown: false }}
                />

                {/* ======================== */}
                {/* LUỒNG KHÁCH CÔNG KHAI   */}
                {/* ======================== */}
                <Stack.Screen
                    name="PublicRooms"
                    component={PublicRoomListScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="PublicBooking"
                    component={PublicBookingScreen}
                    options={{ headerShown: false }}
                />

                {/* ======================== */}
                {/* LUỒNG NHÂN VIÊN         */}
                {/* ======================== */}
                <Stack.Screen
                    name="StaffLogin"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Register"
                    component={RegisterScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="ForgotPassword"
                    component={ForgotPasswordScreen}
                    options={{ title: 'Quên mật khẩu' }}
                />

                {/* Admin */}
                <Stack.Screen name="RoomList" component={RoomListScreen} options={{ title: 'Quản lý phòng' }} />
                <Stack.Screen name="Statistics" component={StatisticsScreen} options={{ title: 'Thống kê' }} />
                <Stack.Screen name="RoomEdit" component={RoomEditScreen} options={{ title: 'Chỉnh sửa phòng' }} />
                <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: 'Quản lý người dùng' }} />
                <Stack.Screen name="Approvals" component={ApprovalScreen} options={{ title: 'Duyệt yêu cầu' }} />

                {/* Lễ tân */}
                <Stack.Screen name="Customer" component={CustomerScreen} options={{ title: 'Quản lý khách hàng' }} />
                <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'Đặt phòng' }} />

                {/* Khách hàng (có tài khoản) */}
                <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: 'Hồ sơ cá nhân' }} />
                <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'Đặt phòng & Lịch sử' }} />
                <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Thanh toán trực tuyến' }} />
                <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Tài khoản' }} />

            </Stack.Navigator>
        </NavigationContainer>
    );
}