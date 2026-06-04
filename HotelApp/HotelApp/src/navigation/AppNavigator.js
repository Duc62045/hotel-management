import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Admin screens
import RoomListScreen from '../screens/admin/RoomListScreen';
import StatisticsScreen from '../screens/admin/StatisticsScreen';

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
            <Stack.Navigator initialRouteName="Login">
                {/* Màn hình chung */}
                <Stack.Screen
                    name="Login"
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

                {/* Màn hình Admin */}
                <Stack.Screen name="RoomList" component={RoomListScreen} options={{ title: 'Quản lý phòng' }} />
                <Stack.Screen name="Statistics" component={StatisticsScreen} options={{ title: 'Thống kê' }} />

                {/* Màn hình Lễ tân */}
                <Stack.Screen name="Customer" component={CustomerScreen} options={{ title: 'Quản lý khách hàng' }} />
                <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'Đặt phòng' }} />

                {/* Màn hình Khách hàng */}
                <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: 'Hồ sơ cá nhân' }} />
                <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'Đặt phòng & Lịch sử' }} />
                <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Thanh toán trực tuyến' }} />
                <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Tài khoản' }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}